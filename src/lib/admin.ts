export type AdminPanelRole = "admin" | "manager" | "admin_viewer";

const adminPanelRoleSet = new Set<AdminPanelRole>(["admin", "manager", "admin_viewer"]);

export const hasAdminPanelAccess = (role?: string | null): role is AdminPanelRole =>
  Boolean(role && adminPanelRoleSet.has(role as AdminPanelRole));

export const canEditAdminContent = (role?: string | null) =>
  role === "admin" || role === "manager";

export const canManageAdminUsers = (role?: string | null) => role === "admin";

export const canManageAdminSettings = (role?: string | null) => role === "admin";

export const getRoleLabel = (role?: string | null) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "admin_viewer":
      return "User (View only)";
    case "user":
      return "Customer";
    default:
      return "Unknown";
  }
};

export const getAdminRequestHeaders = ({ json = false }: { json?: boolean } = {}) => {
  const headers: Record<string, string> = {};

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  const token = localStorage.getItem("authToken");

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};
