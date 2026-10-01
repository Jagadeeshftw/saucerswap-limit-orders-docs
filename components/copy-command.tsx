"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border bg-fd-muted">
      <code className="min-w-0 flex-1 overflow-x-auto px-4 py-3 font-mono text-[0.8rem] leading-relaxed whitespace-nowrap text-fd-foreground">
        {command.split(" -- ").map((part, i) => (
          <span key={i}>
            {i > 0 && <span className="text-fd-primary"> -- </span>}
            {part}
          </span>
        ))}
      </code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(command);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="flex shrink-0 items-center gap-1.5 border-l px-3.5 text-xs font-semibold text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground"
        aria-label={copied ? "Copied" : "Copy command"}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}
