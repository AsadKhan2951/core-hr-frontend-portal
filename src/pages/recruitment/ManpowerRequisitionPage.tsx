import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ClipboardList, CheckCircle, Clock, XCircle, Eye } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  fulfilled: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function ManpowerRequisitionPage() {
  const [companyId] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [viewReq, setViewReq] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", department: "", location: "", headcount: 1,
    priority: "medium", justification: "", targetDate: "",
    employmentType: "full_time", budgetMin: "", budgetMax: "",
  });

  const { data: reqs = [], refetch } = trpc.recruitment.requisitions.list.useQuery({});
  const { data: depts = [] } = trpc.employees.list.useQuery({ companyId });

  const createMutation = trpc.recruitment.requisitions.create.useMutation({
    onSuccess: () => { toast.success("Requisition submitted"); setShowCreate(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = trpc.recruitment.requisitions.approve.useMutation({
    onSuccess: () => { toast.success("Requisition approved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.recruitment.requisitions.reject.useMutation({
    onSuccess: () => { toast.success("Requisition rejected"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!form.title || !form.department) return toast.error("Title and department are required");
    createMutation.mutate({
      title: form.title,
      headcount: form.headcount,
      priority: form.priority as any,
      justification: form.justification || undefined,
      targetDate: form.targetDate ? new Date(form.targetDate) : undefined,
      notes: form.budgetMin ? `Budget: ${form.budgetMin}-${form.budgetMax} AED` : undefined,
    });
  };

  const stats = {
    total: reqs.length,
    pending: reqs.filter((r: any) => r.status === "pending").length,
    approved: reqs.filter((r: any) => r.status === "approved").length,
    fulfilled: reqs.filter((r: any) => r.status === "fulfilled").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manpower Requisitions</h1>
          <p className="text-muted-foreground text-sm mt-1">Submit and track hiring requests through the approval workflow</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Requisition
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: ClipboardList, color: "text-blue-600" },
          { label: "Pending Approval", value: stats.pending, icon: Clock, color: "text-yellow-600" },
          { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-green-600" },
          { label: "Fulfilled", value: stats.fulfilled, icon: CheckCircle, color: "text-purple-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Requisitions Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">All Requisitions</CardTitle></CardHeader>
        <CardContent>
          {reqs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No requisitions yet. Submit the first one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-3">Title</th>
                    <th className="text-left py-2 px-3">Department</th>
                    <th className="text-left py-2 px-3">Headcount</th>
                    <th className="text-left py-2 px-3">Priority</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Target Date</th>
                    <th className="text-left py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reqs.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-medium">{r.title}</td>
                      <td className="py-2 px-3 text-muted-foreground">{r.department}</td>
                      <td className="py-2 px-3">{r.headcount}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[r.priority] ?? ""}`}>
                          {r.priority}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? ""}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {r.targetDate ? new Date(r.targetDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewReq(r)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {r.status === "pending" && (
                            <>
                              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700"
                                onClick={() => approveMutation.mutate({ id: r.id })}>
                                <CheckCircle className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700"
                                onClick={() => rejectMutation.mutate({ id: r.id, notes: "Rejected by manager" })}>
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Manpower Requisition</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Job Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Software Engineer" />
            </div>
            <div className="space-y-1">
              <Label>Department *</Label>
              <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {depts.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Dubai, UAE" />
            </div>
            <div className="space-y-1">
              <Label>Headcount</Label>
              <Input type="number" min={1} value={form.headcount} onChange={e => setForm(f => ({ ...f, headcount: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Employment Type</Label>
              <Select value={form.employmentType} onValueChange={v => setForm(f => ({ ...f, employmentType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Target Date</Label>
              <Input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Budget Min (AED)</Label>
              <Input type="number" value={form.budgetMin} onChange={e => setForm(f => ({ ...f, budgetMin: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Budget Max (AED)</Label>
              <Input type="number" value={form.budgetMax} onChange={e => setForm(f => ({ ...f, budgetMax: e.target.value }))} placeholder="0" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Justification</Label>
              <Textarea value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} placeholder="Explain why this hire is needed..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Submitting..." : "Submit Requisition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewReq && (
        <Dialog open={!!viewReq} onOpenChange={() => setViewReq(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{viewReq.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{viewReq.department}</span></div>
                <div><span className="text-muted-foreground">Headcount:</span> <span className="font-medium">{viewReq.headcount}</span></div>
                <div><span className="text-muted-foreground">Priority:</span> <Badge className={PRIORITY_COLORS[viewReq.priority]}>{viewReq.priority}</Badge></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_COLORS[viewReq.status]}>{viewReq.status}</Badge></div>
                <div><span className="text-muted-foreground">Employment:</span> <span className="font-medium">{viewReq.employmentType?.replace("_", " ")}</span></div>
                <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{viewReq.location || "—"}</span></div>
              </div>
              {viewReq.justification && (
                <div>
                  <p className="text-muted-foreground mb-1">Justification:</p>
                  <p className="bg-muted/40 rounded p-2">{viewReq.justification}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewReq(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
