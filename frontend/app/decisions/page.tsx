import type { Metadata } from "next";
import { GenerateButton } from "@/components/intelligence/AnalysisControls";
import { DecisionsList } from "@/components/intelligence/DecisionsList";
import { OpenQuestionsPanel } from "@/components/intelligence/OpenQuestionsPanel";
import { PageHeading } from "@/components/layout/PageHeading";

export const metadata: Metadata = { title: "Decisions · BridgeTalk" };

export default function DecisionsPage() {
  return (
    <div>
      <PageHeading
        title="Decisions"
        description="What the team explicitly agreed on, quoted from the original language."
        actions={<GenerateButton />}
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <DecisionsList detailed />
        </div>
        <div className="lg:col-span-5">
          <OpenQuestionsPanel />
        </div>
      </div>
    </div>
  );
}
