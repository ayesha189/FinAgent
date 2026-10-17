// src/pages/admin/PendingRegistrations.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  X,
  Search,
  Loader2,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Inbox,
  LogOut,
} from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";
const store = (k: string) => localStorage.getItem(k) ?? sessionStorage.getItem(k);

interface RegistrationUser {
  user_id: number;
  name: string;
  email: string;
  role: "finance_officer" | "auditor" | "administrator";
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  finance_officer: "Finance Officer",
  auditor: "Auditor",
  administrator: "Administrator",
};

const ROLE_STYLE: Record<string, string> = {
  finance_officer: "bg-blue-50 text-blue-700 ring-blue-200",
  auditor: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  administrator: "bg-amber-50 text-amber-800 ring-amber-300",
};

const INITIAL_DEMO_REQUESTS: RegistrationUser[] = [
  {
    user_id: 101,
    name: "Sarah Jenkins",
    email: "s.jenkins@enterprise.com",
    role: "finance_officer",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    user_id: 102,
    name: "David Chen",
    email: "d.chen@auditcorp.io",
    role: "auditor",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    user_id: 103,
    name: "Marcus Vance",
    email: "m.vance@finagent.local",
    role: "administrator",
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
];

const initials = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const fmt = (d: string) =>
  new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function PendingRegistrations() {
  const navigate = useNavigate();
  const isPrimary = store("finagent_is_primary") === "true";

  const [rows, setRows] = useState<RegistrationUser[]>(() => {
    const saved = localStorage.getItem("finagent_pending_rows");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return INITIAL_DEMO_REQUESTS;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [roleEdit, setRoleEdit] = useState<Record<number, string>>({});
  const [confirmReject, setConfirmReject] = useState<RegistrationUser | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const api = useCallback(
    async (path: string, opts: RequestInit = {}) => {
      const res = await fetch(`${API_URL}${path}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${store("finagent_token")}`,
          ...(opts.headers || {}),
        },
      });
      if (res.status === 401) {
        navigate("/login", { replace: true });
        throw new Error("auth");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Request failed");
      return data;
    },
    [navigate]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/admin/registrations");
      setRows(data);
      localStorage.setItem("finagent_pending_rows", JSON.stringify(data));
    } catch {
      // Backend not running locally - load demo requests filtered for primary admin
      const saved = localStorage.getItem("finagent_pending_rows");
      if (saved) {
        try {
          setRows(JSON.parse(saved));
        } catch {
          setRows(INITIAL_DEMO_REQUESTS);
        }
      } else {
        setRows(INITIAL_DEMO_REQUESTS);
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleLogout = () => {
    localStorage.removeItem("finagent_token");
    localStorage.removeItem("finagent_role");
    localStorage.removeItem("finagent_name");
    localStorage.removeItem("finagent_is_primary");
    navigate("/login");
  };

  const decide = async (u: RegistrationUser, decision: "approve" | "reject") => {
    setBusy(u.user_id);
    try {
      const body: { decision: string; role?: string } = { decision };
      if (decision === "approve" && roleEdit[u.user_id] && roleEdit[u.user_id] !== u.role) {
        body.role = roleEdit[u.user_id];
      }

      try {
        await api(`/admin/registrations/${u.user_id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } catch {
        // local fallback
      }

      setRows((prev) => {
        const next = prev.filter((x) => x.user_id !== u.user_id);
        localStorage.setItem("finagent_pending_rows", JSON.stringify(next));
        return next;
      });

      setToast({
        ok: true,
        text: `${u.name} ${
          decision === "approve" ? "approved. They can sign in now." : "rejected."
        }`,
      });
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message !== "auth") setToast({ ok: false, text: err.message });
    } finally {
      setBusy(null);
      setConfirmReject(null);
    }
  };

  const counts = useMemo(
    () => ({
      all: rows.length,
      finance_officer: rows.filter((r) => r.role === "finance_officer").length,
      auditor: rows.filter((r) => r.role === "auditor").length,
      administrator: rows.filter((r) => r.role === "administrator").length,
    }),
    [rows]
  );

  const visible = rows.filter(
    (r) =>
      (filter === "all" || r.role === filter) &&
      `${r.name} ${r.email}`.toLowerCase().includes(query.toLowerCase())
  );

  const tabs: [string, string][] = [
    ["all", "All"],
    ["finance_officer", "Finance Officers"],
    ["auditor", "Auditors"],
    ...(isPrimary ? [["administrator", "Administrators"] as [string, string]] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F4F8FC] p-6 md:p-10 font-sans">
      <div className="mx-auto max-w-5xl">
        {/* Top Header Row with Logo and Logout */}
        <div className="mb-6 pb-5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 text-[#0B2A6F] font-bold text-xl">
            <svg
              className="w-7 h-7 drop-shadow-xs"
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M8 18.5L16 13.8V33L8 28.5V18.5Z" fill="#38BDF8" />
              <path d="M8 18.5L16 23.2V33L8 28.5V18.5Z" fill="#0284C7" />
              <path d="M17 10L25 5.3V37.5L17 33V10Z" fill="#0EA5E9" />
              <path d="M17 22L25 26.5V37.5L17 33V22Z" fill="#0369A1" />
              <path d="M26 15.2L34 10.6V30.2L26 34.8V15.2Z" fill="#0284C7" />
              <path d="M26 25.5L34 21V30.2L26 34.8V25.5Z" fill="#0B2546" />
            </svg>
            <span>FinAgent Console</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/officer/dashboard"
              className="text-xs px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold transition-colors flex items-center gap-1.5"
            >
              Finance Officer View →
            </Link>
            <span className="text-xs px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-md font-semibold">
              Primary Administrator
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Log out
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2A6F]">Pending registrations</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review each request before the user can sign in. Every decision is written to the audit log.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#0B2A6F] hover:border-[#1E4FD8] focus-visible:ring-2 focus-visible:ring-[#1E4FD8]/40 outline-none disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {isPrimary ? (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            You are the primary administrator. Administrator requests appear only to you.
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-900">
            <UserCheck className="h-4 w-4 shrink-0" />
            You can review Finance Officer and Auditor requests. Administrator requests go to the primary administrator.
          </div>
        )}

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="flex flex-wrap gap-2">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#1E4FD8]/40 transition cursor-pointer
                  ${
                    filter === key
                      ? "bg-[#0B2A6F] text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-[#1E4FD8]"
                  }`}
              >
                {label}{" "}
                <span className={filter === key ? "text-blue-200" : "text-slate-400"}>
                  {counts[key as keyof typeof counts]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              aria-label="Search registrations"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#1E4FD8] focus:ring-2 focus:ring-[#1E4FD8]/30"
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* List */}
        <div className="mt-5 space-y-3">
          {loading &&
            !rows.length &&
            [0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-white ring-1 ring-slate-100" />
            ))}

          {!loading && !error && !visible.length && (
            <div className="grid place-items-center rounded-xl bg-white py-16 text-center ring-1 ring-slate-100">
              <Inbox className="h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-[#0B2A6F]">
                {rows.length ? "No requests match your filters" : "No pending requests"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {rows.length
                  ? "Clear the search or pick another tab."
                  : "New registrations will appear here as soon as someone submits one."}
              </p>
            </div>
          )}

          {visible.map((u) => {
            const isAdminReq = u.role === "administrator";
            const working = busy === u.user_id;
            return (
              <div
                key={u.user_id}
                className={`flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 ring-1 ${
                  isAdminReq ? "ring-amber-300" : "ring-slate-100"
                }`}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1E4FD8] to-[#12B886] text-sm font-bold text-white">
                  {initials(u.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{u.name}</p>
                  <p className="truncate text-sm text-slate-500">{u.email}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Requested {fmt(u.created_at)}</p>
                </div>

                <div className="flex flex-col items-start gap-1">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${ROLE_STYLE[u.role]}`}>
                    {ROLE_LABEL[u.role]}
                  </span>
                  {!isAdminReq && (
                    <select
                      aria-label={`Role for ${u.name}`}
                      value={roleEdit[u.user_id] ?? u.role}
                      onChange={(e) => setRoleEdit((m) => ({ ...m, [u.user_id]: e.target.value }))}
                      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none focus:border-[#1E4FD8]"
                    >
                      <option value="finance_officer">Approve as Finance Officer</option>
                      <option value="auditor">Approve as Auditor</option>
                    </select>
                  )}
                </div>

                <div className="flex w-full sm:w-auto gap-2">
                  <button
                    onClick={() => setConfirmReject(u)}
                    disabled={working}
                    className="flex-1 sm:flex-none flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-300 outline-none disabled:opacity-50 cursor-pointer"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                  <button
                    onClick={() => decide(u, "approve")}
                    disabled={working}
                    className="flex-1 sm:flex-none flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#12B886] px-4 text-sm font-semibold text-white hover:bg-[#0fa377] focus-visible:ring-2 focus-visible:ring-[#12B886]/50 focus-visible:ring-offset-2 outline-none disabled:opacity-60 cursor-pointer"
                  >
                    {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reject confirmation dialog */}
      {confirmReject && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-[#0B2A6F]/50 p-4"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => e.key === "Escape" && setConfirmReject(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[#0B2A6F]">Reject this request?</h2>
            <p className="mt-2 text-sm text-slate-600">
              {confirmReject.name} ({ROLE_LABEL[confirmReject.role]}) will not be able to sign in. They will see that
              the registration was not approved.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                autoFocus
                onClick={() => setConfirmReject(null)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-[#1E4FD8]/40 cursor-pointer"
              >
                Keep request
              </button>
              <button
                onClick={() => decide(confirmReject, "reject")}
                className="h-10 rounded-lg bg-[#E5484D] px-4 text-sm font-semibold text-white hover:bg-[#d13b40] outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 cursor-pointer"
              >
                Reject request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.ok ? "bg-[#0B2A6F]" : "bg-[#E5484D]"
          }`}
        >
          {toast.ok ? <Check className="h-4 w-4 text-[#4CC36B]" /> : <AlertCircle className="h-4 w-4" />} {toast.text}
        </div>
      )}
    </div>
  );
}
