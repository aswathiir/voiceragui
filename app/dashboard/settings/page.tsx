"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Eye, EyeOff, CheckCircle, Server, Mic, Database } from "lucide-react";
import { Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

interface Field {
  key: string;
  label: string;
  placeholder: string;
  hint: string;
  sensitive?: boolean;
}

const CONFIG: { section: string; icon: any; fields: Field[] }[] = [
  {
    section: "VAPI",
    icon: Mic,
    fields: [
      {
        key: "NEXT_PUBLIC_VAPI_PUBLIC_KEY",
        label: "Public Key",
        placeholder: "vapi_pub_...",
        hint: "From VAPI dashboard → Account",
        sensitive: true,
      },
      {
        key: "NEXT_PUBLIC_VAPI_ASSISTANT_ID",
        label: "Assistant ID",
        placeholder: "asst_...",
        hint: "From VAPI → Assistants",
      },
    ],
  },
  {
    section: "n8n Webhook",
    icon: Server,
    fields: [
      {
        key: "NEXT_PUBLIC_N8N_WEBHOOK_URL",
        label: "Webhook URL",
        placeholder: "https://xxxx.ngrok-free.app/webhook/voice-rag-query",
        hint: "ngrok URL → n8n production webhook",
      },
    ],
  },
  {
    section: "Pinecone",
    icon: Database,
    fields: [
      {
        key: "PINECONE_API_KEY",
        label: "API Key",
        placeholder: "pcsk_...",
        hint: "Only needed server-side",
        sensitive: true,
      },
      {
        key: "PINECONE_INDEX",
        label: "Index Name",
        placeholder: "vad",
        hint: "Must match n8n workflow index",
      },
    ],
  },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In production this would write to .env.local
    // For demo we just show success state
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure API keys and webhook connections
          </p>
        </div>

        {/* Status banner */}
        <div className="glass-panel rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-amber-400/80 font-mono leading-relaxed">
            ⚠️ In production, set these as environment variables in your .env.local file. Changes
            here are for demonstration only and will reset on refresh.
          </p>
        </div>

        {CONFIG.map(({ section, icon: Icon, fields }) => (
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className="font-display font-semibold text-sm text-foreground">{section}</span>
            </div>

            <div className="p-5 space-y-4">
              {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {field.label}
                  </label>
                  <div className="relative">
                    <Input
                      type={field.sensitive && !visible[field.key] ? "password" : "text"}
                      placeholder={field.placeholder}
                      value={values[field.key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                      className="bg-white/5 border-white/10 focus:border-indigo-500/40 text-sm font-mono pr-10"
                    />
                    {field.sensitive && (
                      <button
                        type="button"
                        onClick={() => setVisible((v) => ({ ...v, [field.key]: !v[field.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {visible[field.key] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground/60">{field.hint}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        <Button
          onClick={handleSave}
          className={`w-full h-11 font-medium transition-all ${
            saved
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          {saved ? (
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Saved!
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Configuration
            </span>
          )}
        </Button>

        {/* .env.local template */}
        <div className="glass-panel rounded-xl p-5">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
            .env.local template
          </p>
          <pre className="text-xs font-mono text-indigo-300/80 leading-relaxed overflow-x-auto">
            {`NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://xxxx.ngrok-free.app/webhook/voice-rag-query
PINECONE_API_KEY=pcsk_xxx
PINECONE_INDEX=vad`}
          </pre>
        </div>
      </div>
    </div>
  );
}
