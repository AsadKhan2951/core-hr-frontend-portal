import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Calendar, Clock, Users, Edit, Trash2 } from "lucide-react";

const COMPANY_ID = 1;

type Shift = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workDays: string;
  isFlexible: boolean;
  graceMinutes: number;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function ShiftRosterPage() {
  const [activeTab, setActiveTab] = useState("shifts");
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showRosterDialog, setShowRosterDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Shift form state
  const [shiftForm, setShiftForm] = useState({
    name: "", startTime: "09:00", endTime: "18:00",
    breakMinutes: 60, graceMinutes: 15, isFlexible: false,
    workDays: ["monday","tuesday","wednesday","thursday","friday"],
  });

  // Roster form state
  const [rosterForm, setRosterForm] = useState({
    employeeId: "", shiftId: "", startDate: "", endDate: "",
  });

  const { data: shifts, refetch: refetchShifts } = trpc.attendance.shifts.list.useQuery({ companyId: COMPANY_ID });
  const createShift = trpc.attendance.shifts.create.useMutation({
    onSuccess: () => { toast.success("Shift created"); setShowShiftDialog(false); refetchShifts(); },
    onError: (e) => toast.error(e.message),
  });

  const updateShift = trpc.attendance.shifts.update.useMutation({
    onSuccess: () => { toast.success("Shift updated"); setShowShiftDialog(false); setEditingShift(null); refetchShifts(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteShift = trpc.attendance.shifts.delete.useMutation({
    onSuccess: () => { toast.success("Shift deleted"); refetchShifts(); },
    onError: (e) => toast.error(e.message),
  });

  const assignRoster = trpc.attendance.rosters.assign.useMutation({
    onSuccess: () => { toast.success("Roster assigned"); setShowRosterDialog(false); },
    onError: (e) => toast.error(e.message),
  });

  const handleSaveShift = () => {
    const payload = {
      companyId: COMPANY_ID,
      name: shiftForm.name,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      breakMinutes: shiftForm.breakMinutes,
      graceMinutes: shiftForm.graceMinutes,
      isFlexible: shiftForm.isFlexible,
      monday: shiftForm.workDays.includes("monday"),
      tuesday: shiftForm.workDays.includes("tuesday"),
      wednesday: shiftForm.workDays.includes("wednesday"),
      thursday: shiftForm.workDays.includes("thursday"),
      friday: shiftForm.workDays.includes("friday"),
      saturday: shiftForm.workDays.includes("saturday"),
      sunday: shiftForm.workDays.includes("sunday"),
    };
    if (editingShift) {
      updateShift.mutate({ id: editingShift.id, ...payload });
    } else {
      createShift.mutate(payload);
    }
  };

  const openEditShift = (shift: Shift) => {
    setEditingShift(shift);
    const workDays: string[] = [];
    const wd = shift.workDays as unknown as Record<string, boolean>;
    DAY_KEYS.forEach(d => { if (wd[d]) workDays.push(d); });
    setShiftForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMinutes: shift.breakMinutes,
      graceMinutes: shift.graceMinutes,
      isFlexible: shift.isFlexible,
      workDays,
    });
    setShowShiftDialog(true);
  };

  const shiftColumns = [
    { key: "name", header: "Shift Name", sortable: true },
    { key: "startTime", header: "Start", sortable: true },
    { key: "endTime", header: "End", sortable: true },
    { key: "breakMinutes", header: "Break (min)", sortable: true },
    { key: "graceMinutes", header: "Grace (min)", sortable: true },
    {
      key: "isFlexible",
      header: "Type",
      render: (row: Record<string, unknown>) => (
        <Badge variant={row.isFlexible ? "secondary" : "outline"}>
          {row.isFlexible ? "Flexible" : "Fixed"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditShift(row as unknown as Shift)}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-red-500"
            onClick={() => deleteShift.mutate({ id: Number(row.id) })}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shifts & Rosters</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage work shifts and employee roster assignments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRosterDialog(true)}>
            <Users className="h-4 w-4 mr-2" />
            Assign Roster
          </Button>
          <Button size="sm" onClick={() => { setEditingShift(null); setShiftForm({ name: "", startTime: "09:00", endTime: "18:00", breakMinutes: 60, graceMinutes: 15, isFlexible: false, workDays: ["monday","tuesday","wednesday","thursday","friday"] }); setShowShiftDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Shift
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="shifts" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Shift Templates
          </TabsTrigger>
          <TabsTrigger value="roster" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Roster Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="mt-4">
          {!shifts || (shifts as unknown[]).length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No shifts defined"
              description="Create your first shift template to start managing employee schedules."
              action={{ label: "Create Shift", onClick: () => setShowShiftDialog(true) }}
            />
          ) : (
            <DataTable
              columns={shiftColumns}
              data={(shifts as unknown as Record<string, unknown>[])}
              exportFilename="shifts"
            />
          )}
        </TabsContent>

        <TabsContent value="roster" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Weekly Roster View
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Roster calendar grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground border-b">Employee</th>
                      {DAYS.map(d => (
                        <th key={d} className="text-center py-2 px-2 font-medium text-muted-foreground border-b w-24">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b hover:bg-muted/20">
                        <td className="py-2 px-3 text-muted-foreground text-xs">Employee #{i + 1}</td>
                        {DAYS.map(d => (
                          <td key={d} className="py-2 px-2 text-center">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {i % 2 === 0 ? "Morning" : "Evening"}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-3">
                  Assign rosters to employees using the "Assign Roster" button above.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shift Dialog */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingShift ? "Edit Shift" : "Create Shift"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Shift Name</Label>
              <Input value={shiftForm.name} onChange={e => setShiftForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Shift" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={shiftForm.startTime} onChange={e => setShiftForm(f => ({ ...f, startTime: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={shiftForm.endTime} onChange={e => setShiftForm(f => ({ ...f, endTime: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Break (minutes)</Label>
                <Input type="number" value={shiftForm.breakMinutes} onChange={e => setShiftForm(f => ({ ...f, breakMinutes: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label>Grace Period (minutes)</Label>
                <Input type="number" value={shiftForm.graceMinutes} onChange={e => setShiftForm(f => ({ ...f, graceMinutes: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Shift Type</Label>
              <Select value={shiftForm.isFlexible ? "flexible" : "fixed"} onValueChange={v => setShiftForm(f => ({ ...f, isFlexible: v === "flexible" }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Work Days</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {DAY_KEYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setShiftForm(f => ({
                      ...f,
                      workDays: f.workDays.includes(d) ? f.workDays.filter(x => x !== d) : [...f.workDays, d],
                    }))}
                    className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                      shiftForm.workDays.includes(d)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {DAYS[i]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShiftDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveShift} disabled={createShift.isPending || updateShift.isPending}>
              {editingShift ? "Update" : "Create"} Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roster Assignment Dialog */}
      <Dialog open={showRosterDialog} onOpenChange={setShowRosterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Roster</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Employee ID</Label>
              <Input
                type="number"
                value={rosterForm.employeeId}
                onChange={e => setRosterForm(f => ({ ...f, employeeId: e.target.value }))}
                placeholder="Enter employee ID"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={rosterForm.shiftId} onValueChange={v => setRosterForm(f => ({ ...f, shiftId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {(shifts as unknown as Array<{ id: number; name: string }> ?? []).map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={rosterForm.startDate} onChange={e => setRosterForm(f => ({ ...f, startDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input type="date" value={rosterForm.endDate} onChange={e => setRosterForm(f => ({ ...f, endDate: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRosterDialog(false)}>Cancel</Button>
            <Button
              onClick={() => assignRoster.mutate({
                companyId: COMPANY_ID,
                employeeId: Number(rosterForm.employeeId),
                shiftId: Number(rosterForm.shiftId),
                date: new Date(rosterForm.startDate),
              })}
              disabled={assignRoster.isPending || !rosterForm.employeeId || !rosterForm.shiftId || !rosterForm.startDate}
            >
              Assign Roster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
