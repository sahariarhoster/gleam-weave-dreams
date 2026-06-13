import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Megaphone, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { previewBrandAdminRecipients, sendBrandAdminNotice } from "@/lib/notices.functions";

export const Route = createFileRoute("/_authenticated/notices")({
  head: () => ({ meta: [{ title: "Notices — WA Suite" }] }),
  component: NoticesPage,
});

function NoticesPage() {
  const fnSend = useServerFn(sendBrandAdminNotice);
  const recipients = useQuery({
    queryKey: ["notice-recipients"],
    queryFn: () => previewBrandAdminRecipients(),
  });
  const [message, setMessage] = useState("");

  const sendMut = useMutation({
    mutationFn: () => fnSend({ data: { message } }),
    onSuccess: (r) => {
      toast.success(`Sent ${r.sent} · failed ${r.failed} · skipped ${r.skipped} (no phone)`);
      setMessage("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const list = recipients.data?.recipients ?? [];
  const withPhone = list.filter((r: any) => r.phone && r.phone.replace(/\D+/g, "").length >= 8);
  const noPhone = list.length - withPhone.length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Megaphone}
        title="Send Notice to Brand Owners & Admins"
        description="Broadcast a WhatsApp message to every brand owner and brand admin on the platform using your configured notify device."
      />
      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{withPhone.length} will receive</Badge>
            {noPhone > 0 && (
              <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300">
                <AlertCircle className="h-3 w-3" /> {noPhone} skipped (no phone on profile)
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Recipients = users who are brand owners (workspace role or brand creator) or brand admins.
            </span>
          </div>

          <Textarea
            rows={6}
            placeholder="Type your notice…  e.g.  Scheduled maintenance tonight 12–1 AM."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={4000}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{message.length} / 4000</span>
            <span>Sends with a 10–23s delay between messages to protect the device.</span>
          </div>

          <Button
            onClick={() => sendMut.mutate()}
            disabled={!message.trim() || sendMut.isPending || withPhone.length === 0}
            className="gap-2"
          >
            {sendMut.isPending ? <>Sending…</> : <><Send className="h-4 w-4" /> Send to {withPhone.length} recipients</>}
          </Button>

          {sendMut.data && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Sent {sendMut.data.sent} · failed {sendMut.data.failed} · skipped {sendMut.data.skipped} of {sendMut.data.total}
            </div>
          )}

          <div className="pt-2">
            <h3 className="mb-2 text-sm font-medium">Preview recipients</h3>
            <div className="max-h-80 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.isLoading && (
                    <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                  )}
                  {!recipients.isLoading && list.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">No brand owners/admins found.</TableCell></TableRow>
                  )}
                  {list.map((r: any) => (
                    <TableRow key={r.id} className={!r.phone ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                      <TableCell className="text-sm">{r.email || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.phone || <span className="text-amber-600">no phone</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
