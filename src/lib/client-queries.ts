import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type BrandFilter = { brand_id?: string | null };

function assertOk(error: { message?: string } | null | undefined) {
  if (error) throw new Error(error.message ?? "Failed to load data");
}

async function attachBrandNames<T extends Record<string, any>>(rows: T[], key = "brand_id") {
  const ids = Array.from(new Set(rows.map((r) => r[key]).filter(Boolean)));
  if (ids.length === 0) return rows;
  const { data, error } = await db.from("brands").select("id, name").in("id", ids);
  assertOk(error);
  const names = Object.fromEntries((data ?? []).map((b: any) => [b.id, b.name]));
  return rows.map((row) => ({ ...row, brand_name: row[key] ? names[row[key]] ?? null : null }));
}

export async function listMyRolesClient(userId?: string | null) {
  if (!userId) return [];
  const { data, error } = await db.from("user_roles").select("role").eq("user_id", userId);
  assertOk(error);
  return (data ?? []).map((row: any) => row.role as string);
}

export async function listBrandsLiteClient() {
  const { data, error } = await db.from("brands").select("id, name, license_limit, device_limit").order("name");
  assertOk(error);
  return data ?? [];
}

export async function listBrandsClient() {
  const { data, error } = await db
    .from("brands")
    .select("id, name, status, expires_at, message_limit, device_limit, license_limit, created_at")
    .order("created_at", { ascending: false });
  assertOk(error);
  const rows = data ?? [];
  const ids = rows.map((brand: any) => brand.id);
  if (ids.length === 0) return [];
  const [devicesRes, membersRes] = await Promise.all([
    db.from("devices").select("brand_id").in("brand_id", ids),
    db.from("brand_members").select("brand_id").in("brand_id", ids),
  ]);
  assertOk(devicesRes.error);
  assertOk(membersRes.error);
  const deviceCount: Record<string, number> = {};
  const memberCount: Record<string, number> = {};
  (devicesRes.data ?? []).forEach((row: any) => {
    if (row.brand_id) deviceCount[row.brand_id] = (deviceCount[row.brand_id] ?? 0) + 1;
  });
  (membersRes.data ?? []).forEach((row: any) => {
    if (row.brand_id) memberCount[row.brand_id] = (memberCount[row.brand_id] ?? 0) + 1;
  });
  return rows.map((brand: any) => ({
    ...brand,
    devices_count: deviceCount[brand.id] ?? 0,
    members_count: memberCount[brand.id] ?? 0,
  }));
}

export async function listDevicesClient() {
  const { data, error } = await db
    .from("devices")
    .select("id, name, device_unique_id, sim_info, brand_id, status, last_checked_at, created_at, brands(name)")
    .order("created_at", { ascending: false });
  assertOk(error);
  return data ?? [];
}

export async function listUsersClient() {
  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, email, full_name, phone, created_at")
    .order("created_at", { ascending: false });
  assertOk(error);
  const [rolesRes, membersRes] = await Promise.all([
    db.from("user_roles").select("user_id, role"),
    db.from("brand_members").select("user_id, role, brand_id, brands(name)"),
  ]);
  assertOk(rolesRes.error);
  assertOk(membersRes.error);
  const roleMap: Record<string, string[]> = {};
  const memberMap: Record<string, any[]> = {};
  (rolesRes.data ?? []).forEach((row: any) => {
    roleMap[row.user_id] = [...(roleMap[row.user_id] ?? []), row.role];
  });
  (membersRes.data ?? []).forEach((row: any) => {
    memberMap[row.user_id] = [
      ...(memberMap[row.user_id] ?? []),
      { brand_id: row.brand_id, brand_name: row.brands?.name, role: row.role },
    ];
  });
  return (profiles ?? []).map((profile: any) => ({
    ...profile,
    roles: roleMap[profile.id] ?? [],
    memberships: memberMap[profile.id] ?? [],
  }));
}

export async function listContactsClient(filter: BrandFilter = {}) {
  let query = db
    .from("contacts")
    .select("id, brand_id, name, phone, email, tags, notes, created_at, brands(name)")
    .order("created_at", { ascending: false });
  if (filter.brand_id) query = query.eq("brand_id", filter.brand_id);
  const { data, error } = await query;
  assertOk(error);
  return data ?? [];
}

export async function listGroupsClient(filter: BrandFilter = {}) {
  let query = db
    .from("contact_groups")
    .select("id, brand_id, name, description, created_at, brands(name)")
    .order("created_at", { ascending: false });
  if (filter.brand_id) query = query.eq("brand_id", filter.brand_id);
  const { data, error } = await query;
  assertOk(error);
  const rows = data ?? [];
  const ids = rows.map((group: any) => group.id);
  if (ids.length === 0) return [];
  const { data: members, error: membersError } = await db.from("contact_group_members").select("group_id").in("group_id", ids);
  assertOk(membersError);
  const counts: Record<string, number> = {};
  (members ?? []).forEach((member: any) => {
    counts[member.group_id] = (counts[member.group_id] ?? 0) + 1;
  });
  return rows.map((group: any) => ({ ...group, member_count: counts[group.id] ?? 0 }));
}

export async function getGroupMembersClient(groupId: string) {
  const { data, error } = await db
    .from("contact_group_members")
    .select("contact_id, contacts(id, name, phone, email)")
    .eq("group_id", groupId);
  assertOk(error);
  return (data ?? []).map((row: any) => row.contacts).filter(Boolean);
}

export async function listCampaignsClient() {
  const { data, error } = await db
    .from("campaigns")
    .select("id, name, status, total_recipients, sent_count, failed_count, scheduled_at, created_at, brands(name), devices(name)")
    .order("created_at", { ascending: false });
  assertOk(error);
  return data ?? [];
}

export async function listMessageLogsClient(filters: { brand_id?: string | null; campaign_id?: string | null; status?: string | null; search?: string | null; source?: string | null; limit?: number } = {}) {
  const limit = filters.limit ?? 300;

  // 1) Campaign messages
  let cmQ = db
    .from("campaign_messages")
    .select("id, campaign_id, phone, rendered_message, status, error_message, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filters.status) cmQ = cmQ.eq("status", filters.status);
  if (filters.campaign_id) cmQ = cmQ.eq("campaign_id", filters.campaign_id);
  if (filters.search) cmQ = cmQ.ilike("phone", `%${filters.search}%`);
  const { data: cmRows, error: cmErr } = await cmQ;
  assertOk(cmErr);

  const campaignIds = Array.from(new Set((cmRows ?? []).map((r: any) => r.campaign_id).filter(Boolean)));
  let campaignMap: Record<string, any> = {};
  if (campaignIds.length) {
    const { data: campaigns, error: cErr } = await db.from("campaigns").select("id, name, brand_id").in("id", campaignIds);
    assertOk(cErr);
    campaignMap = Object.fromEntries((campaigns ?? []).map((c: any) => [c.id, c]));
  }

  const campaignLogs = (cmRows ?? []).map((row: any) => ({
    id: `cm:${row.id}`,
    source: "campaign" as const,
    source_label: campaignMap[row.campaign_id]?.name ?? "Campaign",
    phone: row.phone,
    rendered_message: row.rendered_message,
    status: row.status, // sent/failed/pending/delivered/skipped
    error_message: row.error_message,
    brand_id: campaignMap[row.campaign_id]?.brand_id ?? null,
    created_at: row.created_at,
    sent_at: row.sent_at,
  }));

  // 2) Plugin & single sends from activity_log
  let alQ = db
    .from("activity_log")
    .select("id, action, brand_id, details, created_at")
    .in("action", ["plugin_send", "send_single"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filters.brand_id) alQ = alQ.eq("brand_id", filters.brand_id);
  const { data: alRows, error: alErr } = await alQ;
  assertOk(alErr);

  const activityLogs = (alRows ?? [])
    .map((row: any) => {
      const d = row.details ?? {};
      const httpOk = String(d.status) === "200";
      return {
        id: `al:${row.id}`,
        source: row.action === "send_single" ? ("single" as const) : ("plugin" as const),
        source_label: row.action === "send_single" ? "Single Send" : "Plugin",
        phone: d.recipient ?? "",
        rendered_message: d.message_text ?? d.body ?? null,
        status: httpOk ? "sent" : "failed",
        error_message: httpOk ? null : (d.message ?? d.error ?? `HTTP ${d.status ?? "?"}`),
        brand_id: row.brand_id ?? null,
        created_at: row.created_at,
        sent_at: row.created_at,
      };
    })
    .filter((row: any) => {
      if (filters.search && !String(row.phone).includes(filters.search)) return false;
      if (filters.status && row.status !== filters.status) return false;
      return true;
    });

  // 3) Merge, filter by brand & source, sort, cap
  let merged = [...campaignLogs, ...activityLogs];
  if (filters.brand_id) merged = merged.filter((r) => r.brand_id === filters.brand_id);
  if (filters.source && filters.source !== "all") merged = merged.filter((r) => r.source === filters.source);
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  merged = merged.slice(0, limit);

  return attachBrandNames(merged);
}


export async function listBlockedClient(filter: BrandFilter = {}) {
  let query = db.from("blocked_numbers").select("id, phone, reason, brand_id, created_at").order("created_at", { ascending: false }).limit(500);
  if (filter.brand_id) query = query.eq("brand_id", filter.brand_id);
  const { data, error } = await query;
  assertOk(error);
  return attachBrandNames(data ?? []);
}

export async function listActivityLogClient(filter: BrandFilter = {}) {
  let query = db.from("activity_log").select("id, action, details, brand_id, user_id, created_at").order("created_at", { ascending: false }).limit(200);
  if (filter.brand_id) query = query.eq("brand_id", filter.brand_id);
  const { data, error } = await query;
  assertOk(error);
  const rows = data ?? [];
  const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));
  let profiles: any[] = [];
  if (userIds.length) {
    const { data: profileRows, error: profilesError } = await db.from("profiles").select("id, email, full_name").in("id", userIds);
    assertOk(profilesError);
    profiles = profileRows ?? [];
  }
  const profileMap = Object.fromEntries(profiles.map((profile: any) => [profile.id, profile]));
  const enriched = rows.map((row: any) => ({
    ...row,
    user_email: profileMap[row.user_id]?.email ?? null,
    user_name: profileMap[row.user_id]?.full_name ?? null,
  }));
  return attachBrandNames(enriched);
}

export async function listLicensesClient() {
  const { data, error } = await db
    .from("plugin_licenses")
    .select("id, brand_id, license_key, status, device_id, site_url, activated_at, last_seen_at, created_at, brands(name, license_limit), devices(name)")
    .order("created_at", { ascending: false });
  assertOk(error);
  return (data ?? []).map((row: any) => ({
    ...row,
    brand_name: row.brands?.name,
    brand_license_limit: row.brands?.license_limit,
    device_name: row.devices?.name,
  }));
}


export async function createBrandClient(input: {
  name: string;
  status?: string;
  expires_at?: string | null;
  message_limit?: number | null;
  device_limit?: number;
}) {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const payload = {
    name: input.name,
    status: input.status ?? "active",
    expires_at: input.expires_at ?? null,
    message_limit: input.message_limit ?? null,
    device_limit: input.device_limit ?? 1,
    created_by: userId,
  };
  const { data, error } = await db.from("brands").insert(payload).select().single();
  assertOk(error);
  await db.from("brand_members").insert({ brand_id: data.id, user_id: userId, role: "brand_admin" });
  return data;
}

export async function updateBrandClient(input: {
  id: string;
  name: string;
  status?: string;
  expires_at?: string | null;
  message_limit?: number | null;
  device_limit?: number;
}) {
  const { id, ...rest } = input;
  const { error } = await db.from("brands").update(rest).eq("id", id);
  assertOk(error);
  return { ok: true };
}

export async function deleteBrandClient(id: string) {
  const { error } = await db.from("brands").delete().eq("id", id);
  assertOk(error);
  return { ok: true };
}
