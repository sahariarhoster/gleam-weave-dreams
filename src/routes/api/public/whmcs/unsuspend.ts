import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyWhmcsToken, json } from "@/lib/whmcs-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Body = z.object({ service_id: z.union([z.string(), z.number()]).transform(String) });

export const Route = createFileRoute("/api/public/whmcs/unsuspend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await verifyWhmcsToken(request))) return json({ error: "unauthorized" }, 401);
        const input = Body.parse(await request.json());
        const { error } = await supabaseAdmin.from("brands")
          .update({ status: "active" })
          .eq("whmcs_service_id", input.service_id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      },
    },
  },
});
