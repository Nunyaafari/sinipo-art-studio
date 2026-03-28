import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl, getNetworkErrorMessage } from "../lib/api";
import {
  canManageAdminUsers,
  getAdminRequestHeaders,
  getRoleLabel,
  hasAdminPanelAccess
} from "../lib/admin";

interface UserManagementProps {
  onBack?: () => void;
  embedded?: boolean;
}

interface ManagedUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  lastLogin?: string | null;
  createdAt: string;
}

interface UserStats {
  total: number;
  verified: number;
  admins: number;
  managers: number;
  viewers: number;
  customers: number;
}

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "admin_viewer", label: "User (View only)" },
  { value: "user", label: "Customer" },
] as const;

const roleBadgeMap: Record<string, string> = {
  admin: "bg-[#0a0a0a] text-white",
  manager: "bg-[#d8c06a]/20 text-[#8b6b12]",
  admin_viewer: "bg-slate-100 text-slate-700",
  user: "bg-emerald-100 text-emerald-700",
};

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "admin_viewer",
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const getDraftMap = (entries: ManagedUser[]) =>
  Object.fromEntries(
    entries.map((entry) => [
      entry.id,
      {
        role: entry.role,
        isVerified: entry.isVerified,
      },
    ])
  ) as Record<number, { role: string; isVerified: boolean }>;

export default function UserManagement({ onBack, embedded = false }: UserManagementProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [formData, setFormData] = useState(emptyForm);
  const [drafts, setDrafts] = useState<Record<number, { role: string; isVerified: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasPanelAccess = hasAdminPanelAccess(user?.role);
  const canManageUsers = canManageAdminUsers(user?.role);
  const handleBack = () => onBack?.();

  const fetchUsers = async () => {
    if (!canManageUsers) {
      return;
    }

    setLoading(true);

    try {
      const query = new URLSearchParams();
      if (search.trim()) {
        query.set("search", search.trim());
      }
      if (roleFilter !== "all") {
        query.set("role", roleFilter);
      }

      const response = await fetch(apiUrl(`/api/admin/users?${query.toString()}`), {
        headers: getAdminRequestHeaders(),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load users");
      }

      const nextUsers = Array.isArray(data.data?.users) ? data.data.users : [];
      setUsers(nextUsers);
      setStats(data.data?.stats ?? null);
      setDrafts((current) => {
        const nextDrafts = getDraftMap(nextUsers);
        return Object.keys(current).length === 0 ? nextDrafts : { ...nextDrafts, ...current };
      });
      setError(null);
    } catch (fetchError) {
      setError(getNetworkErrorMessage(fetchError, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, [canManageUsers, roleFilter, search]);

  const dirtyUserIds = useMemo(
    () =>
      users
        .filter((entry) => {
          const draft = drafts[entry.id];
          return draft && (draft.role !== entry.role || draft.isVerified !== entry.isVerified);
        })
        .map((entry) => entry.id),
    [drafts, users]
  );

  const updateDraft = (userId: number, next: Partial<{ role: string; isVerified: boolean }>) => {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        role: current[userId]?.role ?? users.find((entry) => entry.id === userId)?.role ?? "user",
        isVerified:
          current[userId]?.isVerified ??
          users.find((entry) => entry.id === userId)?.isVerified ??
          false,
        ...next,
      },
    }));
    setSuccessMessage(null);
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/admin/users"), {
        method: "POST",
        headers: getAdminRequestHeaders({ json: true }),
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create user");
      }

      setFormData(emptyForm);
      setSuccessMessage("User created successfully.");
      await fetchUsers();
    } catch (submitError) {
      setError(getNetworkErrorMessage(submitError, "Failed to create user"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveUser = async (managedUser: ManagedUser) => {
    const draft = drafts[managedUser.id];
    if (!draft) {
      return;
    }

    setSavingUserId(managedUser.id);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/api/admin/users/${managedUser.id}`), {
        method: "PATCH",
        headers: getAdminRequestHeaders({ json: true }),
        body: JSON.stringify(draft),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update user");
      }

      setSuccessMessage(`${managedUser.firstName} ${managedUser.lastName} updated.`);
      await fetchUsers();
    } catch (saveError) {
      setError(getNetworkErrorMessage(saveError, "Failed to update user"));
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDeleteUser = async (managedUser: ManagedUser) => {
    if (!window.confirm(`Delete ${managedUser.firstName} ${managedUser.lastName}?`)) {
      return;
    }

    setDeletingUserId(managedUser.id);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/api/admin/users/${managedUser.id}`), {
        method: "DELETE",
        headers: getAdminRequestHeaders(),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete user");
      }

      setSuccessMessage("User removed successfully.");
      await fetchUsers();
    } catch (deleteError) {
      setError(getNetworkErrorMessage(deleteError, "Failed to delete user"));
    } finally {
      setDeletingUserId(null);
    }
  };

  if (authLoading) {
    if (embedded) {
      return (
        <div className="border border-black/10 bg-white px-6 py-16 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#c8a830] border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading team access...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#c8a830] border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading access...</p>
        </div>
      </div>
    );
  }

  if (!hasPanelAccess) {
    if (embedded) {
      return (
        <div className="border border-black/10 bg-white px-6 py-10 text-center">
          <p className="text-xs tracking-[0.3em] text-[#8b6b12]">TEAM ACCESS</p>
          <h2
            className="mt-4 text-3xl font-light text-[#111]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Admin login required
          </h2>
          <p className="mt-4 text-sm text-gray-600">
            This area is reserved for Admin, Manager, and view-only backend users.
          </p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 px-6">
        <div className="mx-auto max-w-3xl border border-black/10 bg-white p-10 text-center">
          <p className="text-xs tracking-[0.3em] text-[#8b6b12]">ADMIN ACCESS</p>
          <h1
            className="mt-4 text-4xl font-light text-[#111]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Admin login required
          </h1>
          <p className="mt-4 text-sm text-gray-600">
            This area is reserved for Admin, Manager, and view-only backend users.
          </p>
          <button
            onClick={handleBack}
            className="mt-6 border border-gray-300 px-5 py-3 text-[11px] tracking-[0.18em] text-gray-700 transition-colors hover:border-[#c8a830] hover:text-[#8b6b12]"
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  if (!canManageUsers) {
    if (embedded) {
      return (
        <div className="border border-black/10 bg-white px-6 py-10 text-center">
          <p className="text-xs tracking-[0.3em] text-[#8b6b12]">TEAM ACCESS</p>
          <h2
            className="mt-4 text-3xl font-light text-[#111]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Admin permission required
          </h2>
          <p className="mt-4 text-sm text-gray-600">
            Managers and view-only users can use the backend, but only Admin users can manage accounts and roles.
          </p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 px-6">
        <div className="mx-auto max-w-3xl border border-black/10 bg-white p-10 text-center">
          <p className="text-xs tracking-[0.3em] text-[#8b6b12]">USER MANAGEMENT</p>
          <h1
            className="mt-4 text-4xl font-light text-[#111]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Admin permission required
          </h1>
          <p className="mt-4 text-sm text-gray-600">
            Managers and view-only users can use the backend, but only Admin users can manage accounts and roles.
          </p>
          <button
            onClick={handleBack}
            className="mt-6 border border-gray-300 px-5 py-3 text-[11px] tracking-[0.18em] text-gray-700 transition-colors hover:border-[#c8a830] hover:text-[#8b6b12]"
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  const statsSection = stats ? (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
      {[
        { label: "Total Users", value: stats.total },
        { label: "Verified", value: stats.verified },
        { label: "Admins", value: stats.admins },
        { label: "Managers", value: stats.managers },
        { label: "View Only", value: stats.viewers },
        { label: "Customers", value: stats.customers },
      ].map((card) => (
        <div key={card.label} className="border border-black/10 bg-white px-4 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{card.label}</p>
          <p
            className="mt-2 text-3xl font-light text-[#111]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  ) : null;

  const managementContent = (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="border border-black/10 bg-white p-6">
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Create Internal User</p>
          <h2
            className="mt-2 text-3xl font-light text-[#111]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Add a teammate
          </h2>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={formData.firstName}
              onChange={(event) => setFormData((current) => ({ ...current, firstName: event.target.value }))}
              placeholder="First name"
              className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              required
            />
            <input
              value={formData.lastName}
              onChange={(event) => setFormData((current) => ({ ...current, lastName: event.target.value }))}
              placeholder="Last name"
              className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              required
            />
          </div>
          <input
            type="email"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email address"
            className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
            required
          />
          <input
            type="password"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            placeholder="Temporary password"
            className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
            required
          />
          <select
            value={formData.role}
            onChange={(event) => setFormData((current) => ({ ...current, role: event.target.value }))}
            className="w-full border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#111] px-5 py-3 text-[11px] tracking-[0.18em] text-white transition-colors hover:bg-[#c8a830] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "CREATING..." : "CREATE USER"}
          </button>
        </form>

        <div className="mt-6 border border-[#d8c06a]/30 bg-[#fbf7ea] p-4 text-sm text-[#6f5a17]">
          Admin has full control, Manager can edit operational areas, and User (View only) can enter the backend without making changes.
        </div>
      </section>

      <section className="border border-black/10 bg-white">
        <div className="border-b border-black/10 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Directory</p>
              <h2
                className="mt-2 text-3xl font-light text-[#111]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Users and roles
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_180px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              />
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="w-full border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              >
                <option value="all">All roles</option>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-gray-500">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#f8f6f0]">
                <tr>
                  {["User", "Role", "Verified", "Last Login", "Created", "Actions"].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-left text-[11px] uppercase tracking-[0.18em] text-gray-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((managedUser) => {
                  const draft = drafts[managedUser.id] ?? {
                    role: managedUser.role,
                    isVerified: managedUser.isVerified,
                  };
                  const isDirty =
                    draft.role !== managedUser.role || draft.isVerified !== managedUser.isVerified;

                  return (
                    <tr key={managedUser.id} className="border-t border-black/5 align-top">
                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-[#111]">
                          {managedUser.firstName} {managedUser.lastName}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">{managedUser.email}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-3">
                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs ${roleBadgeMap[managedUser.role] || "bg-gray-100 text-gray-700"}`}
                          >
                            {getRoleLabel(managedUser.role)}
                          </span>
                          <select
                            value={draft.role}
                            onChange={(event) => updateDraft(managedUser.id, { role: event.target.value })}
                            className="w-full min-w-[180px] border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#c8a830] focus:outline-none"
                          >
                            {roleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={draft.isVerified}
                            onChange={(event) =>
                              updateDraft(managedUser.id, { isVerified: event.target.checked })
                            }
                            className="h-4 w-4 accent-[#c8a830]"
                          />
                          Verified
                        </label>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">{formatDate(managedUser.lastLogin)}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{formatDate(managedUser.createdAt)}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleSaveUser(managedUser)}
                            disabled={!isDirty || savingUserId === managedUser.id}
                            className="bg-[#111] px-4 py-2 text-[11px] tracking-[0.18em] text-white transition-colors hover:bg-[#c8a830] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingUserId === managedUser.id ? "SAVING..." : "SAVE"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(managedUser)}
                            disabled={deletingUserId === managedUser.id}
                            className="border border-red-200 px-4 py-2 text-[11px] tracking-[0.18em] text-red-600 transition-colors hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingUserId === managedUser.id ? "DELETING..." : "DELETE"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="border-t border-black/10 px-6 py-12 text-center text-sm text-gray-500">
            No users matched the current filters.
          </div>
        )}

        {!loading && dirtyUserIds.length > 0 && (
          <div className="border-t border-black/10 bg-[#fbf7ea] px-6 py-4 text-sm text-[#6f5a17]">
            {dirtyUserIds.length} user account{dirtyUserIds.length === 1 ? "" : "s"} have unsaved role or verification changes.
          </div>
        )}
      </section>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {successMessage && (
          <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}
        {statsSection}
        {managementContent}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] pt-24">
      <div className="border-y border-black/10 bg-[#111] px-6 py-12 text-white">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#d8c06a]">TEAM ACCESS CONTROL</p>
            <h1
              className="mt-3 text-4xl font-light md:text-5xl"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              User Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              Create internal users, assign roles, and keep the backend limited to the right people.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onBack}
              className="border border-white/20 px-4 py-3 text-[11px] tracking-[0.18em] text-white transition-colors hover:border-[#d8c06a] hover:text-[#d8c06a]"
            >
              BACK TO DASHBOARD
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-6 py-8 lg:px-10">
        {error && <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {successMessage && (
          <div className="mb-6 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        {statsSection ? <div className="mb-6">{statsSection}</div> : null}
        {managementContent}
      </div>
    </div>
  );
}
