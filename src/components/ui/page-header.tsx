import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { ReactNode } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbItem[];
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, breadcrumb, action, className }: PageHeaderProps) {
  return (
    <div className={cn("page-header", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          {breadcrumb && breadcrumb.length > 0 && (
            <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
              {breadcrumb.map((item, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
                  {item.href ? (
                    <Link href={item.href}>
                      <span className="hover:text-foreground cursor-pointer transition-colors">{item.label}</span>
                    </Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-xl font-bold text-foreground leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-2 shrink-0">{action}</div>
        )}
      </div>
    </div>
  );
}
