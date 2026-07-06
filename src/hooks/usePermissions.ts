/**
 * usePermissions — frontend hook that fetches the current user's effective permissions
 * (role permissions + per-user overrides) and provides helper functions to check access.
 *
 * Usage:
 *   const { can, isAdmin } = usePermissions();
 *   if (can("payroll", "approve")) { ... }
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type PermissionMap = Record<string, Record<string, boolean>>;

export function usePermissions() {
  const { isAuthenticated } = useAuth();

  const { data: permissions, isLoading } = trpc.access.users.myPermissions.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
  });

  const perms: PermissionMap = (permissions as PermissionMap) ?? {};

  /**
   * Check if the current user has a specific permission.
   * @param module  e.g. "payroll", "leave", "recruitment"
   * @param action  e.g. "view", "create", "edit", "approve", "delete", "export"
   */
  function can(module: string, action: string): boolean {
    if (!isAuthenticated) return false;
    // While loading, default to false (deny) to prevent flash of unauthorized content
    if (isLoading) return false;
    return Boolean(perms[module]?.[action]);
  }

  /**
   * Returns true if the user has at least view access to a module.
   */
  function canView(module: string): boolean {
    return can(module, "view");
  }

  /**
   * Returns true if the user has any permission in the given module.
   * Useful for showing/hiding sidebar items.
   */
  function hasAnyAccess(module: string): boolean {
    if (!isAuthenticated || isLoading) return false;
    const modulePerm = perms[module];
    if (!modulePerm) return false;
    return Object.values(modulePerm).some(Boolean);
  }

  /**
   * Returns true if the user has access to any of the given modules.
   * Useful for showing section headers in the sidebar.
   */
  function hasAnyModuleAccess(modules: string[]): boolean {
    return modules.some((m) => hasAnyAccess(m));
  }

  /**
   * Convenience: check if user is effectively a super admin or hr admin
   * by checking if they have full access to access_management.
   */
  const isAdmin = can("access_management", "view");

  return {
    permissions: perms,
    isLoading,
    can,
    canView,
    hasAnyAccess,
    hasAnyModuleAccess,
    isAdmin,
  };
}
