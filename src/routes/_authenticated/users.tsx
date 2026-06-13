import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, ShieldCheck, UserPlus, X, LogIn, KeyRound, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setUserRole, addBrandMember, removeBrandMember, impersonateUser, createUser, resetUserPassword, deleteUser } from "@/lib/users.functions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/page-header";
import { listBrandsLiteClient, listUsersClient } from "@/lib/client-queries";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users — WA Suite" }] }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const fnSetRole = useServerFn(setUserRole);
  const fnRemove = useServerFn(removeBrandMember);
  const fnImpersonate = useServerFn(impersonateUser);
  const fnDelete = useServerFn(deleteUser);
  const { user: me } = useAuth();
  const users = useQuery({ queryKey: ["users"], queryFn: listUsersClient });
  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: listBrandsLiteClient });

  const deleteMut = useMutation({
    mutationFn: (user_id: string) => fnDelete({ data: { user_id } }),
    onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: "owner" | "admin" | "manager" | "brand_owner" | "support_agent" | "sales_agent" | "member" }) => fnSetRole({ data: v }),
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
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filteredUsers = (users.data ?? []).filter((u: any) => {
    if (!q) return true;
    return (
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.phone ?? "").toLowerCase().includes(q) ||
      (u.memberships ?? []).some((m: any) => (m.brand_name ?? "").toLowerCase().includes(q))
    );
  });

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
      <PageHeader
        icon={Users}
        title="Users"
        description="All accounts on the platform — assign roles and brand access."
        actions={<AddUserButton onDone={() => qc.invalidateQueries({ queryKey: ["users"] })} />}
      />
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-6">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Brand Access</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.isLoading && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!users.isLoading && filteredUsers.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No users match your search.</TableCell></TableRow>
              )}
              {filteredUsers.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.phone ? <a href={`tel:${u.phone}`} className="hover:underline">{u.phone}</a> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <Select
                      value={u.roles?.[0] ?? "member"}
                      onValueChange={(v) => roleMut.mutate({ user_id: u.id, role: v as "owner" | "admin" | "manager" | "brand_owner" | "support_agent" | "sales_agent" | "member" })}
                    >
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="brand_owner">Brand Owner</SelectItem>
                        <SelectItem value="support_agent">Support Agent</SelectItem>
                        <SelectItem value="sales_agent">Sales Agent</SelectItem>
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
                      {me?.id !== u.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" title="Delete user">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes <span className="font-medium">{u.email}</span> and all their access. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMut.mutate(u.id)} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
  const [brandSearch, setBrandSearch] = useState("");
  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase()),
  );
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
              <div className="sticky top-0 z-10 bg-popover p-1.5 border-b">
                <Input
                  placeholder="Search brands…"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="h-8"
                />
              </div>
              {filteredBrands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              {filteredBrands.length === 0 && (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</div>
              )}
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
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "brand_owner" as "owner" | "admin" | "manager" | "brand_owner" | "support_agent" | "sales_agent" | "member" });
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
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "owner" | "admin" | "manager" | "brand_owner" | "support_agent" | "sales_agent" | "member" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="support_agent">Support Agent</SelectItem>
                <SelectItem value="sales_agent">Sales Agent</SelectItem>
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
