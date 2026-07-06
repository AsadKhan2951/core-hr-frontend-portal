/**
 * Shared HCM component library — barrel export.
 * Import from "@/components/shared" in any page or feature component.
 */

export { StatCard } from "./StatCard";
export type { StatCardProps, StatCardColor, StatCardTrend } from "./StatCard";

export { ChartCard } from "./ChartCard";
export type { ChartCardProps, ChartType, ChartSeries } from "./ChartCard";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps, EmptyStateAction } from "./EmptyState";

export { DataTable } from "./DataTable";
export type { DataTableProps, ColumnDef, FilterType } from "./DataTable";

export { FormBuilder } from "./FormBuilder";
export type { FormBuilderProps, FormSchema, FormField, FieldType, FieldOption } from "./FormBuilder";

export { FileUpload } from "./FileUpload";
export type { FileUploadProps, UploadedFile } from "./FileUpload";

export { ApprovalTimeline } from "./ApprovalTimeline";
export type { ApprovalTimelineProps, ApprovalStep, ApprovalStepStatus } from "./ApprovalTimeline";

export { StatusPill } from "./StatusPill";
export type { StatusPillProps, StatusVariant } from "./StatusPill";

export { PageHeader } from "./PageHeader";
export type { PageHeaderProps, BreadcrumbItem } from "./PageHeader";
