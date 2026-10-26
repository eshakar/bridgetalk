import { MeetingQA } from "@/components/assistant/MeetingQA";
import { ActionItemsList } from "@/components/intelligence/ActionItemsList";
import { DecisionsList } from "@/components/intelligence/DecisionsList";
import { SummaryCard } from "@/components/intelligence/SummaryCard";
import { MeetingOverview } from "@/components/meeting/MeetingOverview";
import { TranscriptPanel } from "@/components/meeting/TranscriptPanel";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <MeetingOverview />
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <TranscriptPanel />
          <MeetingQA />
        </div>
        <div className="space-y-6 xl:col-span-5">
          <SummaryCard />
          <DecisionsList />
          <ActionItemsList />
        </div>
      </div>
    </div>
  );
}
