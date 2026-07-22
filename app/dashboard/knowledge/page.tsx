"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomerStore } from "@/lib/stores/customerStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/beyondforms/StatusBadge";
import { RippleButton } from "@/components/ui/ripple-button";
import {
  Upload, Link2, Trash2, RefreshCw, CheckCircle, Loader2, ShieldCheck,
  Database, FileText, FileJson, Table2, Globe, FileSpreadsheet,
  Sparkles, Send, Mic,
} from "lucide-react";

// ── Pipeline stages (mirrors the n8n workflow) ─────────────────────────────
const PIPELINE_STAGES = [
  { key: "uploading",  label: "Upload",  desc: "File received by server" },
  { key: "parsing",   label: "Parse",   desc: "Extract rows/text from format" },
  { key: "chunking",  label: "Chunk",   desc: "Split into ~500-token segments" },
  { key: "embedding", label: "Embed",   desc: "Ollama nomic-embed-text → float[]" },
  { key: "indexed",   label: "Index",   desc: "Upsert vectors into Pinecone" },
] as const;

function stageIndex(status: string): number {
  return PIPELINE_STAGES.findIndex((s) => s.key === status);
}

// ── Supported file formats ─────────────────────────────────────────────────
const FORMAT_INFO = [
  { ext: "SQL",  icon: Database,       desc: "Exported .sql dump (mysqldump / pg_dump) — not a live DB connection; rows parsed per table", accept: ".sql" },
  { ext: "CSV",  icon: Table2,         desc: "Comma-separated — each row becomes a chunk",      accept: ".csv" },
  { ext: "JSON", icon: FileJson,       desc: "Flat or nested JSON — keys flattened to text",    accept: ".json" },
  { ext: "PDF",  icon: FileText,       desc: "Chunked by paragraph / page boundary",           accept: ".pdf" },
  { ext: "DOCX", icon: FileSpreadsheet,desc: "Word documents — chunked by heading structure",   accept: ".docx,.doc" },
  { ext: "URL",  icon: Globe,          desc: "Web page scraped and chunked automatically",      accept: null },
];

const FILE_TYPE_LABEL: Record<string, string> = {
  mysql_dump: "SQL", csv: "CSV", json: "JSON", pdf: "PDF", docx: "DOCX", url: "URL",
};

type Tab = "upload" | "indexed" | "test";

export default function KnowledgePage() {
  const { knowledgeBase, uploadQueue, uploadFile, uploadURL, deleteKBItem, retryKBItem, loadKBList } =
    useCustomerStore();
  // Load the indexed-document registry on mount — covers the already-logged-in
  // case where no auth-change event fires to trigger the store's org-switch load.
  useEffect(() => {
    loadKBList();
  }, [loadKBList]);
  const [tab, setTab] = useState<Tab>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState("all");
  const [verify, setVerify] = useState<Record<string, { loading: boolean; text: string }>>({});

  const verifyFile = async (id: string) => {
    setVerify((v) => ({ ...v, [id]: { loading: true, text: "" } }));
    try {
      const res = await fetch("/api/kb/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: id }),
      });
      const data = await res.json();
      const text = res.ok
        ? data.count > 0
          ? `✓ ${data.count} vectors live in Pinecone`
          : "No vectors found — not indexed"
        : data.error ?? "Verify failed";
      setVerify((v) => ({ ...v, [id]: { loading: false, text } }));
    } catch {
      setVerify((v) => ({ ...v, [id]: { loading: false, text: "Verify failed" } }));
    }
  };

  // ── Test AI sandbox state ──────────────────────────────────────────────────
  const [testQuestion, setTestQuestion] = useState("");
  const [testAnswer, setTestAnswer] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const orgId = useAuthStore((s) => s.user?.customerId) ?? "unknown_org";

  const runTestQuery = async (question: string) => {
    if (!question.trim()) return;
    setTestLoading(true);
    setTestError(null);
    setTestAnswer(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Query failed");
      setTestAnswer(data.answer ?? "No answer returned.");
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setTestLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTestError("Speech recognition isn't supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setTestQuestion(transcript);
      runTestQuery(transcript);
    };
    recognition.start();
  };

  const active = knowledgeBase.filter((k) => uploadQueue.includes(k.id));
  const indexed = knowledgeBase.filter((k) => !uploadQueue.includes(k.id));
  const filtered = filter === "all" ? indexed : indexed.filter((k) => k.fileType === filter);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => uploadFile(f));
    setTab("upload");
  };

  const handleURL = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    await uploadURL(urlInput.trim());
    setUrlInput("");
    setUrlLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
          Knowledge Base
        </h1>
        <p className="text-sm mt-0.5 text-muted-foreground">
          Upload any database or document — auto-vectorized and indexed via the n8n pipeline
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1 w-fit border border-white/10 bg-white/5">
        {(["upload", "indexed", "test"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? "bg-cyan-400 text-black" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t === "indexed" ? `Indexed (${indexed.length})` : t === "test" ? "Test AI" : "Upload"}
          </button>
        ))}
      </div>

      {/* ── Upload Tab ──────────────────────────────────────────────────── */}
      {tab === "upload" && (
        <div className="space-y-6">

          {/* Format chips — shows all supported types */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FORMAT_INFO.map(({ ext, icon: Icon, desc }) => (
              <div key={ext}
                className="glass-panel rounded-xl p-3.5 flex items-start gap-3 cursor-pointer hover:border-cyan-400/40 transition-colors"
                onClick={() => ext !== "URL" && fileRef.current?.click()}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-cyan-400/10">
                  <Icon className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{ext}</p>
                  <p className="text-[11px] leading-snug mt-0.5 text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-12 cursor-pointer transition-colors ${
              dragOver ? "border-cyan-400 bg-cyan-400/5" : "border-white/15 bg-white/[0.02]"
            }`}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-cyan-400/10">
              <Upload className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-semibold text-foreground">Drop files here or click to browse</p>
              <p className="text-xs mt-1 text-muted-foreground">
                .sql · .csv · .json · .pdf · .docx — any format is processed automatically
              </p>
            </div>
            <input ref={fileRef} type="file" multiple
              accept=".sql,.csv,.json,.pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {/* n8n pipeline explainer */}
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 bg-white/5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                n8n Processing Pipeline
              </p>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-0 overflow-x-auto pb-2">
                {PIPELINE_STAGES.map((stage, i) => (
                  <div key={stage.key} className="flex items-start">
                    <div className="flex flex-col items-center w-24 sm:w-28 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black mb-2 bg-cyan-400">
                        {i + 1}
                      </div>
                      <p className="text-xs font-semibold text-center text-foreground">{stage.label}</p>
                      <p className="text-[10px] text-center leading-snug mt-1 text-muted-foreground">{stage.desc}</p>
                    </div>
                    {i < PIPELINE_STAGES.length - 1 && (
                      <div className="w-6 sm:w-8 h-px mt-4 flex-shrink-0 bg-white/15" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4 pt-4 border-t border-white/10 text-muted-foreground">
                SQL/CSV/JSON → rows parsed per table/column · PDF/DOCX → chunked by paragraph ·
                All content embedded via <strong>Ollama nomic-embed-text</strong> → vectors upserted to <strong>Pinecone</strong>
              </p>
            </div>
          </div>

          {/* URL input */}
          <div className="glass-panel rounded-xl p-5">
            <p className="text-sm font-semibold mb-3 text-foreground">Add URL</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/faq"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-cyan-400/50 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleURL()} />
              </div>
              <RippleButton
                variant="primary"
                className="px-5 py-2.5"
                onClick={handleURL}
                disabled={!urlInput.trim() || urlLoading}
              >
                {urlLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Add URL
              </RippleButton>
            </div>
          </div>

          {/* Active pipeline cards */}
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Processing ({active.length} file{active.length > 1 ? "s" : ""})
              </p>
              {active.map((item) => {
                const stageIdx = stageIndex(item.status);
                return (
                  <div key={item.id} className="glass-panel rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-muted-foreground flex-shrink-0">
                          {FILE_TYPE_LABEL[item.fileType] ?? item.fileType.toUpperCase()}
                        </span>
                        <p className="text-sm font-medium text-foreground truncate">{item.fileName}</p>
                      </div>
                      <span className="text-sm font-bold text-cyan-400 flex-shrink-0">{Math.round(item.progress)}%</span>
                    </div>

                    {/* Stage indicators */}
                    <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                      {PIPELINE_STAGES.map((stage, i) => {
                        const done = i < stageIdx;
                        const current = i === stageIdx;
                        return (
                          <div key={stage.key} className="flex items-center gap-1 flex-shrink-0">
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                done ? "bg-cyan-400" : current ? "bg-cyan-400/15" : "bg-white/5"
                              }`}>
                                {done ? (
                                  <CheckCircle className="w-4 h-4 text-black" />
                                ) : current ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-white/20" />
                                )}
                              </div>
                              <span className={`text-[10px] mt-1 font-medium ${
                                done || current ? "text-cyan-400" : "text-muted-foreground"
                              }`}>
                                {stage.label}
                              </span>
                            </div>
                            {i < PIPELINE_STAGES.length - 1 && (
                              <div className={`w-6 h-px mb-4 ${done ? "bg-cyan-400" : "bg-white/10"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full overflow-hidden bg-white/10">
                      <div className="h-full rounded-full transition-all duration-300 bg-cyan-400"
                        style={{ width: `${item.progress}%` }} />
                    </div>
                    <p className="text-xs mt-2 text-muted-foreground">
                      ~{Math.round(item.progress * 2.4)} chunks → ~{Math.round(item.progress * 2.4)} vectors
                      · {PIPELINE_STAGES[stageIdx]?.desc ?? "Completing…"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Indexed Tab ─────────────────────────────────────────────────── */}
      {tab === "indexed" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg outline-none border border-white/10 bg-white/5 text-foreground focus:border-cyan-400/50 [&>option]:bg-neural w-fit">
              <option value="all">All formats</option>
              {["pdf", "csv", "json", "mysql_dump", "docx", "url"].map((t) => (
                <option key={t} value={t}>{FILE_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {filtered.length} file{filtered.length !== 1 ? "s" : ""} · all vectorized and queryable
            </p>
          </div>

          <div className="glass-panel rounded-xl overflow-hidden">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="bg-white/5 border-white/10">
                  {["File", "Format", "Uploaded", "Chunks", "Vectors", "Status", ""].map((h) => (
                    <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                      No indexed files yet. Upload a file to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence initial={false}>
                  {filtered.map((item) => (
                  <motion.tr
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium text-xs text-foreground">{item.fileName}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-white/10 text-muted-foreground">
                        {FILE_TYPE_LABEL[item.fileType]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {item.chunkCount ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-cyan-400">
                      {item.vectorCount ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status as any} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.status === "indexed" && (
                          verify[item.id]?.text ? (
                            <span className="text-[11px] text-emerald-400">{verify[item.id].text}</span>
                          ) : (
                            <button onClick={() => verifyFile(item.id)} disabled={verify[item.id]?.loading}
                              className="flex items-center gap-1 text-xs font-medium hover:opacity-70 text-cyan-400 disabled:opacity-50">
                              {verify[item.id]?.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                              Verify
                            </button>
                          )
                        )}
                        {item.status === "failed" && (
                          <button onClick={() => retryKBItem(item.id)}
                            className="flex items-center gap-1 text-xs font-medium hover:opacity-70 text-cyan-400">
                            <RefreshCw className="w-3.5 h-3.5" /> Retry
                          </button>
                        )}
                        <button onClick={() => deleteKBItem(item.id)}
                          className="text-xs text-red-400 hover:opacity-70 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </motion.tr>
                  ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Test AI Tab ─────────────────────────────────────────────────── */}
      {tab === "test" && (
        <div className="space-y-4 max-w-2xl">
          <div className="glass-panel rounded-xl p-5">
            <p className="text-sm font-semibold mb-1 text-foreground">
              Try a question before going live
            </p>
            <p className="text-xs mb-4 text-muted-foreground">
              Sends directly to the same RAG endpoint your phone number uses — no calls, no cost.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runTestQuery(testQuestion)}
                placeholder="e.g. What are the OPD timings for cardiology?"
                className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-cyan-400/50 transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={startListening}
                  disabled={listening}
                  title="Ask by voice"
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 flex-shrink-0 disabled:opacity-50 transition-colors ${
                    listening ? "text-cyan-400 border-cyan-400/50" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mic className={`w-4 h-4 ${listening ? "animate-pulse" : ""}`} />
                </button>
                <RippleButton
                  variant="primary"
                  className="px-4 py-2.5 flex-shrink-0"
                  onClick={() => runTestQuery(testQuestion)}
                  disabled={!testQuestion.trim() || testLoading}
                >
                  {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </RippleButton>
              </div>
            </div>
          </div>

          {(testAnswer || testError || testLoading) && (
            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  AI Response
                </p>
              </div>
              {testLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : testError ? (
                <p className="text-sm text-red-400">{testError}</p>
              ) : (
                <p className="text-sm leading-relaxed text-foreground/90">{testAnswer}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
