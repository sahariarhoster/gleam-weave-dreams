import { createFileRoute } from "@tanstack/react-router";
import { Soon } from "./brands";

export const Route = createFileRoute("/_authenticated/blocked")({
  head: () => ({ meta: [{ title: "Blocked Numbers — WA Notifier" }] }),
  component: () => <Soon title="Blocked Numbers" description="Manage per-brand block lists. Blocked numbers are skipped from campaigns." />,
});
