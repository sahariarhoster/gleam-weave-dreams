import { createFileRoute } from "@tanstack/react-router";
import { Soon } from "@/components/layout/soon";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — WA Notifier" }] }),
  component: () => <Soon title="All Campaigns" description="Create bulk campaigns with templates, spintax, safe mode and anti-ban scheduling." />,
});
