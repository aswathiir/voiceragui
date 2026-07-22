import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// book_appointment tool endpoint (called by the Vapi assistant during a call)
// and a GET for the dashboard to list requests. Appointments are stored in a
// file so the org can see booking requests the AI captured on calls.
const DB_PATH = path.join(process.cwd(), ".data", "appointments.json");

interface Appointment {
  id: string;
  orgId: string;
  name: string;
  datetime: string;
  reason: string;
  createdAt: string;
}

function load(): Appointment[] {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}
function save(list: Appointment[]) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2));
}

// Vapi tool-call POST — args arrive under message.toolCallList[0].function.arguments
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tc = body?.message?.toolCallList?.[0];
  const args = tc?.function?.arguments ?? tc?.arguments ?? body;
  const parsed = typeof args === "string" ? JSON.parse(args) : args;

  // Resolve orgId from the live call context first (browser/phone calls carry
  // it in metadata), then the tool URL param, so a booking always lands in the
  // org the caller actually belongs to — the URL param is only a shared-line
  // fallback and would otherwise pin every booking to one org.
  const call = body?.message?.call ?? body?.call;
  const orgId =
    call?.metadata?.orgId ||
    call?.assistantOverrides?.metadata?.orgId ||
    req.nextUrl.searchParams.get("orgId") ||
    "unknown";

  // Guard against the LLM booking with unfilled placeholder values.
  const name = String(parsed.name ?? "").trim();
  const datetime = String(parsed.datetime ?? "").trim();
  const looksPlaceholder =
    !name || !datetime ||
    /caller|preferred date|your name|unspecified|unknown/i.test(name + " " + datetime);
  if (looksPlaceholder) {
    const ask = "I still need the patient's name and a specific date and time before I can book. Could you share those?";
    return NextResponse.json({ results: [{ toolCallId: tc?.id, result: ask }], result: ask }, { status: 200 });
  }

  const appt: Appointment = {
    id: `appt_${Date.now()}`,
    orgId,
    name,
    datetime,
    reason: String(parsed.reason ?? "").trim(),
    createdAt: new Date().toISOString(),
  };
  save([...load(), appt]);

  const result = `Appointment booked for ${appt.name} on ${appt.datetime}${appt.reason ? ` for ${appt.reason}` : ""}. A confirmation will follow from the front desk.`;
  return NextResponse.json({ results: [{ toolCallId: tc?.id, result }], result });
}

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  const all = load();
  return NextResponse.json({ appointments: orgId ? all.filter((a) => a.orgId === orgId) : all });
}
