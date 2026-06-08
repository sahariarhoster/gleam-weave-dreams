import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyWhmcsToken, json } from "@/lib/whmcs-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Body = z.object({
  service_id: z.union([z.string(), z.number()]).transform((v) => String(v)),
  product_id: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v == null ? null : String(v))),
  brand_name: z.string().min(1).max(100),
  owner_email: z.string().email().max(255),
  owner_name: z.string().min(1).max(100),
  message_limit: z.number().int().positive().nullable().optional(),
  device_limit: z.number().int().min(1).max(50).default(1),
  expires_at: z.string().datetime().nullable().optional(),
});

export const Route = createFileRoute("/api/public/whmcs/provision")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await verifyWhmcsToken(request))) return json({ error: "unauthorized" }, 401);
        let input: z.infer<typeof Body>;
        try {
          input = Body.parse(await request.json());
        } catch (e) {
          return json({ error: "invalid_input", detail: (e as Error).message }, 400);
        }

        // If service already provisioned, return existing
        const { data: existing } = await supabaseAdmin
          .from("brands")
          .select("id, name")
          .eq("whmcs_service_id", input.service_id)
          .maybeSingle();
        if (existing) return json({ ok: true, already: true, brand_id: existing.id });

        // Create or reuse user
        let userId: string | null = null;
        let generatedPassword: string | null = null;
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = (list?.users ?? []).find(
          (u) => u.email?.toLowerCase() === input.owner_email.toLowerCase(),
        );
        if (found) {
          userId = found.id;
        } else {
          generatedPassword = Array.from(crypto.getRandomValues(new Uint8Array(12)))
            .map((b) => "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 57])
            .join("");
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email: input.owner_email,
            password: generatedPassword,
            email_confirm: true,
            user_metadata: { full_name: input.owner_name },
          });
          if (error || !created.user) {
            return json({ error: "user_create_failed", detail: error?.message }, 500);
          }
          userId = created.user.id;
        }

        // The auth trigger may be disabled/missing in imported projects, so make
        // the records used by the app UI explicit and idempotent here too.
        const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(
          {
            id: userId,
            email: input.owner_email,
            full_name: input.owner_name,
          },
          { onConflict: "id" },
        );
        if (profileErr) {
          return json({ error: "profile_create_failed", detail: profileErr.message }, 500);
        }

        const { error: roleErr } = await supabaseAdmin.from("user_roles").upsert(
          {
            user_id: userId,
            role: "brand_owner",
          },
          { onConflict: "user_id,role" },
        );
        if (roleErr) {
          return json({ error: "role_create_failed", detail: roleErr.message }, 500);
        }

        // Create brand
        const { data: brand, error: bErr } = await supabaseAdmin
          .from("brands")
          .insert({
            name: input.brand_name,
            status: "active",
            message_limit: input.message_limit ?? null,
            device_limit: input.device_limit ?? 1,
            expires_at: input.expires_at ?? null,
            whmcs_service_id: input.service_id,
            whmcs_product_id: input.product_id ?? null,
            created_by: userId,
          })
          .select("id")
          .single();
        if (bErr || !brand) {
          return json({ error: "brand_create_failed", detail: bErr?.message }, 500);
        }

        const { error: memberErr } = await supabaseAdmin.from("brand_members").upsert({
          brand_id: brand.id,
          user_id: userId,
          role: "brand_admin",
        }, { onConflict: "brand_id,user_id" });
        if (memberErr) return json({ error: "brand_member_create_failed", detail: memberErr.message }, 500);

        await supabaseAdmin.from("activity_log").insert({
          user_id: userId,
          brand_id: brand.id,
          action: "whmcs_provision",
          details: { service_id: input.service_id, product_id: input.product_id },
        });

        return json({
          ok: true,
          brand_id: brand.id,
          user_id: userId,
          email: input.owner_email,
          password: generatedPassword, // null if user already existed
        });
      },
    },
  },
});
