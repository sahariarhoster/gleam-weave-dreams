import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, ShieldCheck, UserPlus, X, LogIn, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listUsers, setUserRole, addBrandMember, removeBrandMember, impersonateUser, createUser, resetUserPassword } from "@/lib/users.functions";
import { supabase } from "@/integrations/supabase/client";
import { listBrandsLite } from "@/lib/brands.functions";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users — WA Notifier" }] }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listUsers);
  const fnBrands = useServerFn(listBrandsLite);
  const fnSetRole = useServerFn(setUserRole);
  const fnRemove = useServerFn(removeBrandMember);
  const fnImpersonate = useServerFn(impersonateUser);
  const users = useQuery({ queryKey: ["users"], queryFn: () => fnList() });
  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: () => fnBrands() });

  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: "owner" | "admin" | "manager" | "brand_owner" | "support_agent" | "member" }) => fnSetRole({ data: v }),
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const removeMut = useMutation({
    mutationFn: (v: { user_id: string; brand_id: string }) => fnRemove({ data: v }),
    onSuccess: () => { toast.success("Removed from brand"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const impersonateMut = useMutation({
    mutationFn: (user_id: string) => fnImpersonate({ data: { user_id } }),
    onSuccess: async ({ url }) => {
      toast.info("Signing in as user…");
      await supabase.auth.signOut();
      window.location.href = url;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const [openFor, setOpenFor] = useState<string | null>(null);

  if (users.isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8" />
          Owners only. {(users.error as Error)?.message}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> All Users</CardTitle>
          <AddUserButton onDone={() => qc.invalidateQueries({ queryKey: ["users"] })} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Brand Access</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.isLoading && <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {(users.data ?? []).map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.roles?.[0] ?? "member"}
                      onValueChange={(v) => roleMut.mutate({ user_id: u.id, role: v as "owner" | "admin" | "manager" | "brand_owner" | "support_agent" | "member" })}
                    >
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="brand_owner">Brand Owner</SelectItem>
                        <SelectItem value="support_agent">Support Agent</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.memberships.length === 0 && <span className="text-xs text-muted-foreground">No brand access</span>}
                      {u.memberships.map((m: any) => (
                        <Badge key={m.brand_id} variant="secondary" className="gap-1 pr-1">
                          {m.brand_name} <span className="text-[10px] opacity-70">· {m.role}</span>
                          <button
                            onClick={() => removeMut.mutate({ user_id: u.id, brand_id: m.brand_id })}
                            className="ml-0.5 rounded p-0.5 hover:bg-muted-foreground/20"
                          ><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() => impersonateMut.mutate(u.id)}
                        disabled={impersonateMut.isPending}
                        title="Sign in as this user"
                      >
                        <LogIn className="h-4 w-4" /> Login as
                      </Button>
                      <ResetPasswordButton userId={u.id} email={u.email} />
                      <Dialog open={openFor === u.id} onOpenChange={(v) => setOpenFor(v ? u.id : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1"><UserPlus className="h-4 w-4" /> Add to Brand</Button>
                        </DialogTrigger>
                        <AddBrandDialog userId={u.id} brands={brands.data ?? []} onDone={() => { setOpenFor(null); qc.invalidateQueries({ queryKey: ["users"] }); }} />
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AddBrandDialog({ userId, brands, onDone }: { userId: string; brands: { id: string; name: string }[]; onDone: () => void }) {
  const fn = useServerFn(addBrandMember);
  const [brandId, setBrandId] = useState("");
  const [role, setRole] = useState<"brand_admin" | "brand_member" | "sender">("brand_member");
  const mut = useMutation({
    mutationFn: () => fn({ data: { user_id: userId, brand_id: brandId, role } }),
    onSuccess: () => { toast.success("Added"); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add to Brand</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Brand</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger><SelectValue placeholder="Pick a brand" /></SelectTrigger>
            <SelectContent>
              {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Brand Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "brand_admin" | "brand_member" | "sender")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="brand_member">Brand Member</SelectItem>
              <SelectItem value="brand_admin">Brand Admin</SelectItem>
              <SelectItem value="sender">Sender</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={!brandId || mut.isPending} onClick={() => mut.mutate()} className="w-full">
          {mut.isPending ? "Adding…" : "Add"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AddUserButton({ onDone }: { onDone: () => void }) {
  const fn = useServerFn(createUser);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "brand_owner" as "owner" | "admin" | "manager" | "brand_owner" | "support_agent" | "member" });
  const mut = useMutation({
    mutationFn: () => fn({ data: form }),
    onSuccess: () => {
      toast.success("User created");
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "brand_owner" });
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><UserPlus className="h-4 w-4" /> Add User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
          className="space-y-3"
        >
          <div className="space-y-1.5"><Label>Full Name</Label>
            <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>Email</Label>
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>Password</Label>
            <Input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "owner" | "admin" | "manager" | "brand_owner" | "support_agent" | "member" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="support_agent">Support Agent</SelectItem>
                <SelectItem value="brand_owner">Brand Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mut.isPending} className="w-full">
              {mut.isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordButton({ userId, email }: { userId: string; email: string }) {
  const fn = useServerFn(resetUserPassword);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const mut = useMutation({
    mutationFn: () => fn({ data: { user_id: userId, password } }),
    onSuccess: () => { toast.success("Password updated"); setOpen(false); setPassword(""); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1" title="Reset password">
          <KeyRound className="h-4 w-4" /> Reset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
          <p className="text-sm text-muted-foreground">Set a new password for <span className="font-medium">{email}</span>.</p>
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mut.isPending} className="w-full">
              {mut.isPending ? "Updating…" : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
