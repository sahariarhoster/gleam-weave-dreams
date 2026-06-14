import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Megaphone, Send, AlertCircle, CheckCircle2, History } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { previewBrandAdminRecipients, sendBrandAdminNotice } from "@/lib/notices.functions";

export const Route = createFileRoute("/_authenticated/notices")({
  head: () => ({ meta: [{ title: "Notices — WA Suite" }] }),
  component: NoticesPage,
});

function NoticesPage() {
  const fnSend = useServerFn(sendBrandAdminNotice);
  const qc = useQueryClient();
  const recipients = useQuery({
    queryKey: ["notice-recipients"],
    queryFn: () => previewBrandAdminRecipients(),
  });
  const [message, setMessage] = useState("");
  const [includeAlreadySent, setIncludeAlreadySent] = useState(false);

  const sendMut = useMutation({
    mutationFn: () => fnSend({ data: { message, include_already_sent: includeAlreadySent } }),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success(`Campaign created · ${r.queued} queued · ${r.skipped_already_sent} already-sent skipped`);
        setMessage("");
        qc.invalidateQueries({ queryKey: ["notice-recipients"] });
      } else {
        toast.warning("No new recipients to notify.");
      }
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const list = recipients.data?.recipients ?? [];
  const withPhone = list.filter((r: any) => r.normalized_phone);
  const alreadySent = withPhone.filter((r: any) => r.already_sent);
  const fresh = withPhone.filter((r: any) => !r.already_sent);
  const noPhone = list.length - withPhone.length;
  const targetCount = includeAlreadySent ? withPhone.length : fresh.length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Megaphone}
        title="Send Notice to Brand Owners & Admins"
        description="Creates a tracked campaign that delivers a WhatsApp message to every brand owner and brand admin. Already-notified numbers (last 24h) are detected and skipped by default."
      />
      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{targetCount} will be queued</Badge>
            {alreadySent.length > 0 && (
              <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> {alreadySent.length} already notified (24h)
              </Badge>
            )}
            {noPhone > 0 && (
              <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300">
                <AlertCircle className="h-3 w-3" /> {noPhone} skipped (no phone)
              </Badge>
            )}
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
            <span>Runs as a campaign — track progress on the Campaigns page.</span>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="include-already"
              checked={includeAlreadySent}
              onCheckedChange={(v) => setIncludeAlreadySent(v === true)}
            />
            <Label htmlFor="include-already" className="text-sm font-normal cursor-pointer">
              Also include recipients already notified in the last 24h
            </Label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => sendMut.mutate()}
              disabled={!message.trim() || sendMut.isPending || targetCount === 0}
              className="gap-2"
            >
              {sendMut.isPending ? <>Creating campaign…</> : <><Send className="h-4 w-4" /> Queue notice for {targetCount}</>}
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/campaigns"><History className="h-4 w-4" /> View campaigns</Link>
            </Button>
          </div>

          {sendMut.data?.ok && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Campaign created · {sendMut.data.queued} queued · {sendMut.data.skipped_already_sent} already-sent skipped · {sendMut.data.skipped_no_phone} no phone.
              {sendMut.data.campaign_id && (
                <Link to="/campaigns" className="ml-2 underline">Open campaigns</Link>
              )}
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
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.isLoading && (
                    <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                  )}
                  {!recipients.isLoading && list.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">No brand owners/admins found.</TableCell></TableRow>
                  )}
                  {list.map((r: any) => (
                    <TableRow key={r.id} className={!r.normalized_phone ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                      <TableCell className="text-sm">{r.email || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.phone || <span className="text-amber-600">no phone</span>}</TableCell>
                      <TableCell className="text-xs">
                        {!r.normalized_phone ? <span className="text-amber-600">skipped</span>
                          : r.already_sent ? <span className="text-emerald-700">notified · 24h</span>
                          : <span className="text-muted-foreground">pending</span>}
                      </TableCell>
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
