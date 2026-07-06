import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Sparkles, Send, RotateCcw, Info, BarChart3, Table2 } from "lucide-react";

const EXAMPLE_QUERIES = [
  "How many employees are in each department?",
  "What is the gender distribution across the company?",
  "Which department has the highest headcount?",
  "How many employees joined this year?",
  "What is the breakdown of employment types?",
  "Show me employees on probation",
];

type ChartDataPoint = Record<string, string | number>;
type TableRow = Record<string, string | number | null>;

type QueryResult = {
  answer: string;
  chartData?: ChartDataPoint[];
  chartType?: "bar" | "line" | "pie" | "area";
  chartXKey?: string;
  chartSeries?: Array<{ key: string; label: string; color: string }>;
  tableData?: TableRow[];
  tableColumns?: Array<{ key: string; header: string }>;
  confidence?: number;
};

export default function WorkforceQueryPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<Array<{ query: string; result: QueryResult }>>([]);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  const nlQuery = trpc.employees.ai.queryWorkforce.useMutation({
    onSuccess: (data: unknown) => {
      const r = data as QueryResult;
      setResult(r);
      setHistory(prev => [{ query, result: r }, ...prev.slice(0, 9)]);
    },
    onError: () => toast.error("Query failed — please try again"),
  });

  const handleSubmit = () => {
    if (!query.trim()) return;
    nlQuery.mutate({ question: query.trim(), companyId: 1 });
  };

  const handleExample = (q: string) => {
    setQuery(q);
  };

  const tableCols: ColumnDef<TableRow>[] = (result?.tableColumns ?? []).map(col => ({
    key: col.key,
    header: col.header,
    sortable: true,
    render: (row) => <span className="text-sm">{String(row[col.key] ?? "—")}</span>,
  }));

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h1 className="text-2xl font-bold tracking-tight">Workforce Query</h1>
          <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
            AI-Powered
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Ask any question about your workforce in plain English. AI generates the answer and a chart.
        </p>
      </div>

      {/* AI disclaimer */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          <strong>AI-generated insight</strong> — Results are based on your current workforce data and may require human review before use in official reports.
        </span>
      </div>

      {/* Query input */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <Textarea
            placeholder="e.g. How many employees are in each department?"
            value={query}
            onChange={e => setQuery(e.target.value)}
            rows={3}
            className="resize-none text-sm"
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
          />
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_QUERIES.map(q => (
                <button
                  key={q}
                  onClick={() => handleExample(q)}
                  className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!query.trim() || nlQuery.isPending}
              size="sm"
              className="ml-3 flex-shrink-0"
            >
              {nlQuery.isPending ? (
                <><Sparkles className="w-3.5 h-3.5 mr-1.5 animate-pulse" />Thinking…</>
              ) : (
                <><Send className="w-3.5 h-3.5 mr-1.5" />Ask</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {nlQuery.isPending && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <Skeleton className="h-5 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-48 rounded-xl mt-4" />
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && !nlQuery.isPending && (
        <Card className="border-indigo-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <div>
                  <CardTitle className="text-sm font-medium text-foreground leading-relaxed">
                    {result.answer}
                  </CardTitle>
                  {result.confidence != null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Confidence: {Math.round(result.confidence * 100)}%
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {result.chartData && (
                  <Button
                    variant={viewMode === "chart" ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setViewMode("chart")}
                  >
                    <BarChart3 className="w-3 h-3 mr-1" />Chart
                  </Button>
                )}
                {result.tableData && (
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setViewMode("table")}
                  >
                    <Table2 className="w-3 h-3 mr-1" />Table
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => { setResult(null); setQuery(""); }}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          {(result.chartData || result.tableData) && (
            <CardContent>
              {viewMode === "chart" && result.chartData && result.chartSeries && (
                <ChartCard
                  title=""
                  type={result.chartType ?? "bar"}
                  data={result.chartData}
                  xKey={result.chartXKey ?? "name"}
                  series={result.chartSeries}
                  height={280}
                />
              )}
              {viewMode === "table" && result.tableData && tableCols.length > 0 && (
                <DataTable<TableRow>
                  columns={tableCols}
                  data={result.tableData}
                  exportFilename="workforce_query_result"
                />
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Query history */}
      {history.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Previous queries</h3>
          {history.slice(1).map((h, i) => (
            <button
              key={i}
              onClick={() => { setQuery(h.query); setResult(h.result); }}
              className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="text-sm font-medium text-foreground truncate">{h.query}</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{h.result.answer}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
