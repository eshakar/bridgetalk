"use client";

import { Cpu, Sparkles, WifiOff } from "lucide-react";
import { useMeeting } from "@/components/providers/MeetingProvider";
import ClickSpark from "@/components/reactbits/ClickSpark";
import { Badge, Button } from "@/components/ui/primitives";

/** Shows which engine produced the current analysis. */
export function AnalysisOriginBadge() {
  const { analysis, analysisOrigin } = useMeeting();
  if (!analysis || !analysisOrigin) return null;
  if (analysisOrigin === "local")
    return (
      <Badge tone="amber" icon={WifiOff}>
        Offline rules
      </Badge>
    );
  return analysis.mode === "gemini" ? (
    <Badge tone="violet" icon={Sparkles}>
      Gemini
    </Badge>
  ) : (
    <Badge tone="blue" icon={Cpu}>
      Rules engine
    </Badge>
  );
}

export function GenerateButton({ size = "md" }: { size?: "sm" | "md" }) {
  const { analysis, analysisStatus, runAnalysis } = useMeeting();
  const loading = analysisStatus === "loading";
  return (
    <ClickSpark sparkColor={["#22d3ee", "#8b5cf6", "#e879f9"]} sparkCount={10} sparkRadius={26} shape="star" glow={0.6} className="inline-block">
      <Button
        variant={analysis ? "secondary" : "primary"}
        size={size}
        icon={Sparkles}
        onClick={runAnalysis}
        disabled={loading}
        aria-busy={loading}
        className={loading ? "[&>svg]:animate-spin" : undefined}
      >
        {loading ? "Gemini is thinking…" : analysis ? "Regenerate" : "Generate intelligence"}
      </Button>
    </ClickSpark>
  );
}
