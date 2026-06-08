import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function verifyWhmcsToken(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization") ?? "";
  const headerTok = request.headers.get("x-whmcs-token") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const provided = headerTok || bearer;
  if (!provided) return false;
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("whmcs_api_token")
    .limit(1)
    .maybeSingle();
  const expected = (data?.whmcs_api_token ?? "") as string;
  if (!expected || expected.length !== provided.length) return false;
  // timing-safe compare
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
