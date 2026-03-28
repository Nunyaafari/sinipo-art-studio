import { useEffect, useMemo, useState } from "react";
import { apiUrl, getNetworkErrorMessage } from "../lib/api";
import { getAdminRequestHeaders } from "../lib/admin";

interface AuditLogManagementProps {
  onBack?: () => void;
  embedded?: boolean;
}

interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  targetType: string;
  targetId: string | number | null;
  summary: string;
  actor?: {
    authMethod?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  };
  request?: {
    method?: string | null;
    path?: string | null;
  };
  changes?: unknown;
  metadata?: unknown;
}

interface AuditStats {
  total: number;
  actionCounts: Record<string, number>;
  targetCounts: Record<string, number>;
  latestEventAt: string | null;
}

const prettyJson = (value: unknown) => {
  if (value === null || value === undefined) {
    return "None";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function AuditLogManagement({ onBack, embedded = false }: AuditLogManagementProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  useEffect(() => {
    const loadAuditData = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("limit", "200");

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (actionFilter !== "all") {
          params.set("action", actionFilter);
        }

        if (targetFilter !== "all") {
          params.set("targetType", targetFilter);
        }

        const [logsResponse, statsResponse] = await Promise.all([
          fetch(apiUrl(`/api/admin/audit?${params.toString()}`), {
            headers: getAdminRequestHeaders(),
          }),
          fetch(apiUrl("/api/admin/audit/stats"), {
            headers: getAdminRequestHeaders(),
          }),
        ]);

        const [logsData, statsData] = await Promise.all([
          logsResponse.json(),
          statsResponse.json(),
        ]);

        if (!logsResponse.ok || !logsData.success) {
          throw new Error(logsData.error || "Failed to load audit log entries");
        }

        if (!statsResponse.ok || !statsData.success) {
          throw new Error(statsData.error || "Failed to load audit log statistics");
        }

        const nextLogs = Array.isArray(logsData.data) ? logsData.data : [];
        setLogs(nextLogs);
        setStats(statsData.data ?? null);
        setError(null);
        setSelectedLogId((current) =>
          current && nextLogs.some((entry: AuditEntry) => entry.id === current)
            ? current
            : nextLogs[0]?.id ?? null
        );
      } catch (loadError) {
        setError(getNetworkErrorMessage(loadError, "Failed to load audit log entries"));
      } finally {
        setLoading(false);
      }
    };

    void loadAuditData();
  }, [actionFilter, refreshKey, search, targetFilter]);

  const selectedLog = useMemo(
    () => logs.find((entry) => entry.id === selectedLogId) || null,
    [logs, selectedLogId]
  );

  const availableActions = useMemo(() => {
    const values = Object.keys(stats?.actionCounts || {});
    return values.sort((left, right) => left.localeCompare(right));
  }, [stats]);

  const availableTargets = useMemo(() => {
    const values = Object.keys(stats?.targetCounts || {});
    return values.sort((left, right) => left.localeCompare(right));
  }, [stats]);

  const topActions = useMemo(
    () =>
      Object.entries(stats?.actionCounts || {})
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3),
    [stats]
  );

  const handleBack = () => onBack?.();

  const statsSection = stats ? (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="bg-white border border-gray-100 p-5">
        <p className="text-xs tracking-[0.2em] text-gray-400 mb-2">TOTAL EVENTS</p>
        <p
          className="text-3xl font-light text-[#0a0a0a]"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {stats.total}
        </p>
      </div>
      <div className="bg-white border border-gray-100 p-5">
        <p className="text-xs tracking-[0.2em] text-gray-400 mb-2">LATEST EVENT</p>
        <p className="text-sm text-gray-700">{formatDateTime(stats.latestEventAt)}</p>
      </div>
      <div className="bg-white border border-gray-100 p-5">
        <p className="text-xs tracking-[0.2em] text-gray-400 mb-2">TOP ACTIONS</p>
        <div className="space-y-2 text-sm text-gray-700">
          {topActions.length > 0 ? (
            topActions.map(([action, count]) => (
              <div key={action} className="flex items-center justify-between gap-4">
                <span className="truncate">{action}</span>
                <span>{count}</span>
              </div>
            ))
          ) : (
            <p>No audit events yet.</p>
          )}
        </div>
      </div>
      <div className="bg-white border border-gray-100 p-5">
        <p className="text-xs tracking-[0.2em] text-gray-400 mb-2">TARGET TYPES</p>
        <div className="space-y-2 text-sm text-gray-700">
          {Object.entries(stats.targetCounts)
            .sort((left, right) => right[1] - left[1])
            .slice(0, 3)
            .map(([target, count]) => (
              <div key={target} className="flex items-center justify-between gap-4">
                <span className="truncate">{target}</span>
                <span>{count}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  ) : null;

  const auditContent = (
    <div className="space-y-6">
      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {statsSection}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <aside className="bg-white border border-gray-100 p-5 h-fit">
          <div className="flex items-center justify-between gap-4 mb-5">
            <p className="text-xs tracking-[0.2em] text-gray-400">FILTERS</p>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="border border-gray-200 bg-white px-3 py-2 text-[11px] tracking-[0.18em] text-gray-600 hover:border-gray-400 transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              REFRESH
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 mb-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search action, target, ID, summary..."
              className="border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#c8a830]"
            />
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#c8a830]"
            >
              <option value="all">All Actions</option>
              {availableActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <select
              value={targetFilter}
              onChange={(event) => setTargetFilter(event.target.value)}
              className="border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#c8a830]"
            >
              <option value="all">All Targets</option>
              {availableTargets.map((target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-sm text-gray-500">Loading audit events...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-500">No audit events matched these filters.</p>
            ) : (
              logs.map((entry) => {
                const isSelected = entry.id === selectedLogId;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedLogId(entry.id)}
                    className={`w-full border px-4 py-4 text-left transition-colors ${
                      isSelected
                        ? "border-[#c8a830] bg-[#fffaf0]"
                        : "border-gray-200 bg-white hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-[11px] tracking-[0.18em] text-gray-500 uppercase">
                        {entry.action}
                      </p>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-[#0a0a0a] leading-relaxed">{entry.summary || "No summary"}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                      <span>{entry.targetType}</span>
                      <span>#{entry.targetId ?? "n/a"}</span>
                      <span>{entry.request?.method || "UNKNOWN"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="bg-white border border-gray-100 p-6">
          {selectedLog ? (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-5">
                <p className="text-xs tracking-[0.2em] text-gray-400 mb-2">SELECTED EVENT</p>
                <h2
                  className="text-3xl font-light text-[#0a0a0a]"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {selectedLog.summary || selectedLog.action}
                </h2>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                  <span>{selectedLog.action}</span>
                  <span>{selectedLog.targetType}</span>
                  <span>#{selectedLog.targetId ?? "n/a"}</span>
                  <span>{formatDateTime(selectedLog.createdAt)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-400 mb-3">REQUEST</p>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p><strong>Method:</strong> {selectedLog.request?.method || "Unknown"}</p>
                    <p><strong>Path:</strong> {selectedLog.request?.path || "Unknown"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-400 mb-3">ACTOR</p>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p><strong>Auth:</strong> {selectedLog.actor?.authMethod || "Unknown"}</p>
                    <p><strong>IP:</strong> {selectedLog.actor?.ip || "Unknown"}</p>
                    <p><strong>User Agent:</strong> {selectedLog.actor?.userAgent || "Unknown"}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-400 mb-3">CHANGES</p>
                  <pre className="overflow-x-auto border border-gray-100 bg-[#fcfcfa] p-4 text-xs text-gray-700 whitespace-pre-wrap">
                    {prettyJson(selectedLog.changes)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-400 mb-3">METADATA</p>
                  <pre className="overflow-x-auto border border-gray-100 bg-[#fcfcfa] p-4 text-xs text-gray-700 whitespace-pre-wrap">
                    {prettyJson(selectedLog.metadata)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">
              Select an audit event to inspect the full details.
            </div>
          )}
        </section>
      </div>
    </div>
  );

  if (embedded) {
    return auditContent;
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] pt-28">
      <div className="bg-[#0a0a0a] py-16 px-6 text-center">
        <div
          className="text-[#c8a830] text-xs tracking-[0.4em] mb-4"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          ADMIN AUDIT LOG
        </div>
        <h1
          className="text-white text-5xl md:text-6xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Audit Trail
        </h1>
      </div>

      <div className="max-w-[1500px] mx-auto px-6 lg:px-10 py-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-xs tracking-[0.15em] text-gray-600 hover:text-[#c8a830] transition-colors"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            BACK TO DASHBOARD
          </button>

          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            className="border border-gray-200 bg-white px-4 py-2 text-[11px] tracking-[0.18em] text-gray-600 hover:border-gray-400 transition-colors"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            REFRESH LOGS
          </button>
        </div>

        {auditContent}
      </div>
    </div>
  );
}
