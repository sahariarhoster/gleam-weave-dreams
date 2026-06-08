import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { listMyBrandMembers, createBrandMemberUser, removeMyBrandMember, setMyBrandMemberActive, deleteMyBrandMember } from "@/lib/users.functions";
import { Power, UserX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "Members — WA Notifier" }] }),
  component: MembersPage,
});

function MembersPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listMyBrandMembers);
  const fnCreate = useServerFn(createBrandMemberUser);
  const fnRemove = useServerFn(removeMyBrandMember);
  const data = useQuery({ queryKey: ["my-brand-members"], queryFn: () => fnList() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", brand_id: "", role: "brand_member",
  });

  const createMut = useMutation({
    mutationFn: () => fnCreate({ data: { ...form, role: form.role as any } }),
    onSuccess: () => {
      toast.success("Member added");
      setOpen(false);
      setForm({ full_name: "", email: "", password: "", brand_id: "", role: "brand_member" });
      qc.invalidateQueries({ queryKey: ["my-brand-members"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const removeMut = useMutation({
    mutationFn: (v: { user_id: string; brand_id: string }) => fnRemove({ data: v }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["my-brand-members"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const brands = data.data?.brands ?? [];
  const members = data.data?.members ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Users}
        title="Brand Members"
        description="Manage who can access and operate your brands."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" disabled={brands.length === 0}>
                <UserPlus className="h-4 w-4" /> Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Brand Member</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="space-y-3">
                <div className="space-y-1.5"><Label>Full Name</Label>
                  <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Email</Label>
                  <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Password</Label>
                  <Input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="space-y-1.5"><Label>Brand</Label>
                  <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick a brand" /></SelectTrigger>
                    <SelectContent>
                      {brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand_member">Brand Member</SelectItem>
                      <SelectItem value="brand_admin">Brand Admin</SelectItem>
                      <SelectItem value="sender">Sender</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!form.brand_id || createMut.isPending} className="w-full">
                    {createMut.isPending ? "Adding…" : "Add Member"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.isLoading && <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!data.isLoading && members.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  {brands.length === 0 ? "You don't own any brands yet." : "No members yet."}
                </TableCell></TableRow>
              )}
              {members.map((m) => (
                <TableRow key={`${m.brand_id}-${m.user_id}`}>
                  <TableCell className="font-medium">{m.full_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{m.email ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{m.brand_name}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove member?</AlertDialogTitle>
                          <AlertDialogDescription>This removes them from the brand. Their account is not deleted.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeMut.mutate({ user_id: m.user_id, brand_id: m.brand_id })} className="bg-rose-600 hover:bg-rose-700">Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
