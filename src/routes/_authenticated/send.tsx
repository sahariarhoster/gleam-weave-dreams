import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listDevices, sendSingleMessage } from "@/lib/devices.functions";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/send")({
  head: () => ({ meta: [{ title: "Send SMS — WA Suite" }] }),
  component: SendSmsPage,
});

function SendSmsPage() {
  const fnDevices = useServerFn(listDevices);
  const fnSend = useServerFn(sendSingleMessage);
  const devices = useQuery({ queryKey: ["devices"], queryFn: () => fnDevices() });

  const [deviceId, setDeviceId] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const mut = useMutation({
    mutationFn: () => fnSend({ data: { device_id: deviceId, recipient: phone, message } }),
    onSuccess: () => {
      toast.success("Message sent");
      setPhone(""); setMessage("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={Send}
        title="Send Message"
        description="Send a WhatsApp message to a single phone number."
      />
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <form
            onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
            className="space-y-3.5"
          >
            <div className="space-y-1.5">
              <Label>Device</Label>
              <Select value={deviceId} onValueChange={setDeviceId}>
                <SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger>
                <SelectContent>
                  {(devices.data ?? []).length === 0 && (
                    <div className="px-2 py-3 text-xs text-muted-foreground">Add a device first.</div>
                  )}
                  {(devices.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801XXXXXXXXX" />
              <p className="text-[11px] text-muted-foreground">Include country code or it will default to +880.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message here…" rows={5} />
            </div>
            <Button type="submit" className="w-full" disabled={mut.isPending || !deviceId}>
              {mut.isPending ? "Sending…" : "Send Message"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
