import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/PageHeading";
import { MeetingsList } from "@/components/meeting/MeetingsList";

export const metadata: Metadata = { title: "Meetings · BridgeTalk" };

export default function MeetingsPage() {
  return (
    <div>
      <PageHeading title="Meetings" description="Every meeting saved in MongoDB. Open one to see its transcript, insights and Q&A." />
      <MeetingsList />
    </div>
  );
}
