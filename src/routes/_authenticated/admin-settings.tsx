import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLicenseSettings, setLicensesPerBrand } from "@/lib/licenses.functions";

export const Route = createFileRoute("/_authenticated/admin-settings")({
  head: () => ({ meta: [{ title: "Admin Settings — WA Notifier" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const qc = useQueryClient();
  const fnGet = useServerFn(getLicenseSettings);
  const fnSet = useServerFn(setLicensesPerBrand);
  const settings = useQuery({ queryKey: ["license-settings"], queryFn: () => fnGet() });
  const [limit, setLimit] = useState<number>(1);

  useEffect(() => {
    if (settings.data?.licenses_per_brand) setLimit(settings.data.licenses_per_brand);
  }, [settings.data?.licenses_per_brand]);

  const mut = useMutation({
    mutationFn: (n: number) => fnSet({ data: { limit: n } }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["license-settings"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" /> Plugin License Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Active licenses per brand</Label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of active WordPress plugin licenses each brand can hold at once.
            </p>
          </div>
          <Button onClick={() => mut.mutate(limit)} disabled={mut.isPending}>
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
