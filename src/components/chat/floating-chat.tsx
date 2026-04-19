"use client";

import { FormEvent, useState } from "react";
import { chatAssist } from "@/lib/api";
import { useRouteStore } from "@/store/route-store";

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const setSourceText = useRouteStore((state) => state.setSourceText);
  const setDestinationText = useRouteStore((state) => state.setDestinationText);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      const result = await chatAssist(input.trim());
      if (result.source) setSourceText(result.source);
      if (result.destination) setDestinationText(result.destination);
      setReply(result.response ?? "Updated your route fields.");
      setInput("");
    } catch (error) {
      setReply(error instanceof Error ? error.message : "Failed to reach chat assistant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <div className="mb-3 w-80 rounded-3xl border border-white/15 bg-slate-900/90 p-4 shadow-glass backdrop-blur-xl">
          <p className="text-sm font-medium text-white">Route Assistant</p>
          <form className="mt-3 space-y-2" onSubmit={onSubmit}>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Try: get me from HSR to Indiranagar"
            />
            <button
              disabled={loading}
              className="w-full rounded-xl bg-routeTeal/90 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-70"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </form>
          {reply && <p className="mt-2 text-xs text-white/75">{reply}</p>}
        </div>
      )}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="h-14 w-14 rounded-full bg-routeTeal/90 text-lg font-bold text-slate-950 shadow-glass"
        aria-label="Open chat assistant"
      >
        AI
      </button>
    </div>
  );
}
