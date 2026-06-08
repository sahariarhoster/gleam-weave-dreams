import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyWhmcsToken, json } from "@/lib/whmcs-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Body = z.object({
  service_id: z.union([z.string(), z.number()]).transform(String),
  brand_name: z.string().min(1).max(100).optional(),
  message_limit: z.number().int().positive().nullable().optional(),
  device_limit: z.number().int().min(1).max(50).optional(),
  expires_at: z.string().datetime().nullable().optional(),
  product_id: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? undefined : String(v))),
});

export const Route = createFileRoute("/api/public/whmcs/update")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await verifyWhmcsToken(request))) return json({ error: "unauthorized" }, 401);
        const input = Body.parse(await request.json());
        const patch: Record<string, unknown> = {};
        if (input.brand_name !== undefined) patch.name = input.brand_name;
        if (input.message_limit !== undefined) patch.message_limit = input.message_limit;
        if (input.device_limit !== undefined) patch.device_limit = input.device_limit;
        if (input.expires_at !== undefined) patch.expires_at = input.expires_at;
        if (input.product_id !== undefined) patch.whmcs_product_id = input.product_id;
        const { error } = await supabaseAdmin.from("brands")
          .update(patch).eq("whmcs_service_id", input.service_id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      },
    },
  },
});
