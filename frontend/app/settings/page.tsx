import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/PageHeading";
import { SettingsPanels } from "@/components/settings/SettingsPanels";

export const metadata: Metadata = { title: "Settings · BridgeTalk" };

export default function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeading title="Settings" description="Connection status and display preferences for this session." />
      <SettingsPanels />
    </div>
  );
}
