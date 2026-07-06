/**
 * AIAssistantPanel.tsx
 *
 * Global AI Assistant — slide-in drawer available from the topbar.
 *
 * Features:
 * - Conversational chat with markdown rendering
 * - Voice input via Web Speech API (browser-native, no external dependency)
 * - Permission-aware: only shows actions the user can perform
 * - Confirmation dialog before any write action (create/update/delete)
 * - Action preview cards showing what the assistant is about to do
 * - Suggested prompts based on user role
 * - Keyboard shortcut: Cmd/Ctrl+K to toggle
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Bot,
  Send,
  Mic,
  MicOff,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Streamdown } from "streamdown";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant" | "system";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  toolCallsMade?: Array<{ toolName: string; args: Record<string, unknown>; result: unknown }>;
  isActionResult?: boolean;
}

interface PendingConfirmation {
  toolName: string;
  args: Record<string, unknown>;
  description: string;
}

// ─── Web Speech API types ─────────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function formatToolName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── ToolCallBadge ────────────────────────────────────────────────────────────

function ToolCallBadge({ toolName }: { toolName: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5 font-mono">
      <Sparkles className="w-3 h-3" />
      {formatToolName(toolName)}
    </span>
  );
}

// ─── ConfirmationDialog ───────────────────────────────────────────────────────

interface ConfirmationDialogProps {
  open: boolean;
  confirmation: PendingConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ConfirmationDialog({
  open,
  confirmation,
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmationDialogProps) {
  if (!confirmation) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Confirm Action
          </DialogTitle>
          <DialogDescription>
            The AI Assistant is about to perform the following action. Please review carefully before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {formatToolName(confirmation.toolName)}
            </Badge>
          </div>
          <p className="text-sm text-foreground">
            {confirmation.description.charAt(0).toUpperCase() + confirmation.description.slice(1)}
          </p>
          {Object.keys(confirmation.args).length > 0 && (
            <div className="mt-2 space-y-1">
              {Object.entries(confirmation.args).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="text-muted-foreground font-medium min-w-[80px]">{key}:</span>
                  <span className="text-foreground">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          This action will go through the normal approval workflow. It cannot be undone automatically.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executing…
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm & Execute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isActionResult = message.isActionResult;

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold",
          isUser
            ? "bg-primary text-primary-foreground"
            : isActionResult
            ? "bg-emerald-500 text-white"
            : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
        )}
      >
        {isUser ? "You" : isActionResult ? <CheckCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : isActionResult
            ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-tl-sm"
            : "bg-muted rounded-tl-sm"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <Streamdown>{message.content}</Streamdown>
          </div>
        )}

        {/* Tool calls used */}
        {message.toolCallsMade && message.toolCallsMade.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">Used:</span>
            {message.toolCallsMade.map((tc, i) => (
              <ToolCallBadge key={i} toolName={tc.toolName} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className={cn(
          "text-xs mt-1.5 opacity-60",
          isUser ? "text-right" : "text-left"
        )}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ─── SuggestedPrompts ─────────────────────────────────────────────────────────

interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

function SuggestedPrompts({ prompts, onSelect }: SuggestedPromptsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground text-center">Suggested questions</p>
      <div className="grid grid-cols-1 gap-2">
        {prompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelect(prompt)}
            className="text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-accent hover:border-primary/30 transition-all duration-150 flex items-center justify-between group"
          >
            <span className="text-foreground/80 group-hover:text-foreground">{prompt}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AIAssistantPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AIAssistantPanel({ open, onClose }: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // ─── tRPC ───────────────────────────────────────────────────────────────────

  const { data: suggestions } = trpc.assistant.getSuggestions.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  });

  const chatMutation = trpc.assistant.chat.useMutation();

  // ─── Speech Recognition setup ───────────────────────────────────────────────

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        if (final) {
          setInputValue(prev => prev + final);
          setInterimTranscript("");
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // ─── Auto-scroll ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (scrollAreaRef.current) {
      const el = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages, chatMutation.isPending]);

  // ─── Focus input when opened ─────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // ─── Keyboard shortcut ───────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ─── Voice toggle ─────────────────────────────────────────────────────────────

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  }, [isListening]);

  // ─── Send message ─────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (content: string, confirmedAction?: { toolName: string; args: Record<string, unknown> }) => {
    if (!content.trim() && !confirmedAction) return;

    // Stop voice if active
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    // Add user message to UI
    if (content.trim()) {
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
    }
    setInputValue("");
    setInterimTranscript("");

    // Build conversation history for the API
    const historyMessages = [
      ...messages.filter(m => m.role !== "system"),
      ...(content.trim() ? [{ role: "user" as const, content: content.trim() }] : []),
    ].map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const result = await chatMutation.mutateAsync({
        messages: historyMessages.length > 0 ? historyMessages : [{ role: "user", content: content.trim() }],
        confirmedAction,
      });

      if (result.type === "chat_response") {
        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: result.content,
          timestamp: new Date(),
          toolCallsMade: result.toolCallsMade,
        };
        setMessages(prev => [...prev, assistantMsg]);

        // If there's a pending confirmation, show the dialog
        if (result.pendingConfirmation) {
          setPendingConfirmation(result.pendingConfirmation);
          setShowConfirmDialog(true);
        }
      } else if (result.type === "action_result") {
        const actionMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: `**Action completed successfully.**\n\n${result.message}`,
          timestamp: new Date(),
          isActionResult: true,
        };
        setMessages(prev => [...prev, actionMsg]);
        setShowConfirmDialog(false);
        setPendingConfirmation(null);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: `I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  }, [messages, chatMutation, isListening]);

  // ─── Handle confirmation ──────────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!pendingConfirmation) return;
    await sendMessage("", {
      toolName: pendingConfirmation.toolName,
      args: pendingConfirmation.args,
    });
  }, [pendingConfirmation, sendMessage]);

  const handleCancelConfirmation = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingConfirmation(null);
    const cancelMsg: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content: "Action cancelled. Let me know if you'd like to do something else.",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, cancelMsg]);
  }, []);

  // ─── Handle key press ─────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // ─── Clear conversation ───────────────────────────────────────────────────────

  const clearConversation = () => {
    setMessages([]);
    setPendingConfirmation(null);
    setShowConfirmDialog(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  const isEmpty = messages.length === 0;
  const isLoading = chatMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:w-[480px] p-0 flex flex-col gap-0"
        >
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold leading-none">Flow AI Assistant</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Ask anything about your HR data</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={clearConversation}
                  title="Clear conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Messages area */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
            {isEmpty ? (
              <div className="space-y-6">
                {/* Welcome */}
                <div className="text-center space-y-2 pt-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-base">Hi, I'm Flow</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Your AI assistant for HR tasks. Ask me about leave balances, attendance, team info, and more.
                  </p>
                </div>

                {/* Suggested prompts */}
                {suggestions && suggestions.length > 0 && (
                  <SuggestedPrompts
                    prompts={suggestions}
                    onSelect={prompt => sendMessage(prompt)}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span className="text-xs text-muted-foreground">Thinking…</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input area */}
          <div className="border-t px-4 py-3 space-y-2">
            {/* Interim transcript preview */}
            {interimTranscript && (
              <div className="text-xs text-muted-foreground italic px-1 flex items-center gap-1.5">
                <Mic className="w-3 h-3 text-red-500 animate-pulse" />
                {interimTranscript}
              </div>
            )}

            {/* Pending confirmation banner */}
            {pendingConfirmation && !showConfirmDialog && (
              <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-amber-700 dark:text-amber-300 flex-1">
                  Action pending confirmation
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs px-2"
                  onClick={() => setShowConfirmDialog(true)}
                >
                  Review
                </Button>
              </div>
            )}

            <div className="flex gap-2 items-end">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening…" : "Ask me anything… (Enter to send)"}
                className={cn(
                  "flex-1 min-h-[44px] max-h-[120px] resize-none text-sm",
                  isListening && "border-red-400 focus-visible:ring-red-400"
                )}
                disabled={isLoading}
                rows={1}
              />

              {/* Voice button */}
              {speechSupported && (
                <Button
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  className="h-11 w-11 flex-shrink-0"
                  onClick={toggleVoice}
                  disabled={isLoading}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
              )}

              {/* Send button */}
              <Button
                size="icon"
                className="h-11 w-11 flex-shrink-0"
                onClick={() => sendMessage(inputValue)}
                disabled={isLoading || (!inputValue.trim() && !interimTranscript)}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {speechSupported ? "⌘K to close · Enter to send · Mic for voice" : "⌘K to close · Enter to send"}
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation dialog */}
      <ConfirmationDialog
        open={showConfirmDialog}
        confirmation={pendingConfirmation}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirmation}
        isLoading={isLoading}
      />
    </>
  );
}
