import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/PageHeading";
import { NewMeetingForm } from "@/components/meeting/NewMeetingForm";

export const metadata: Metadata = { title: "New meeting · BridgeTalk" };

export default function NewMeetingPage() {
  return (
    <div>
      <PageHeading
        title="New meeting"
        description="Add who was there and what they said. BridgeTalk saves it to MongoDB, translates it with Gemini, then you can generate insights and ask questions."
      />
      <NewMeetingForm />
    </div>
  );
}
