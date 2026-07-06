/**
 * SalaryStructuresPage — Payroll Module 4
 * Admin page for managing salary structures and their components.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Layers, Package, ChevronRight } from "lucide-react";

const COMPANY_ID = 1;

type StructureForm = { name: string; currency: string; description: string; isActive: boolean };
type ComponentForm = {
  name: string; code: string; type: "earning" | "deduction" | "tax" | "pf";
  calculationType: "fixed" | "percentage_of_basic" | "percentage_of_gross" | "formula";
  value: string; isTaxable: boolean; isPFApplicable: boolean; isActive: boolean; sortOrder: number;
};

const defaultStructure: StructureForm = { name: "", currency: "AED", description: "", isActive: true };
const defaultComponent: ComponentForm = {
  name: "", code: "", type: "earning", calculationType: "fixed",
  value: "0", isTaxable: false, isPFApplicable: false, isActive: true, sortOrder: 0,
};

export default function SalaryStructuresPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // ── Structures ──────────────────────────────────────────────────────────────
  const { data: structures = [], isLoading: loadingStructures } = trpc.payroll.structures.list.useQuery({ companyId: COMPANY_ID });
  const [selectedStructureId, setSelectedStructureId] = useState<number | null>(null);
  const [structureDialog, setStructureDialog] = useState<{ open: boolean; editing: (typeof structures)[0] | null }>({ open: false, editing: null });
  const [structureForm, setStructureForm] = useState<StructureForm>(defaultStructure);

  const createStructure = trpc.payroll.structures.create.useMutation({
    onSuccess: () => { utils.payroll.structures.list.invalidate(); toast.success("Salary structure created"); setStructureDialog({ open: false, editing: null }); },
    onError: (e) => toast.error(e.message),
  });
  const updateStructure = trpc.payroll.structures.update.useMutation({
    onSuccess: () => { utils.payroll.structures.list.invalidate(); toast.success("Structure updated"); setStructureDialog({ open: false, editing: null }); },
    onError: (e) => toast.error(e.message),
  });
  const deleteStructure = trpc.payroll.structures.delete.useMutation({
    onSuccess: () => { utils.payroll.structures.list.invalidate(); toast.success("Structure deleted"); },
    onError: (e) => toast.error(e.message),
  });

  // ── Components ──────────────────────────────────────────────────────────────
  const { data: components = [], isLoading: loadingComponents } = trpc.payroll.components.list.useQuery({ companyId: COMPANY_ID });
  const [componentDialog, setComponentDialog] = useState<{ open: boolean; editing: (typeof components)[0] | null }>({ open: false, editing: null });
  const [componentForm, setComponentForm] = useState<ComponentForm>(defaultComponent);

  const createComponent = trpc.payroll.components.create.useMutation({
    onSuccess: () => { utils.payroll.components.list.invalidate(); toast.success("Component created"); setComponentDialog({ open: false, editing: null }); },
    onError: (e) => toast.error(e.message),
  });
  const updateComponent = trpc.payroll.components.update.useMutation({
    onSuccess: () => { utils.payroll.components.list.invalidate(); toast.success("Component updated"); setComponentDialog({ open: false, editing: null }); },
    onError: (e) => toast.error(e.message),
  });
  const deleteComponent = trpc.payroll.components.delete.useMutation({
    onSuccess: () => { utils.payroll.components.list.invalidate(); toast.success("Component deleted"); },
    onError: (e) => toast.error(e.message),
  });

  // ── Structure components (mapping) ──────────────────────────────────────────
  const { data: structureComponents = [] } = trpc.payroll.structures.getComponents.useQuery(
    { structureId: selectedStructureId! },
    { enabled: !!selectedStructureId }
  );
  const addToStructure = trpc.payroll.structures.addComponent.useMutation({
    onSuccess: () => { utils.payroll.structures.getComponents.invalidate(); toast.success("Component added to structure"); },
    onError: (e) => toast.error(e.message),
  });
  const removeFromStructure = trpc.payroll.structures.removeComponent.useMutation({
    onSuccess: () => { utils.payroll.structures.getComponents.invalidate(); toast.success("Component removed"); },
    onError: (e) => toast.error(e.message),
  });

  const typeColor: Record<string, string> = {
    earning: "bg-emerald-100 text-emerald-800",
    deduction: "bg-red-100 text-red-800",
    tax: "bg-amber-100 text-amber-800",
    pf: "bg-blue-100 text-blue-800",
  };

  const openStructureDialog = (editing: (typeof structures)[0] | null) => {
    setStructureForm(editing ? { name: editing.name, currency: editing.currency, description: editing.description ?? "", isActive: editing.isActive } : defaultStructure);
    setStructureDialog({ open: true, editing });
  };

  const openComponentDialog = (editing: (typeof components)[0] | null) => {
    setComponentForm(editing ? {
      name: editing.name, code: editing.code, type: editing.type as ComponentForm["type"],
      calculationType: editing.calculationType as ComponentForm["calculationType"],
      value: editing.value, isTaxable: editing.isTaxable, isPFApplicable: editing.isPFApplicable,
      isActive: editing.isActive, sortOrder: editing.sortOrder,
    } : defaultComponent);
    setComponentDialog({ open: true, editing });
  };

  const handleSaveStructure = () => {
    if (!structureForm.name.trim()) return toast.error("Name is required");
    if (structureDialog.editing) {
      updateStructure.mutate({ id: structureDialog.editing.id, ...structureForm });
    } else {
      createStructure.mutate({ companyId: COMPANY_ID, ...structureForm });
    }
  };

  const handleSaveComponent = () => {
    if (!componentForm.name.trim() || !componentForm.code.trim()) return toast.error("Name and code are required");
    if (componentDialog.editing) {
      updateComponent.mutate({ id: componentDialog.editing.id, ...componentForm });
    } else {
      createComponent.mutate({ companyId: COMPANY_ID, ...componentForm });
    }
  };

  const selectedStructure = structures.find((s) => s.id === selectedStructureId);
  const assignedIds = new Set(structureComponents.map((sc) => sc.componentId));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salary Structures</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure salary structures and reusable components (allowances, deductions, taxes)</p>
        </div>
      </div>

      <Tabs defaultValue="structures">
        <TabsList>
          <TabsTrigger value="structures"><Layers className="w-4 h-4 mr-2" />Structures ({structures.length})</TabsTrigger>
          <TabsTrigger value="components"><Package className="w-4 h-4 mr-2" />Components ({components.length})</TabsTrigger>
          {selectedStructureId && (
            <TabsTrigger value="mapping">
              <ChevronRight className="w-4 h-4 mr-2" />
              {selectedStructure?.name} — Components
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── STRUCTURES TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="structures">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Salary Structures</CardTitle>
              <Button size="sm" onClick={() => openStructureDialog(null)}>
                <Plus className="w-4 h-4 mr-2" />New Structure
              </Button>
            </CardHeader>
            <CardContent>
              {loadingStructures ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : structures.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No salary structures yet. Create your first one.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {structures.map((s) => (
                      <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedStructureId(s.id)}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.currency}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.description ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openStructureDialog(s); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteStructure.mutate({ id: s.id }); }}>
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

        {/* ── COMPONENTS TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="components">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Salary Components</CardTitle>
              <Button size="sm" onClick={() => openComponentDialog(null)}>
                <Plus className="w-4 h-4 mr-2" />New Component
              </Button>
            </CardHeader>
            <CardContent>
              {loadingComponents ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Calculation</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Taxable</TableHead>
                      <TableHead>PF</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {components.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{c.code}</code></TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[c.type] ?? ""}`}>{c.type}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.calculationType.replace(/_/g, " ")}</TableCell>
                        <TableCell>{c.value}</TableCell>
                        <TableCell>{c.isTaxable ? "Yes" : "No"}</TableCell>
                        <TableCell>{c.isPFApplicable ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => openComponentDialog(c)}><Edit className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteComponent.mutate({ id: c.id })}><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STRUCTURE-COMPONENTS MAPPING TAB ───────────────────────────────── */}
        {selectedStructureId && (
          <TabsContent value="mapping">
            <Card>
              <CardHeader>
                <CardTitle>Components in "{selectedStructure?.name}"</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Assigned components */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Override Value</TableHead>
                      <TableHead className="text-right">Remove</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {structureComponents.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No components assigned yet.</TableCell></TableRow>
                    ) : structureComponents.map((sc) => (
                      <TableRow key={sc.id}>
                        <TableCell className="font-medium">{sc.componentName}</TableCell>
                        <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[sc.componentType] ?? ""}`}>{sc.componentType}</span></TableCell>
                        <TableCell>{sc.overrideValue ?? <span className="text-muted-foreground text-sm">Default ({sc.defaultValue})</span>}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeFromStructure.mutate({ id: sc.id })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Add component */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Add component to structure</p>
                  <div className="flex gap-2 flex-wrap">
                    {components.filter((c) => !assignedIds.has(c.id)).map((c) => (
                      <Button key={c.id} size="sm" variant="outline" onClick={() => addToStructure.mutate({ structureId: selectedStructureId, componentId: c.id })}>
                        <Plus className="w-3 h-3 mr-1" />{c.name}
                      </Button>
                    ))}
                    {components.filter((c) => !assignedIds.has(c.id)).length === 0 && (
                      <p className="text-sm text-muted-foreground">All components are already assigned.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── STRUCTURE DIALOG ─────────────────────────────────────────────────── */}
      <Dialog open={structureDialog.open} onOpenChange={(o) => setStructureDialog({ open: o, editing: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{structureDialog.editing ? "Edit" : "New"} Salary Structure</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={structureForm.name} onChange={(e) => setStructureForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard UAE Package" /></div>
            <div><Label>Currency</Label>
              <Select value={structureForm.currency} onValueChange={(v) => setStructureForm((f) => ({ ...f, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["AED", "USD", "EUR", "GBP", "SAR", "QAR", "KWD", "BHD", "OMR", "INR", "PKR"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={structureForm.description} onChange={(e) => setStructureForm((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="flex items-center gap-2"><Switch checked={structureForm.isActive} onCheckedChange={(v) => setStructureForm((f) => ({ ...f, isActive: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStructureDialog({ open: false, editing: null })}>Cancel</Button>
            <Button onClick={handleSaveStructure} disabled={createStructure.isPending || updateStructure.isPending}>
              {createStructure.isPending || updateStructure.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── COMPONENT DIALOG ─────────────────────────────────────────────────── */}
      <Dialog open={componentDialog.open} onOpenChange={(o) => setComponentDialog({ open: o, editing: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{componentDialog.editing ? "Edit" : "New"} Salary Component</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Name *</Label><Input value={componentForm.name} onChange={(e) => setComponentForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Housing Allowance" /></div>
            <div><Label>Code *</Label><Input value={componentForm.code} onChange={(e) => setComponentForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. HRA" /></div>
            <div><Label>Type</Label>
              <Select value={componentForm.type} onValueChange={(v) => setComponentForm((f) => ({ ...f, type: v as ComponentForm["type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="earning">Earning</SelectItem>
                  <SelectItem value="deduction">Deduction</SelectItem>
                  <SelectItem value="tax">Tax</SelectItem>
                  <SelectItem value="pf">PF / Provident Fund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Calculation Type</Label>
              <Select value={componentForm.calculationType} onValueChange={(v) => setComponentForm((f) => ({ ...f, calculationType: v as ComponentForm["calculationType"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage_of_basic">% of Basic</SelectItem>
                  <SelectItem value="percentage_of_gross">% of Gross</SelectItem>
                  <SelectItem value="formula">Formula</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Value</Label><Input value={componentForm.value} onChange={(e) => setComponentForm((f) => ({ ...f, value: e.target.value }))} placeholder="0" /></div>
            <div><Label>Sort Order</Label><Input type="number" value={componentForm.sortOrder} onChange={(e) => setComponentForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={componentForm.isTaxable} onCheckedChange={(v) => setComponentForm((f) => ({ ...f, isTaxable: v }))} /><Label>Taxable</Label></div>
            <div className="flex items-center gap-2"><Switch checked={componentForm.isPFApplicable} onCheckedChange={(v) => setComponentForm((f) => ({ ...f, isPFApplicable: v }))} /><Label>PF Applicable</Label></div>
            <div className="flex items-center gap-2"><Switch checked={componentForm.isActive} onCheckedChange={(v) => setComponentForm((f) => ({ ...f, isActive: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComponentDialog({ open: false, editing: null })}>Cancel</Button>
            <Button onClick={handleSaveComponent} disabled={createComponent.isPending || updateComponent.isPending}>
              {createComponent.isPending || updateComponent.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
