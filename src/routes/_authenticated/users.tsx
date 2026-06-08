import { createFileRoute } from "@tanstack/react-router";
import { Soon } from "./brands";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users — WA Notifier" }] }),
  component: () => <Soon title="Users" description="Invite users and scope them to brands as brand admin or sender." />,
});
