import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, Download, Plus, X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  multiple?: boolean;
}

interface DataTableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterGroup[];
  activeFilters?: Record<string, string | string[]>;
  onFilterChange?: (key: string, value: string | string[]) => void;
  onExport?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  extraActions?: ReactNode;
  className?: string;
  loading?: boolean;
}

export function DataTableToolbar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  activeFilters = {},
  onFilterChange,
  onExport,
  onAdd,
  addLabel = "Add New",
  extraActions,
  className,
  loading,
}: DataTableToolbarProps) {
  const activeFilterCount = Object.values(activeFilters).filter(v =>
    Array.isArray(v) ? v.length > 0 : v !== "" && v !== "all"
  ).length;

  const clearFilter = (key: string) => {
    onFilterChange?.(key, "");
  };

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2 items-start sm:items-center", className)}>
      {/* Search */}
      {onSearchChange && (
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-sm"
            disabled={loading}
          />
          {searchValue && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchChange("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Filter dropdowns */}
      {filters.map(filter => {
        const active = activeFilters[filter.key];
        const hasActive = Array.isArray(active) ? active.length > 0 : (active && active !== "all");

        return (
          <DropdownMenu key={filter.key}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 text-sm",
                  hasActive && "border-primary text-primary bg-primary/5"
                )}
                disabled={loading}
              >
                <Filter className="h-3.5 w-3.5" />
                {filter.label}
                {hasActive && (
                  <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground ms-0.5">
                    {Array.isArray(active) ? active.length : 1}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 ms-0.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">{filter.label}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filter.multiple ? (
                filter.options.map(opt => {
                  const isChecked = Array.isArray(active) && active.includes(opt.value);
                  return (
                    <DropdownMenuCheckboxItem
                      key={opt.value}
                      checked={isChecked}
                      onCheckedChange={checked => {
                        const current = Array.isArray(active) ? active : [];
                        onFilterChange?.(
                          filter.key,
                          checked ? [...current, opt.value] : current.filter(v => v !== opt.value)
                        );
                      }}
                    >
                      {opt.label}
                    </DropdownMenuCheckboxItem>
                  );
                })
              ) : (
                <>
                  <DropdownMenuItem onClick={() => clearFilter(filter.key)}>
                    <span className="text-muted-foreground">All</span>
                  </DropdownMenuItem>
                  {filter.options.map(opt => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => onFilterChange?.(filter.key, opt.value)}
                      className={cn(active === opt.value && "bg-accent font-medium")}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {hasActive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => clearFilter(filter.key)}
                    className="text-destructive text-xs"
                  >
                    <X className="h-3.5 w-3.5 me-1.5" />
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground gap-1"
          onClick={() => filters.forEach(f => clearFilter(f.key))}
        >
          <X className="h-3 w-3" />
          Clear all ({activeFilterCount})
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Extra actions */}
      {extraActions}

      {/* Export */}
      {onExport && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm"
          onClick={onExport}
          disabled={loading}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      )}

      {/* Add new */}
      {onAdd && (
        <Button
          size="sm"
          className="h-8 gap-1.5 text-sm"
          onClick={onAdd}
          disabled={loading}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{addLabel}</span>
        </Button>
      )}
    </div>
  );
}
