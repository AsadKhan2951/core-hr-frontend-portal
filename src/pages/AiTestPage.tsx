/**
 * client/src/pages/AiTestPage.tsx
 *
 * Interactive test harness for the shared AI service layer.
 * Lets you exercise all five methods (generateText, summarize, classify,
 * extractData, callWithFunctions) directly from the browser.
 *
 * Accessible at /ai-test (protected — requires auth).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Cpu, Zap, FileText, Tag, Wrench, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// ─── Status banner ────────────────────────────────────────────────────────────

function AiStatusBanner() {
  const { data, isLoading, error } = trpc.ai.status.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading AI service status…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Could not reach AI service
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/40">
      <div className="flex items-center gap-2">
        <Cpu className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Provider:</span>
        <Badge variant="secondary">{data.provider}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Model:</span>
        <Badge variant="outline">{data.defaultModel}</Badge>
      </div>
      <div className="flex items-center gap-2">
        {data.isMock ? (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">Mock Mode</Badge>
        ) : (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Live
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-muted-foreground">
          {data.availableTools.length} tools registered
        </span>
      </div>
    </div>
  );
}

// ─── Result display ───────────────────────────────────────────────────────────

function ResultBox({
  label,
  value,
  isMock,
}: {
  label: string;
  value: unknown;
  isMock?: boolean;
}) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <div className="mt-4 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {isMock && (
          <Badge variant="outline" className="text-xs">
            mock
          </Badge>
        )}
      </div>
      <pre className="text-sm bg-muted rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">
        {text}
      </pre>
    </div>
  );
}

// ─── Tab: Generate Text ───────────────────────────────────────────────────────

function GenerateTextTab() {
  const [prompt, setPrompt] = useState(
    "Write a short welcome message for a new HR manager joining the team."
  );
  const mutation = trpc.ai.generateText.useMutation({
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Open-ended text generation. Provide any prompt and the AI will respond.
      </p>
      <Textarea
        rows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt…"
      />
      <Button
        onClick={() => mutation.mutate({ prompt })}
        disabled={mutation.isPending || !prompt.trim()}
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Generate
      </Button>
      {mutation.data && (
        <ResultBox
          label="Response"
          value={mutation.data.text}
          isMock={mutation.data.isMock}
        />
      )}
    </div>
  );
}

// ─── Tab: Summarize ───────────────────────────────────────────────────────────

function SummarizeTab() {
  const [text, setText] = useState(
    "The annual leave policy at Rad Technologies allows employees to accrue 2.5 days of paid leave per month, up to a maximum of 30 days per year. Unused leave can be carried forward to the next year, subject to a cap of 15 days. Employees must submit leave requests at least 3 working days in advance through the CORE HR portal. Emergency leave of up to 3 days per year is available for immediate family situations and requires manager approval within 24 hours."
  );
  const [maxSentences, setMaxSentences] = useState(3);
  const mutation = trpc.ai.summarize.useMutation({
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Condense a long document into a concise summary.
      </p>
      <Textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste document text here…"
      />
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Max sentences:</label>
        <Input
          type="number"
          min={1}
          max={20}
          value={maxSentences}
          onChange={(e) => setMaxSentences(Number(e.target.value))}
          className="w-20"
        />
        <Button
          onClick={() => mutation.mutate({ text, maxSentences })}
          disabled={mutation.isPending || !text.trim()}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Summarize
        </Button>
      </div>
      {mutation.data && (
        <ResultBox
          label="Summary"
          value={mutation.data.summary}
          isMock={mutation.data.isMock}
        />
      )}
    </div>
  );
}

// ─── Tab: Classify ────────────────────────────────────────────────────────────

function ClassifyTab() {
  const [text, setText] = useState("I need to take 3 days off next week for a family event.");
  const [labelsRaw, setLabelsRaw] = useState("leave_request, expense_claim, general_inquiry, policy_question");
  const mutation = trpc.ai.classify.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const labels = labelsRaw
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Assign one or more labels to a piece of text.
      </p>
      <Textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Text to classify…"
      />
      <div>
        <label className="text-sm font-medium block mb-1">Labels (comma-separated)</label>
        <Input
          value={labelsRaw}
          onChange={(e) => setLabelsRaw(e.target.value)}
          placeholder="label_one, label_two, …"
        />
      </div>
      <Button
        onClick={() => mutation.mutate({ text, labels })}
        disabled={mutation.isPending || !text.trim() || labels.length < 2}
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Classify
      </Button>
      {mutation.data && (
        <ResultBox label="Classification result" value={mutation.data} />
      )}
    </div>
  );
}

// ─── Tab: Extract Data ────────────────────────────────────────────────────────

function ExtractDataTab() {
  const [docText, setDocText] = useState(
    "Employee Name: Sarah Johnson\nDepartment: Product Management\nDesignation: Senior Product Manager\nStart Date: March 15, 2023\nAnnual Salary: AED 180,000\nManager: Ahmed Al-Rashid"
  );
  const mutation = trpc.ai.extractData.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const schema = {
    fields: {
      employeeName: { description: "Full name of the employee", type: "string" as const },
      department: { description: "Department name", type: "string" as const },
      designation: { description: "Job title or designation", type: "string" as const },
      startDate: { description: "Employment start date", type: "date" as const },
      annualSalary: { description: "Annual salary amount", type: "number" as const },
      managerName: { description: "Name of the reporting manager", type: "string" as const },
    },
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Extract typed fields from a document (offer letter, form scan, email, etc.).
      </p>
      <Textarea
        rows={6}
        value={docText}
        onChange={(e) => setDocText(e.target.value)}
        placeholder="Paste document text here…"
      />
      <div className="p-3 rounded-md border bg-muted/40 text-xs font-mono">
        <p className="font-semibold mb-1 text-sm font-sans">Extraction schema (fixed for demo):</p>
        {Object.entries(schema.fields).map(([k, v]) => (
          <div key={k}>
            <span className="text-primary">{k}</span>:{" "}
            <span className="text-muted-foreground">{v.type}</span> — {v.description}
          </div>
        ))}
      </div>
      <Button
        onClick={() => mutation.mutate({ documentText: docText, schema })}
        disabled={mutation.isPending || !docText.trim()}
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Extract
      </Button>
      {mutation.data && (
        <ResultBox label="Extracted data" value={mutation.data} />
      )}
    </div>
  );
}

// ─── Tab: Function Calling ────────────────────────────────────────────────────

function FunctionCallingTab() {
  const { data: statusData } = trpc.ai.status.useQuery();
  const [prompt, setPrompt] = useState(
    "List the departments for company 1 and tell me how many there are."
  );
  const [selectedTools, setSelectedTools] = useState<string[]>([
    "list_departments",
    "list_employees",
  ]);
  const mutation = trpc.ai.callWithFunctions.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const toggleTool = (name: string) => {
    setSelectedTools((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Agentic loop: the model can call registered CORE HR tools to answer your prompt.
        Select which tools to enable for this request.
      </p>
      {statusData && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Available tools:</p>
          <div className="flex flex-wrap gap-2">
            {statusData.availableTools.map((t) => (
              <button
                key={t.name}
                onClick={() => toggleTool(t.name)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  selectedTools.includes(t.name)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
                title={t.description}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <Textarea
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask the AI to perform an action using CORE HR data…"
      />
      <Button
        onClick={() =>
          mutation.mutate({ prompt, toolNames: selectedTools, maxIterations: 5 })
        }
        disabled={mutation.isPending || !prompt.trim()}
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Run with Tools
      </Button>
      {mutation.data && (
        <div className="space-y-3">
          <ResultBox
            label="Final answer"
            value={mutation.data.text || "(model returned tool results only)"}
            isMock={mutation.data.isMock}
          />
          {mutation.data.toolResults.length > 0 && (
            <ResultBox
              label={`Tool calls (${mutation.data.toolResults.length})`}
              value={mutation.data.toolResults}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiTestPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Service — Test Harness</h1>
        <p className="text-muted-foreground mt-1">
          Shared AI service layer. All modules will import from{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">server/ai</code>.
          No module-specific features yet — this is the reusable foundation.
        </p>
      </div>

      <AiStatusBanner />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Service Methods
          </CardTitle>
          <CardDescription>
            Five core methods available to all CORE HR modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="generate">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="generate" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="summarize" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Summarize
              </TabsTrigger>
              <TabsTrigger value="classify" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                Classify
              </TabsTrigger>
              <TabsTrigger value="extract" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Extract
              </TabsTrigger>
              <TabsTrigger value="functions" className="text-xs">
                <Wrench className="h-3 w-3 mr-1" />
                Tools
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="generate">
                <GenerateTextTab />
              </TabsContent>
              <TabsContent value="summarize">
                <SummarizeTab />
              </TabsContent>
              <TabsContent value="classify">
                <ClassifyTab />
              </TabsContent>
              <TabsContent value="extract">
                <ExtractDataTab />
              </TabsContent>
              <TabsContent value="functions">
                <FunctionCallingTab />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
