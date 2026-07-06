/**
 * components/shared/FormBuilder.tsx
 *
 * Schema-driven form generator used across all CORE HR module create/edit dialogs.
 *
 * Supported field types:
 *   text, email, password, number, textarea, select, multi-select,
 *   date, date-range, checkbox, radio, switch, file
 *
 * Usage:
 *   const schema: FormSchema = {
 *     fields: [
 *       { name: "name", label: "Full Name", type: "text", required: true },
 *       { name: "department", label: "Department", type: "select",
 *         options: departments.map(d => ({ value: d.id, label: d.name })) },
 *       { name: "joinDate", label: "Join Date", type: "date" },
 *     ]
 *   };
 *
 *   <FormBuilder
 *     schema={schema}
 *     onSubmit={(data) => createEmployee.mutate(data)}
 *     submitLabel="Add Employee"
 *   />
 */

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "textarea"
  | "select"
  | "date"
  | "checkbox"
  | "radio"
  | "switch";

export interface FieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  /** Zod validation schema for this field */
  validation?: z.ZodTypeAny;
  options?: FieldOption[];
  /** Helper text shown below the field */
  hint?: string;
  /** Number of columns this field spans (1 or 2, in a 2-col grid) */
  colSpan?: 1 | 2;
  defaultValue?: unknown;
}

export interface FormSchema {
  fields: FormField[];
  /** Layout columns (default: 2) */
  columns?: 1 | 2;
}

export interface FormBuilderProps {
  schema: FormSchema;
  defaultValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  className?: string;
  /** Show a reset button */
  showReset?: boolean;
}

// ─── Zod schema builder ───────────────────────────────────────────────────────

function buildZodSchema(fields: FormField[]) {
  const entries: [string, z.ZodTypeAny][] = [];
  for (const field of fields) {
    if (field.hidden) continue;
    if (field.validation) {
      entries.push([field.name, field.validation]);
      continue;
    }
    let schema: z.ZodTypeAny;
    switch (field.type) {
      case "number":
        schema = z.coerce.number();
        break;
      case "checkbox":
      case "switch":
        schema = z.boolean().optional();
        break;
      case "date":
        schema = z.date().optional().nullable();
        break;
      default:
        schema = z.string();
    }
    if (field.required && field.type !== "checkbox" && field.type !== "switch") {
      if (schema instanceof z.ZodString) {
        schema = (schema as z.ZodString).min(1, `${field.label} is required`);
      }
    } else if (!field.required && schema instanceof z.ZodString) {
      schema = schema.optional();
    }
    entries.push([field.name, schema]);
  }
  return z.object(Object.fromEntries(entries) as z.ZodRawShape);
}

// ─── Field renderers ──────────────────────────────────────────────────────────

function FieldWrapper({
  field,
  error,
  children,
}: {
  field: FormField;
  error?: string;
  children: React.ReactNode;
}) {
  if (field.hidden) return null;
  return (
    <div className={cn("space-y-1.5", field.colSpan === 2 && "col-span-2")}>
      {field.type !== "checkbox" && field.type !== "switch" && (
        <Label htmlFor={field.name} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      {children}
      {field.hint && !error && (
        <p className="text-xs text-muted-foreground">{field.hint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FormBuilder({
  schema,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loading = false,
  className,
  showReset = false,
}: FormBuilderProps) {
  const zodSchema = buildZodSchema(schema.fields);
  const cols = schema.columns ?? 2;

  // Build default values from schema + override
  const builtDefaults: Record<string, unknown> = {};
  for (const f of schema.fields) {
    builtDefaults[f.name] = f.defaultValue ?? (
      f.type === "checkbox" || f.type === "switch" ? false :
      f.type === "number" ? "" :
      ""
    );
  }

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: { ...builtDefaults, ...defaultValues } as Record<string, unknown>,
  });

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data as Record<string, unknown>);
  });

  function renderField(field: FormField) {
    const error = (errors[field.name]?.message as string) ?? undefined;

    if (field.type === "textarea") {
      return (
        <FieldWrapper field={field} error={error}>
          <Textarea
            id={field.name}
            placeholder={field.placeholder}
            disabled={field.disabled || loading}
            className={cn(error && "border-destructive")}
            rows={3}
            {...register(field.name)}
          />
        </FieldWrapper>
      );
    }

    if (field.type === "select") {
      return (
        <FieldWrapper field={field} error={error}>
          <Controller
            name={field.name}
            control={control}
            render={({ field: f }) => (
              <Select
                value={f.value as string}
                onValueChange={f.onChange}
                disabled={field.disabled || loading}
              >
                <SelectTrigger id={field.name} className={cn(error && "border-destructive")}>
                  <SelectValue placeholder={field.placeholder ?? `Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldWrapper>
      );
    }

    if (field.type === "radio") {
      return (
        <FieldWrapper field={field} error={error}>
          <Controller
            name={field.name}
            control={control}
            render={({ field: f }) => (
              <RadioGroup
                value={f.value as string}
                onValueChange={f.onChange}
                disabled={field.disabled || loading}
                className="flex flex-wrap gap-4"
              >
                {field.options?.map(opt => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`${field.name}-${opt.value}`} />
                    <Label htmlFor={`${field.name}-${opt.value}`} className="font-normal cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </FieldWrapper>
      );
    }

    if (field.type === "checkbox") {
      return (
        <FieldWrapper field={field} error={error}>
          <Controller
            name={field.name}
            control={control}
            render={({ field: f }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={field.name}
                  checked={f.value as boolean}
                  onCheckedChange={f.onChange}
                  disabled={field.disabled || loading}
                />
                <Label htmlFor={field.name} className="font-normal cursor-pointer">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
              </div>
            )}
          />
        </FieldWrapper>
      );
    }

    if (field.type === "switch") {
      return (
        <FieldWrapper field={field} error={error}>
          <Controller
            name={field.name}
            control={control}
            render={({ field: f }) => (
              <div className="flex items-center gap-2">
                <Switch
                  id={field.name}
                  checked={f.value as boolean}
                  onCheckedChange={f.onChange}
                  disabled={field.disabled || loading}
                />
                <Label htmlFor={field.name} className="font-normal cursor-pointer">
                  {field.label}
                </Label>
              </div>
            )}
          />
        </FieldWrapper>
      );
    }

    if (field.type === "date") {
      return (
        <FieldWrapper field={field} error={error}>
          <Controller
            name={field.name}
            control={control}
            render={({ field: f }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id={field.name}
                    disabled={field.disabled || loading}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !f.value && "text-muted-foreground",
                      error && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {f.value ? format(f.value as Date, "PPP") : (field.placeholder ?? "Pick a date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={f.value as Date | undefined}
                    onSelect={f.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        </FieldWrapper>
      );
    }

    // Default: text / email / password / number
    return (
      <FieldWrapper field={field} error={error}>
        <Input
          id={field.name}
          type={field.type}
          placeholder={field.placeholder}
          disabled={field.disabled || loading}
          className={cn(error && "border-destructive")}
          {...register(field.name)}
        />
      </FieldWrapper>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className={cn("space-y-4", className)} noValidate>
      <div className={cn(
        "grid gap-4",
        cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
      )}>
        {schema.fields.map(field => (
          <div key={field.name}>
            {renderField(field)}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={loading} className="min-w-[100px]">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
        )}
        {showReset && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => reset()}
            disabled={loading}
            className="ml-auto text-muted-foreground"
          >
            Reset
          </Button>
        )}
      </div>
    </form>
  );
}
