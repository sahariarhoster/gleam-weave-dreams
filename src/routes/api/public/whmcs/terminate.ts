import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyWhmcsToken, json } from "@/lib/whmcs-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Body = z.object({
  service_id: z.union([z.string(), z.number()]).transform(String),
  delete_brand: z.boolean().optional().default(false),
});

export const Route = createFileRoute("/api/public/whmcs/terminate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await verifyWhmcsToken(request))) return json({ error: "unauthorized" }, 401);
        const input = Body.parse(await request.json());
        if (input.delete_brand) {
          const { error } = await supabaseAdmin.from("brands")
            .delete().eq("whmcs_service_id", input.service_id);
          if (error) return json({ error: error.message }, 500);
        } else {
          const { error } = await supabaseAdmin.from("brands")
            .update({ status: "expired" }).eq("whmcs_service_id", input.service_id);
          if (error) return json({ error: error.message }, 500);
        }
        return json({ ok: true });
      },
    },
  },
});
