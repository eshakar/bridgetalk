import type { Metadata } from "next";
import { GenerateButton } from "@/components/intelligence/AnalysisControls";
import { ActionItemsList } from "@/components/intelligence/ActionItemsList";
import { PageHeading } from "@/components/layout/PageHeading";

export const metadata: Metadata = { title: "Action items · BridgeTalk" };

export default function ActionItemsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeading
        title="Action items"
        description="Owners and deadlines appear only when the transcript states them explicitly."
        actions={<GenerateButton />}
      />
      <ActionItemsList withFilters />
    </div>
  );
}
