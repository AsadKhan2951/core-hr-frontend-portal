/**
 * components/shared/DataTable.tsx
 *
 * Fully-featured reusable data table used across all CORE HR list views.
 *
 * Features:
 *   - Column-level sorting (click header)
 *   - Global text search
 *   - Per-column filtering (string, enum, date-range)
 *   - Client-side pagination
 *   - Export to Excel (.xlsx) via the xlsx library
 *   - Row selection (checkbox)
 *   - Loading skeleton
 *   - Empty state
 *   - Configurable row actions slot
 *
 * Usage:
 *   const columns: ColumnDef<Employee>[] = [
 *     { key: "name", header: "Name", sortable: true, searchable: true },
 *     { key: "department", header: "Dept", filterable: true, filterType: "enum",
 *       filterOptions: ["Engineering", "HR"] },
 *     { key: "joinDate", header: "Joined", filterable: true, filterType: "date" },
 *     { key: "actions", header: "", render: (row) => <ActionsMenu row={row} /> },
 *   ];
 *   <DataTable columns={columns} data={employees} />
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Download,
  Filter,
  X,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import * as XLSX from "xlsx";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilterType = "text" | "enum" | "date";

export interface ColumnDef<T = Record<string, unknown>> {
  key: string;
  header: string;
  /** Custom render function. Receives the row object. */
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  /** Include this column in global text search */
  searchable?: boolean;
  filterable?: boolean;
  filterType?: FilterType;
  filterOptions?: string[];
  /** Width hint (Tailwind class, e.g. "w-40") */
  width?: string;
  /** Alignment */
  align?: "left" | "center" | "right";
  /** Exclude from Excel export */
  noExport?: boolean;
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Row key extractor */
  rowKey?: (row: T, index: number) => string | number;
  loading?: boolean;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  /** Enable row selection */
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  /** Table title shown above the toolbar */
  title?: string;
  /** Right-side toolbar slot (e.g. "Add" button) */
  toolbarAction?: React.ReactNode;
  /** Empty state icon */
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  /** Excel export filename (without extension) */
  exportFilename?: string;
  className?: string;
}

type SortDir = "asc" | "desc" | null;

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCellValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return format(value, "yyyy-MM-dd");
  return String(value);
}

function exportToExcel<T>(
  columns: ColumnDef<T>[],
  data: T[],
  filename: string
) {
  const exportCols = columns.filter(c => !c.noExport && c.key !== "actions");
  const headers = exportCols.map(c => c.header);
  const rows = data.map(row =>
    exportCols.map(c => cellToString(getCellValue(row, c.key)))
  );
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === "asc") return <ChevronUp className="h-3.5 w-3.5 text-primary" />;
  if (dir === "desc") return <ChevronDown className="h-3.5 w-3.5 text-primary" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
}

function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasValue = value.from || value.to;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-7 gap-1 text-xs", hasValue && "border-primary text-primary")}
        >
          <CalendarIcon className="h-3 w-3" />
          {value.from && value.to
            ? `${format(value.from, "MMM d")} – ${format(value.to, "MMM d")}`
            : value.from
            ? `From ${format(value.from, "MMM d")}`
            : "Date range"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: value.from, to: value.to }}
          onSelect={(range) =>
            onChange({ from: range?.from, to: range?.to })
          }
          numberOfMonths={2}
        />
        {hasValue && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => { onChange({ from: undefined, to: undefined }); setOpen(false); }}
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DataTable<T = Record<string, unknown>>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 8,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  selectable = false,
  onSelectionChange,
  title,
  toolbarAction,
  emptyIcon,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  emptyAction,
  exportFilename = "export",
  className,
}: DataTableProps<T>) {
  // ── State ──
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [dateFilters, setDateFilters] = useState<Record<string, DateRange>>({});
  const [showFilters, setShowFilters] = useState(false);

  const getKey = useCallback(
    (row: T, idx: number) => rowKey ? rowKey(row, idx) : idx,
    [rowKey]
  );

  // ── Filtering ──
  const filtered = useMemo(() => {
    let result = [...data];

    // Global search
    if (search.trim()) {
      const q = search.toLowerCase();
      const searchCols = columns.filter(c => c.searchable);
      result = result.filter(row =>
        searchCols.some(c =>
          cellToString(getCellValue(row, c.key)).toLowerCase().includes(q)
        )
      );
    }

    // Column filters
    for (const [key, val] of Object.entries(columnFilters)) {
      if (!val || val === "__all__") continue;
      result = result.filter(row =>
        cellToString(getCellValue(row, key)).toLowerCase().includes(val.toLowerCase())
      );
    }

    // Date range filters
    for (const [key, range] of Object.entries(dateFilters)) {
      if (!range.from && !range.to) continue;
      result = result.filter(row => {
        const raw = getCellValue(row, key);
        if (!raw) return false;
        let d: Date;
        try {
          d = raw instanceof Date ? raw : parseISO(String(raw));
        } catch {
          return false;
        }
        if (range.from && range.to) {
          return isWithinInterval(d, { start: startOfDay(range.from), end: endOfDay(range.to) });
        }
        if (range.from) return d >= startOfDay(range.from);
        if (range.to) return d <= endOfDay(range.to);
        return true;
      });
    }

    return result;
  }, [data, search, columns, columnFilters, dateFilters]);

  // ── Sorting ──
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = cellToString(getCellValue(a, sortKey));
      const bv = cellToString(getCellValue(b, sortKey));
      const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  // Reset page when filter/sort changes
  const resetPage = () => setPage(1);

  // ── Sort handler ──
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") { setSortDir("desc"); }
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
      else { setSortDir("asc"); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    resetPage();
  };

  // ── Selection ──
  const allPageKeys = paginated.map((r, i) => getKey(r, (page - 1) * pageSize + i));
  const allPageSelected = allPageKeys.length > 0 && allPageKeys.every(k => selected.has(k));
  const somePageSelected = allPageKeys.some(k => selected.has(k));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allPageSelected) {
      allPageKeys.forEach(k => next.delete(k));
    } else {
      allPageKeys.forEach(k => next.add(k));
    }
    setSelected(next);
    onSelectionChange?.(data.filter((r, i) => next.has(getKey(r, i))));
  };

  const toggleRow = (key: string | number) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
    onSelectionChange?.(data.filter((r, i) => next.has(getKey(r, i))));
  };

  // ── Active filter count ──
  const activeFilters =
    Object.values(columnFilters).filter(v => v && v !== "__all__").length +
    Object.values(dateFilters).filter(v => v.from || v.to).length;

  const clearAllFilters = () => {
    setColumnFilters({});
    setDateFilters({});
    setSearch("");
    resetPage();
  };

  // ── Filterable columns ──
  const filterableCols = columns.filter(c => c.filterable);

  return (
    <div className={cn("hcm-table-wrapper", className)}>
      {/* ── Toolbar ── */}
      <div className="table-toolbar">
        {title && (
          <span className="text-sm font-semibold text-foreground mr-2">{title}</span>
        )}

        {/* Search */}
        <div className="table-toolbar-search">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            placeholder="Search…"
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { setSearch(""); resetPage(); }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        {filterableCols.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 gap-1.5 text-xs", showFilters && "border-primary text-primary")}
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilters > 0 && (
              <Badge className="ml-0.5 h-4 px-1 text-[10px]">{activeFilters}</Badge>
            )}
          </Button>
        )}

        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearAllFilters}>
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => exportToExcel(columns, sorted, exportFilename)}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          {toolbarAction}
        </div>
      </div>

      {/* ── Filter row ── */}
      {showFilters && filterableCols.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b" style={{ background: "var(--bg-subtle)" }}>
          {filterableCols.map(col => {
            if (col.filterType === "date") {
              return (
                <div key={col.key} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{col.header}:</span>
                  <DateRangeFilter
                    value={dateFilters[col.key] ?? { from: undefined, to: undefined }}
                    onChange={v => {
                      setDateFilters(prev => ({ ...prev, [col.key]: v }));
                      resetPage();
                    }}
                  />
                </div>
              );
            }

            if (col.filterType === "enum" && col.filterOptions) {
              return (
                <div key={col.key} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{col.header}:</span>
                  <Select
                    value={columnFilters[col.key] ?? "__all__"}
                    onValueChange={v => {
                      setColumnFilters(prev => ({ ...prev, [col.key]: v }));
                      resetPage();
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All</SelectItem>
                      {col.filterOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            // text filter
            return (
              <div key={col.key} className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{col.header}:</span>
                <Input
                  value={columnFilters[col.key] ?? ""}
                  onChange={e => {
                    setColumnFilters(prev => ({ ...prev, [col.key]: e.target.value }));
                    resetPage();
                  }}
                  placeholder={`Filter ${col.header}…`}
                  className="h-7 text-xs w-36"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="hcm-table">
          <thead>
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                    className={somePageSelected && !allPageSelected ? "opacity-50" : ""}
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors",
                    col.width
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <SortIcon dir={sortKey === col.key ? sortDir : null} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>}
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                    compact
                  />
                </td>
              </tr>
            ) : (
              paginated.map((row, rowIdx) => {
                const key = getKey(row, (page - 1) * pageSize + rowIdx);
                const isSelected = selected.has(key);
                return (
                  <tr
                    key={key}
                    className={cn(
                      isSelected ? "" : ""
                    )}
                    style={isSelected ? { background: "var(--brand-teal-10, rgba(15,180,168,.07))" } : undefined}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(key)}
                          aria-label="Select row"
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-sm",
                          // use token text color
                          "text-[var(--text)]",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right",
                          col.width
                        )}
                      >
                        {col.render
                          ? col.render(row, (page - 1) * pageSize + rowIdx)
                          : cellToString(getCellValue(row, col.key))}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {!loading && sorted.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {sorted.length === 0 ? "0" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, sorted.length)}`} of {sorted.length}
            </span>
            {selected.size > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selected.size} selected
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Page size */}
            <Select
              value={String(pageSize)}
              onValueChange={v => { setPageSize(Number(v)); setPage(1); }}
            >
              <SelectTrigger className="h-7 text-xs w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map(n => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Page buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
