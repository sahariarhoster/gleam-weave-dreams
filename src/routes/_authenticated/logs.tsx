import { createFileRoute } from "@tanstack/react-router";
import { Soon } from "./brands";

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({ meta: [{ title: "Message Logs — WA Notifier" }] }),
  component: () => <Soon title="Message Logs" description="Per-message delivery status with filters by brand, device, and date." />,
});
