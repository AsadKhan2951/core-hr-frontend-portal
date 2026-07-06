import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3, TrendingUp, Clock, Users, Send, Activity } from "lucide-react";
import * as XLSX from "xlsx";

const TABS = [
  { id: "pipeline", label: "Pipeline Summary", icon: BarChart3 },
  { id: "timeToHire", label: "Time to Hire", icon: Clock },
  { id: "sourceAnalysis", label: "Source Analysis", icon: TrendingUp },
  { id: "stageConversion", label: "Stage Conversion", icon: Activity },
  { id: "offerAcceptance", label: "Offer Acceptance", icon: Send },
  { id: "activities", label: "Activity Log", icon: Users },
] as const;

type TabId = typeof TABS[number]["id"];

export default function RecruitmentReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("pipeline");
  const [filterJobId, setFilterJobId] = useState("");

  const { data: pipelineData = [] } = trpc.recruitment.reports.pipeline.useQuery({ jobPostingId: filterJobId ? parseInt(filterJobId) : undefined });
  const { data: timeToHireData = [] } = trpc.recruitment.reports.timeToHire.useQuery();
  const { data: sourceData = [] } = trpc.recruitment.reports.sourceAnalysis.useQuery();
  const { data: stageConversionData = [] } = trpc.recruitment.reports.stageConversion.useQuery({ jobPostingId: filterJobId ? parseInt(filterJobId) : undefined });
  const { data: offerData } = trpc.recruitment.reports.offerAcceptance.useQuery();
  const { data: activitiesData = [] } = trpc.recruitment.reports.activities.useQuery({});

  const exportToExcel = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case "pipeline": return pipelineData as any[];
      case "timeToHire": return timeToHireData as any[];
      case "sourceAnalysis": return sourceData as any[];
      case "stageConversion": return stageConversionData as any[];
      case "offerAcceptance": return offerData ? [offerData] : [];
      case "activities": return activitiesData as any[];
      default: return [];
    }
  };

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return (
      <div className="text-center py-16 text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No data available for this report.</p>
      </div>
    );
    const cols = Object.keys(data[0]);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {cols.map(c => (
                <th key={c} className="text-left px-3 py-2 font-medium text-muted-foreground capitalize">
                  {c.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                {cols.map(c => (
                  <td key={c} className="px-3 py-2">
                    {row[c] instanceof Date ? new Date(row[c]).toLocaleDateString() :
                     typeof row[c] === "boolean" ? (row[c] ? "Yes" : "No") :
                     row[c] == null ? "—" : String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recruitment Reports</h1>
          <p className="text-muted-foreground text-sm">Pipeline analytics, source effectiveness, time-to-hire, and more</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => exportToExcel(getCurrentData(), activeTab)}>
          <Download className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-gray-100 text-muted-foreground hover:bg-gray-200"}`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Job Filter for pipeline/conversion reports */}
      {(activeTab === "pipeline" || activeTab === "stageConversion") && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter by Job ID:</span>
          <input type="number" value={filterJobId} onChange={e => setFilterJobId(e.target.value)}
            placeholder="All jobs" className="border rounded px-2 py-1 text-sm w-32" />
        </div>
      )}

      {/* Report Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {(() => { const t = TABS.find(t => t.id === activeTab); return t ? <><t.icon className="w-4 h-4" />{t.label}</> : null; })()}
            <Badge variant="secondary" className="ml-auto">{getCurrentData().length} rows</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === "offerAcceptance" && offerData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
              {[
                { label: "Total Offers", value: (offerData as any).total, color: "text-blue-600" },
                { label: "Accepted", value: (offerData as any).accepted, color: "text-green-600" },
                { label: "Rejected", value: (offerData as any).rejected, color: "text-red-600" },
                { label: "Acceptance Rate", value: `${(offerData as any).acceptanceRate}%`, color: "text-purple-600" },
              ].map(s => (
                <div key={s.label} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          ) : renderTable(getCurrentData())}
        </CardContent>
      </Card>
    </div>
  );
}
