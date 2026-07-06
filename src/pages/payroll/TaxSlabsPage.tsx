/**
 * TaxSlabsPage — Payroll Module 4
 * Admin page for configuring progressive tax slabs and PF settings.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Percent, Shield, Info } from "lucide-react";

const COMPANY_ID = 1;
const CURRENT_YEAR = new Date().getFullYear();

type SlabForm = {
  country: string; year: number;
  fromAmount: string; toAmount: string;
  rate: string; fixedAmount: string; description: string;
};
const defaultSlab: SlabForm = { country: "AE", year: CURRENT_YEAR, fromAmount: "0", toAmount: "", rate: "0", fixedAmount: "0", description: "" };

export default function TaxSlabsPage() {
  const utils = trpc.useUtils();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [slabDialog, setSlabDialog] = useState(false);
  const [slabForm, setSlabForm] = useState<SlabForm>(defaultSlab);

  const { data: slabs = [], isLoading } = trpc.payroll.taxSlabs.list.useQuery({ companyId: COMPANY_ID, year });
  const { data: pf } = trpc.payroll.pf.get.useQuery({ companyId: COMPANY_ID });

  const upsertSlab = trpc.payroll.taxSlabs.upsert.useMutation({
    onSuccess: () => { utils.payroll.taxSlabs.list.invalidate(); toast.success("Tax slab saved"); setSlabDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSlab = trpc.payroll.taxSlabs.delete.useMutation({
    onSuccess: () => { utils.payroll.taxSlabs.list.invalidate(); toast.success("Slab deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const upsertPf = trpc.payroll.pf.upsert.useMutation({
    onSuccess: () => { utils.payroll.pf.get.invalidate(); toast.success("PF settings saved"); },
    onError: (e) => toast.error(e.message),
  });

  const [pfForm, setPfForm] = useState({
    isActive: pf?.isActive ?? false,
    employeeRate: pf?.employeeRate ?? "0.12",
    employerRate: pf?.employerRate ?? "0.12",
    ceiling: pf?.ceiling ?? "",
  });

  const handleSaveSlab = () => {
    if (!slabForm.fromAmount) return toast.error("From amount is required");
    upsertSlab.mutate({ companyId: COMPANY_ID, ...slabForm, year: Number(slabForm.year) });
  };

  const handleSavePf = () => {
    upsertPf.mutate({ companyId: COMPANY_ID, ...pfForm });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tax & PF Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure progressive tax slabs and Provident Fund (PF) settings</p>
      </div>

      <Tabs defaultValue="tax">
        <TabsList>
          <TabsTrigger value="tax"><Percent className="w-4 h-4 mr-2" />Tax Slabs</TabsTrigger>
          <TabsTrigger value="pf"><Shield className="w-4 h-4 mr-2" />PF / Provident Fund</TabsTrigger>
        </TabsList>

        {/* ── TAX SLABS ──────────────────────────────────────────────────────── */}
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Progressive Tax Slabs</CardTitle>
                  <CardDescription>Define income tax brackets. The engine applies slabs progressively at payroll run time.</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Year:</Label>
                    <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || CURRENT_YEAR)} className="w-24" />
                  </div>
                  <Button size="sm" onClick={() => { setSlabForm({ ...defaultSlab, year }); setSlabDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />Add Slab
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg mb-4 text-sm text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>UAE currently has 0% income tax. Add slabs only if your jurisdiction requires it (e.g., India, Pakistan). The engine computes annual tax then divides by 12 for monthly deduction.</span>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : slabs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Percent className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No tax slabs configured for {year}.</p>
                  <p className="text-xs mt-1">For UAE, this is correct — no income tax applies.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From (Annual)</TableHead>
                      <TableHead>To (Annual)</TableHead>
                      <TableHead>Rate (%)</TableHead>
                      <TableHead>Fixed Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slabs.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{parseFloat(s.fromAmount).toLocaleString()}</TableCell>
                        <TableCell>{s.toAmount ? parseFloat(s.toAmount).toLocaleString() : "∞"}</TableCell>
                        <TableCell>{(parseFloat(s.rate) * 100).toFixed(2)}%</TableCell>
                        <TableCell>{parseFloat(s.fixedAmount).toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.description ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteSlab.mutate({ id: s.id })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PF SETTINGS ────────────────────────────────────────────────────── */}
        <TabsContent value="pf">
          <Card>
            <CardHeader>
              <CardTitle>Provident Fund (PF) Settings</CardTitle>
              <CardDescription>Configure employee and employer PF contribution rates. Applied automatically during payroll run.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-md">
              <div className="flex items-center gap-3">
                <Switch
                  checked={pfForm.isActive}
                  onCheckedChange={(v) => setPfForm((f) => ({ ...f, isActive: v }))}
                />
                <div>
                  <Label>Enable PF Deductions</Label>
                  <p className="text-xs text-muted-foreground">When enabled, PF is calculated and deducted during payroll runs</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee Rate</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number" step="0.01" min="0" max="1"
                      value={pfForm.employeeRate}
                      onChange={(e) => setPfForm((f) => ({ ...f, employeeRate: e.target.value }))}
                    />
                    <span className="text-sm text-muted-foreground">({(parseFloat(pfForm.employeeRate || "0") * 100).toFixed(1)}%)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Enter as decimal (e.g. 0.12 = 12%)</p>
                </div>
                <div>
                  <Label>Employer Rate</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number" step="0.01" min="0" max="1"
                      value={pfForm.employerRate}
                      onChange={(e) => setPfForm((f) => ({ ...f, employerRate: e.target.value }))}
                    />
                    <span className="text-sm text-muted-foreground">({(parseFloat(pfForm.employerRate || "0") * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>PF Ceiling (optional)</Label>
                <Input
                  type="number" placeholder="e.g. 15000 — leave blank for no ceiling"
                  value={pfForm.ceiling}
                  onChange={(e) => setPfForm((f) => ({ ...f, ceiling: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Maximum basic salary on which PF is calculated. Leave blank to apply on full basic.</p>
              </div>

              <Button onClick={handleSavePf} disabled={upsertPf.isPending}>
                {upsertPf.isPending ? "Saving..." : "Save PF Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── SLAB DIALOG ──────────────────────────────────────────────────────── */}
      <Dialog open={slabDialog} onOpenChange={setSlabDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Tax Slab</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Country Code</Label>
              <Input value={slabForm.country} onChange={(e) => setSlabForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))} placeholder="AE" />
            </div>
            <div>
              <Label>Year</Label>
              <Input type="number" value={slabForm.year} onChange={(e) => setSlabForm((f) => ({ ...f, year: parseInt(e.target.value) || CURRENT_YEAR }))} />
            </div>
            <div>
              <Label>From Amount (Annual) *</Label>
              <Input type="number" value={slabForm.fromAmount} onChange={(e) => setSlabForm((f) => ({ ...f, fromAmount: e.target.value }))} />
            </div>
            <div>
              <Label>To Amount (Annual)</Label>
              <Input type="number" value={slabForm.toAmount} onChange={(e) => setSlabForm((f) => ({ ...f, toAmount: e.target.value }))} placeholder="Leave blank for unlimited" />
            </div>
            <div>
              <Label>Rate (decimal, e.g. 0.05 = 5%)</Label>
              <Input type="number" step="0.0001" value={slabForm.rate} onChange={(e) => setSlabForm((f) => ({ ...f, rate: e.target.value }))} />
            </div>
            <div>
              <Label>Fixed Amount</Label>
              <Input type="number" value={slabForm.fixedAmount} onChange={(e) => setSlabForm((f) => ({ ...f, fixedAmount: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input value={slabForm.description} onChange={(e) => setSlabForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. 5% on income above 50,000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlabDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSlab} disabled={upsertSlab.isPending}>
              {upsertSlab.isPending ? "Saving..." : "Save Slab"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
