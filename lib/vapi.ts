// VAPI Web SDK singleton
// Docs: https://docs.vapi.ai/sdk/web
import Vapi from "@vapi-ai/web";

let vapiInstance: Vapi | null = null;

export function getVapi(): Vapi {
  if (!vapiInstance) {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set in environment variables");
    }
    vapiInstance = new Vapi(publicKey);
  }
  return vapiInstance;
}

export const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "";

export type CallState =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "ended"
  | "error";
