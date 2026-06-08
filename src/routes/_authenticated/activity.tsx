import { createFileRoute } from "@tanstack/react-router";
import { Soon } from "./brands";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({ meta: [{ title: "Activity Log — WA Notifier" }] }),
  component: () => <Soon title="Activity Log" description="Audit trail of user actions across the workspace." />,
});
