import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bug,
  Check,
  Clock3,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Copy,
  ExternalLink,
    ImagePlus,
  Layers,
  Pencil,
  Plus,
  Percent,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { AppShell } from "../components/AppShell";
import { DateRangePicker } from "../components/DateRangePicker";
import { services, type ApplicationInput } from "../services/api";
import { daysAgo, messageFrom, today } from "../utils/dates";
import { useRegisterRefresh, useWorkspace } from "../state/WorkspaceContext";
import type { Application, Feature, OverviewData, OverviewMetrics, Profile } from "../types";

type Props = { profile: Profile; googleConnected: boolean; onLogout: () => void };

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="page-title">{title}</h1>{subtitle && <p className="mt-1.5 max-w-2xl text-sm text-secondary">{subtitle}</p>}</div>{action}</div>;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</section>;
}

function Alert({ children, kind = "error" }: { children: ReactNode; kind?: "error" | "info" | "success" }) {
  const classes = kind === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-indigo-100 bg-indigo-50 text-indigo-800";
  return <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm ${classes}`}>{children}</div>;
}

function Empty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center px-6 py-12 text-center"><span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-500"><Workflow size={19} /></span><h2 className="mt-4 text-sm font-semibold text-primary">{title}</h2><p className="mt-1 max-w-md text-sm leading-6 text-secondary">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function Skeleton({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3 p-5">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-10" />)}</div>;
}

function IconTile({ app, size = "md" }: { app?: Pick<Application, "name" | "appIconData" | "appIconUrl"> | null; size?: "sm" | "md" | "lg" }) {
  const [failedSrc, setFailedSrc] = useState("");
  const dimensions = size === "lg" ? "h-16 w-16 rounded-2xl text-xl" : size === "sm" ? "h-9 w-9 rounded-lg text-xs" : "h-11 w-11 rounded-xl text-sm";
  const iconSrc = app?.appIconData || app?.appIconUrl || "";
  useEffect(() => setFailedSrc(""), [iconSrc]);
  if (iconSrc && failedSrc !== iconSrc) return <img src={iconSrc} alt={`${app?.name ?? "App"} icon`} className={`${dimensions} shrink-0 border border-line object-cover`} onError={() => setFailedSrc(iconSrc)} />;
  const initials = app?.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
  return <span aria-label={`${app?.name ?? "App"} icon`} className={`${dimensions} grid shrink-0 place-items-center bg-indigo-100 font-semibold text-indigo-700`}>{initials}</span>;
}

function Status({ connected }: { connected: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />{connected ? "GA4 Connected" : "Setup required"}</span>;
}

function useApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadApps = useCallback(async () => {
    try { setApps(await services.apps()); setError(""); }
    catch (loadError) { setError(messageFrom(loadError)); throw loadError; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadApps().catch(() => undefined); }, [loadApps]);
  return { apps, setApps, loading, error, setError, loadApps };
}

function ApplicationPicker({ apps, value, onChange, id, disabled = false }: { apps: Application[]; value: string; onChange: (value: string) => void; id: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = apps.find((app) => app.id === value);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  return <div ref={rootRef} className="relative">
    <button id={id} type="button" className="field flex h-[42px] items-center justify-between gap-2 !py-0 text-left disabled:opacity-60" role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-controls={`${id}-options`} disabled={disabled} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      {selected ? <span className="flex min-w-0 items-center gap-2"><span className="[&>*]:!h-7 [&>*]:!w-7 [&>*]:!rounded-md"><IconTile app={selected} size="sm" /></span><span className="truncate text-primary">{selected.name}</span></span> : <span className="text-muted">Select an application</span>}
      <ChevronDown size={15} className={`shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div id={`${id}-options`} role="listbox" aria-label="Applications" className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-xl">
      {apps.map((app) => <button key={app.id} type="button" role="option" aria-selected={app.id === value} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-surface-soft focus:bg-surface-soft focus:outline-none" onClick={() => { onChange(app.id); setOpen(false); }}>
        <IconTile app={app} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-primary">{app.name}</span></span>
      </button>)}
      {!apps.length && <p className="px-3 py-2 text-xs text-muted">No applications available.</p>}
    </div>}
  </div>;
}

function AppIdentity({ app, connected }: { app: Application; connected: boolean }) {
  const playUrl = app.packageName ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.packageName)}` : app.appUrl || "";
  return <div className="flex min-w-0 items-center gap-3 lg:pr-4">
    <IconTile app={app} size="md" />
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-base font-semibold text-primary">{app.name}</h2><Status connected={connected} /></div>
      {app.packageName && playUrl && <a className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-indigo-600 hover:underline" href={playUrl} target="_blank" rel="noreferrer">{app.packageName}<ExternalLink size={11} /></a>}
    </div>
  </div>;
}

function formatEngagementTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
  return `${remainder}s`;
}

function MetricCard({ label, value, note, icon: Icon, tone }: {
  label: string;
  value: string;
  note: string;
  icon: typeof Users;
  tone: "blue" | "violet" | "rose" | "green" | "amber" | "cyan";
}) {
  const tones = { blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", rose: "bg-rose-50 text-rose-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", cyan: "bg-cyan-50 text-cyan-600" };
  return <section className="rounded-2xl border border-line bg-surface p-4 shadow-card"><div className="flex items-center gap-2.5"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon size={16} aria-hidden="true" /></span><p className="truncate text-xs font-medium text-secondary">{label}</p></div><p className="mt-3 truncate text-2xl font-semibold tabular-nums tracking-tight text-primary">{value}</p>{note && <p className="mt-1 truncate text-xs text-muted">{note}</p>}</section>;
}

function rangeStart(preset: string): string {
  if (preset === "today") return today();
  if (preset === "yesterday") return daysAgo(1);
  if (preset === "7d") return daysAgo(6);
  if (preset === "90d") return daysAgo(89);
  return daysAgo(29);
}
const EMPTY_METRICS: OverviewMetrics = {
  activeUsers: null,
  newUsers: null,
  crashAffectedUsers: null,
  engagementRate: null,
  userEngagementDuration: null,
  sessionsPerActiveUser: null,
};

function metricNumber(value: number | null, digits = 0): string {
  return value === null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

export function OverviewPage(props: Props) {
  const { apps, loading: appsLoading, error: appsError } = useApplications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [appId, setAppId] = useState(searchParams.get("app") ?? "");
  const [version, setVersion] = useState("");
  const [country, setCountry] = useState("");
  const [startDate, setStartDate] = useState(rangeStart("30d"));
  const [endDate, setEndDate] = useState(today());
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const requestSequence = useRef(0);
  const navigate = useNavigate();
  const app = apps.find((item) => item.id === appId);

  useEffect(() => { if (!appId && apps[0]) setAppId(apps[0].id); }, [apps, appId]);
  useEffect(() => {
    if ((searchParams.get("app") ?? "") === appId) return;
    const params = new URLSearchParams(searchParams);
    if (appId) params.set("app", appId);
    else params.delete("app");
    setSearchParams(params, { replace: true });
  }, [appId, searchParams, setSearchParams]);

  const loadAnalytics = useCallback(async (notifyErrors = false) => {
    const requestId = ++requestSequence.current;
    if (!appId || !props.googleConnected || !app?.ga4PropertyId) {
      setData(null);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await services.overview(appId, startDate, endDate, version, country);
      if (requestId !== requestSequence.current) return;
      setData(response);
      setError("");
    } catch (loadError) {
      if (requestId !== requestSequence.current) return;
      const message = messageFrom(loadError);
      setError(message);
      if (notifyErrors) throw loadError;
    } finally { if (requestId === requestSequence.current) setLoading(false); }
  }, [appId, app?.ga4PropertyId, props.googleConnected, startDate, endDate, version, country]);
  useRegisterRefresh(() => loadAnalytics(true), [loadAnalytics]);
  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);

  const metrics = data?.metrics ?? EMPTY_METRICS;
  const cards = [
    { label: "Active Users", value: metricNumber(metrics.activeUsers), note: "Selected period", icon: Users, tone: "blue" as const },
    { label: "New Users", value: metricNumber(metrics.newUsers), note: "Selected period", icon: UserPlus, tone: "violet" as const },
    { label: "Crash-affected Users", value: metricNumber(metrics.crashAffectedUsers), note: "GA4 crash reports", icon: Bug, tone: "rose" as const },
    { label: "Engagement Rate", value: metrics.engagementRate === null ? "—" : `${(metrics.engagementRate * 100).toFixed(1)}%`, note: "Engaged sessions / sessions", icon: Percent, tone: "green" as const },
    { label: "Average Engagement Time", value: formatEngagementTime(metrics.userEngagementDuration !== null && metrics.activeUsers ? metrics.userEngagementDuration / metrics.activeUsers : null), note: "Per active user", icon: Clock3, tone: "amber" as const },
  ];

  if (appsLoading && !apps.length) return <AppShell profile={props.profile} googleConnected={props.googleConnected} onLogout={props.onLogout}><div className="skeleton h-10 w-64" /><div className="mt-5 grid gap-3 md:grid-cols-3">{[1, 2, 3].map((x) => <div key={x} className="skeleton h-28" />)}</div></AppShell>;
  return (
    <AppShell profile={props.profile} googleConnected={props.googleConnected} onLogout={props.onLogout}>
      {appsError && <div className="mb-4"><Alert>{appsError}</Alert></div>}
      {error && <div className="mb-4"><Alert><CircleAlert size={16} />{error}</Alert></div>}
      {!apps.length ? <Card><Empty title="Add your first app" description="Manage Apps is where you connect an application and its GA4 property." action={<Link className="button-primary" to="/apps"><Plus size={15} /> Manage Apps</Link>} /></Card> : <>
        <div className="sticky top-[64px] z-40 -mx-4 bg-app px-4 py-2 sm:-mx-7 sm:px-7">
          <Card className="border-0 bg-surface/95 p-3 shadow-md backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {app && <AppIdentity app={app} connected={props.googleConnected && Boolean(app.ga4PropertyId)} />}
              <div className="grid flex-1 grid-cols-1 items-end gap-2.5 sm:grid-cols-3 lg:ml-auto lg:max-w-3xl">
                <div><label className="label" htmlFor="overview-app">Application</label><ApplicationPicker id="overview-app" apps={apps} value={appId} onChange={(value) => { setAppId(value); setVersion(""); setCountry(""); setData(null); setExpanded({}); }} /></div>
                <div><label className="label" htmlFor="overview-version">App version</label><select id="overview-version" className="field" value={version} onChange={(event) => setVersion(event.target.value)}><option value="">All versions</option>{(data?.appVersions ?? []).map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div><label className="label">Date range</label><DateRangePicker start={startDate} end={endDate} max={today()} onChange={(from, to) => { setStartDate(from); setEndDate(to); }} /></div>
              </div>
              {loading && <span className="inline-flex items-center gap-1.5 text-[11px] text-indigo-600" role="status"><RefreshCw size={12} className="animate-spin" />Updating</span>}
            </div>
          </Card>
        </div>
        {!props.googleConnected && <Alert kind="info">Connect Google Analytics to load actual GA4 metrics. Analytics values are not replaced with sample data.</Alert>}
        {props.googleConnected && app && !app.ga4PropertyId && <Alert kind="info">Set and test a GA4 Property ID for this app in Manage Apps before loading metrics.</Alert>}
        <div className={`mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5 ${loading ? "opacity-75" : "opacity-100"} transition-opacity duration-200`} aria-busy={loading}>
          {cards.map((item) => <MetricCard key={item.label} {...item} value={loading && !data ? "…" : item.value} />)}
        </div>
        <div className="mb-3 mt-7 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-primary">User Journey</h2><p className="mt-1 text-xs text-secondary">Event-level engagement across this application's configured funnels.</p></div><span className="text-xs text-muted">{data?.funnels.length ?? 0} funnels</span></div>
        {loading && !data ? <Card><Skeleton rows={5} /></Card> : !data?.funnels.length ? <Card><Empty title={`No funnels created for ${app?.name ?? "this application"}.`} description="Create your first funnel to start analyzing user journeys." action={<Link className="button-primary" to={`/funnels?app=${encodeURIComponent(appId)}`}><Plus size={15} /> Create Funnel</Link>} /></Card> : <div className="space-y-4">
          {data.funnels.map((funnel, index) => <FunnelSection key={funnel.id} app={app} funnel={funnel} expanded={expanded[funnel.id] ?? index === 0} onToggle={() => setExpanded((current) => ({ ...current, [funnel.id]: !(current[funnel.id] ?? index === 0) }))} onEdit={() => navigate(`/funnels?app=${encodeURIComponent(appId)}&edit=${encodeURIComponent(funnel.id)}`)} />)}
        </div>}
        <p className="mt-4 text-xs leading-5 text-muted">Event population comparison: users are reported independently for each event. This does not prove that the same users completed events sequentially.</p>
      </>}
    </AppShell>
  );
}

type FunnelSummary = OverviewData["funnels"][number];
const FunnelSection = function FunnelSection({ app, funnel, expanded, onToggle, onEdit }: { app?: Application; funnel: FunnelSummary; expanded: boolean; onToggle: () => void; onEdit: () => void }) {
  const maxUsers = Math.max(1, ...funnel.events.map((event) => event.activeUsers));
  const rows = funnel.events.map((event, position) => {
    const previous = funnel.events[position - 1];
    const drop = position === 0 || !previous || previous.activeUsers === 0 ? null : event.dropPercentage;
    const userIntensity = Math.max(0.06, event.activeUsers / maxUsers);
    const dropIntensity = drop === null ? 0 : Math.min(1, Math.max(0, drop) / 100);
    const dropColor = drop === null ? "transparent" : drop >= 70 ? "#ef4444" : drop >= 35 ? "#f59e0b" : "#10b981";
    return { ...event, position, drop, userIntensity, dropIntensity, dropColor };
  });
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4 sm:px-5">
        <button onClick={onToggle} className="rounded-md p-1.5 text-secondary hover:bg-surface-soft" aria-label={`${expanded ? "Collapse" : "Expand"} ${funnel.name}`} aria-expanded={expanded}>{expanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}</button>
        {app ? <IconTile app={app} size="sm" /> : <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><Layers size={17} /></span>}
        <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold text-primary">{funnel.name}</h3><p className="mt-0.5 text-[11px] text-muted">{funnel.events.length} ordered events · Event Population analysis</p></div>
        <button className="button-secondary !px-2.5 !py-2 text-xs" onClick={onEdit} aria-label={`Edit ${funnel.name}`}><Pencil size={14} className="text-rose-600" /><span className="hidden sm:inline">Edit</span></button>
      </div>
      {expanded && <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs">
        <thead className="sticky top-0 bg-surface-soft text-xs font-semibold uppercase tracking-wide text-secondary"><tr><th className="w-16 px-4 py-3.5 font-bold">Step</th><th className="px-4 py-3.5 font-bold">Event Name</th><th className="px-4 py-3 text-right font-semibold">Total Users</th><th className="px-4 py-3 text-right font-semibold">Event Count</th><th className="px-4 py-3 text-right font-semibold">Drop %</th></tr></thead>
        <tbody className="divide-y divide-line">{rows.map((event) => <tr key={`${funnel.id}-${event.eventName}`} className="transition-colors duration-150 hover:bg-surface-soft">
          <td className="px-4 py-3 text-sm font-semibold tabular-nums text-secondary">{String(event.position + 1).padStart(2, "0")}</td>
          <td className="px-4 py-3 font-mono text-[13px] font-medium text-primary">{event.eventName}</td>
          <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-primary"><span className="inline-block min-w-20 rounded px-2 py-1" style={{ backgroundColor: `color-mix(in srgb, #6366f1 ${Math.round(event.userIntensity * 26)}%, transparent)` }}>{event.activeUsers.toLocaleString()}</span></td>
          <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-primary">{event.eventCount.toLocaleString()}</td>
          <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-primary"><span className="inline-block min-w-16 rounded px-2 py-1" style={{ backgroundColor: event.drop === null ? "transparent" : `color-mix(in srgb, ${event.dropColor} ${Math.round(event.dropIntensity * 32)}%, transparent)` }}>{event.drop === null ? "—" : event.drop > 0 ? <span className="font-bold text-rose-600 dark:text-rose-400">{`-${event.drop.toFixed(1)}%`}</span> : `${event.drop.toFixed(1)}%`}</span></td>
        </tr>)}</tbody>
      </table></div>}
    </Card>
  );
};

const funnelSchema = z.object({ appId: z.string().min(1, "Select an application"), name: z.string().trim().min(1, "Enter a funnel name").max(120), events: z.array(z.string().trim().min(1).max(200)).min(1).max(500) });

export function FunnelsPage(props: Props) {
  const { apps, loading: appsLoading } = useApplications();
  const [features, setFeatures] = useState<Array<{ app: Application; feature: Feature }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [appId, setAppId] = useState("");
  const [name, setName] = useState("");
  const [eventText, setEventText] = useState("");
  const [startDate] = useState(daysAgo(29));
  const [endDate] = useState(today());
  const [knownEvents, setKnownEvents] = useState<string[] | null>(null);
  const [validated, setValidated] = useState(false);
  const [editing, setEditing] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useWorkspace();
  const app = apps.find((item) => item.id === appId);
  const inputEvents = useMemo(() => eventText.split(/\r?\n/).map((event) => event.trim()).filter(Boolean), [eventText]);
  const uniqueEvents = useMemo(() => [...new Set(inputEvents)], [inputEvents]);
  const duplicateEvents = useMemo(() => [...new Set(inputEvents.filter((event, index) => inputEvents.indexOf(event) !== index))], [inputEvents]);
  const missingEvents = knownEvents ? uniqueEvents.filter((event) => !knownEvents.includes(event)) : [];

  const loadFeatures = useCallback(async () => {
    if (!apps.length) { setFeatures([]); return; }
    setLoading(true);
    try {
      const result = await Promise.all(apps.map(async (selectedApp) => (await services.features(selectedApp.id)).map((feature) => ({ app: selectedApp, feature }))));
      setFeatures(result.flat());
      setError("");
    } catch (loadError) { setError(messageFrom(loadError)); throw loadError; }
    finally { setLoading(false); }
  }, [apps]);
  useEffect(() => { if (!appId && apps[0]) setAppId(searchParams.get("app") ?? apps[0].id); }, [apps, appId, searchParams]);
  useEffect(() => { void loadFeatures().catch(() => undefined); }, [loadFeatures]);
  useRegisterRefresh(loadFeatures, [loadFeatures]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) { setEditing(""); return; }
    const row = features.find((item) => item.feature.id === editId);
    if (!row) return;
    setEditing(editId);
    setAppId(row.app.id);
    setName(row.feature.name);
    setEventText(row.feature.events.slice().sort((a, b) => a.position - b.position).map((event) => event.eventName).join("\n"));
    setKnownEvents(null);
    setValidated(true);
  }, [features, searchParams]);

  const filteredFeatures = features.filter((row) => row.feature.name.toLowerCase().includes((searchParams.get("search") ?? "").trim().toLowerCase()));
  const closeEditor = () => {
    setEditing(""); setName(""); setEventText(""); setKnownEvents(null); setValidated(false);
    const next = new URLSearchParams(searchParams); next.delete("edit"); setSearchParams(next, { replace: true });
  };
  const validateEvents = async () => {
    if (!appId || !app?.ga4PropertyId) { setError("Select an app with a GA4 Property ID to validate events."); return; }
    setBusy(true); setError("");
    try {
      setKnownEvents(await services.discoverEvents(appId, startDate, endDate, ""));
      setValidated(true);
    } catch (validationError) { setError(messageFrom(validationError)); }
    finally { setBusy(false); }
  };
  const saveFunnel = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = funnelSchema.safeParse({ appId, name, events: uniqueEvents });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Complete all required fields."); return; }
    if (!validated && props.googleConnected && app?.ga4PropertyId) { setError("Validate events before saving this funnel."); return; }
    setBusy(true); setError("");
    try {
      const feature = editing ? await services.updateFeature(editing, parsed.data.name, parsed.data.events) : await services.createFeature(appId, parsed.data.name, parsed.data.events);
      setFeatures((current) => {
        const without = current.filter((row) => row.feature.id !== feature.id);
        const targetApp = apps.find((item) => item.id === appId)!;
        return [...without, { app: targetApp, feature }];
      });
      toast(editing ? "Funnel updated successfully." : "Funnel saved successfully.");
      closeEditor();
    } catch (saveError) { setError(messageFrom(saveError)); }
    finally { setBusy(false); }
  };
  const duplicateFunnel = async (row: { app: Application; feature: Feature }) => {
    try {
      const duplicate = await services.createFeature(row.app.id, `${row.feature.name} copy`, row.feature.events.slice().sort((a, b) => a.position - b.position).map((item) => item.eventName));
      setFeatures((current) => [...current, { app: row.app, feature: duplicate }]);
      toast("Funnel duplicated.");
    } catch (duplicateError) { setError(messageFrom(duplicateError)); }
  };
  const deleteFunnel = async () => {
    if (!pendingDelete) return;
    try {
      await services.deleteFeature(pendingDelete.id);
      setFeatures((current) => current.filter((row) => row.feature.id !== pendingDelete.id));
      if (editing === pendingDelete.id) closeEditor();
      toast("Funnel deleted.");
      setPendingDelete(null);
    } catch (deleteError) { setError(messageFrom(deleteError)); }
  };
  const reorder = (index: number, delta: number) => {
    const next = [...uniqueEvents];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setEventText(next.join("\n"));
    setValidated(true);
  };

  return (
    <AppShell profile={props.profile} googleConnected={props.googleConnected} onLogout={props.onLogout}>
      <PageTitle title="Create Funnels" action={<button className="button-primary" onClick={() => { closeEditor(); document.getElementById("funnel-editor")?.scrollIntoView({ behavior: "smooth" }); }}><Plus size={15} /> Create Funnel</button>} />
      {error && <div className="mb-4"><Alert>{error}<button className="ml-auto" onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></Alert></div>}
      <div id="funnel-editor" className="grid gap-5">
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between"><div><h2 className="text-sm font-semibold text-primary">{editing ? "Edit funnel" : "New funnel"}</h2><p className="mt-1 text-xs text-secondary">Add one event name per line; order is preserved.</p></div>{editing && <button className="button-secondary !px-2.5 !py-2 !text-xs" onClick={closeEditor}><X size={14} />Cancel</button>}</div>
          <form onSubmit={(event) => void saveFunnel(event)} className="space-y-4">
            <div className="grid grid-cols-2 items-end gap-4">
              <div><label className="label" htmlFor="funnel-app">Application</label><ApplicationPicker id="funnel-app" apps={apps} value={appId} disabled={Boolean(editing)} onChange={(value) => { setAppId(value); setKnownEvents(null); setValidated(false); }} /></div>
              <div><label className="label" htmlFor="funnel-name">Funnel name</label><input id="funnel-name" className="field" maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Onboarding" /></div>
            </div>
            <div><div className="mb-1.5 flex items-center justify-between"><label className="label mb-0" htmlFor="funnel-events">Events</label><span className="text-xs text-muted">{inputEvents.length} detected</span></div><textarea id="funnel-events" className="field min-h-[180px] resize-y font-mono text-[13px] leading-6" value={eventText} onChange={(event) => { setEventText(event.target.value); setValidated(false); }} placeholder={"Enter one GA4 event name per line\n\nExample:\nsplash_launch\nonboarding_started\nonboarding_next\nonboarding_completed"} /><p className="mt-1.5 text-xs text-muted">Paste 1–500 events. Whitespace is trimmed, blank lines ignored, exact names and order preserved.</p></div>
            {duplicateEvents.length > 0 && <Alert kind="info"><CircleAlert size={15} />Repeated names will be saved once: {duplicateEvents.join(", ")}</Alert>}
            {validated && missingEvents.length > 0 && <Alert kind="info"><CircleAlert size={15} /><span>Not found in the available GA4 data: {missingEvents.join(", ")}. These names may still be valid; they can be saved as entered.</span></Alert>}
            {validated && <div className="max-h-72 overflow-y-auto rounded-lg border border-line"><div className="border-b border-line bg-surface-soft px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Ordered events · {uniqueEvents.length}</div><ol className="divide-y divide-line">{uniqueEvents.map((eventName, index) => <li key={`${eventName}-${index}`} className="flex items-center gap-2 px-3 py-2"><span className="w-6 text-xs tabular-nums text-muted">{index + 1}</span><span className="min-w-0 flex-1 truncate font-mono text-xs text-primary">{eventName}</span><span className={`text-[10px] ${knownEvents && !knownEvents.includes(eventName) ? "text-amber-600" : "text-emerald-600"}`}>{knownEvents?.includes(eventName) ? "Matched" : knownEvents ? "Not found" : "GA4 event"}</span><button type="button" className="rounded p-1 text-muted hover:bg-surface-soft disabled:opacity-30" aria-label={`Move ${eventName} up`} disabled={index === 0} onClick={() => reorder(index, -1)}><ArrowUp size={13} /></button><button type="button" className="rounded p-1 text-muted hover:bg-surface-soft disabled:opacity-30" aria-label={`Move ${eventName} down`} disabled={index === uniqueEvents.length - 1} onClick={() => reorder(index, 1)}><ArrowDown size={13} /></button><button type="button" className="rounded p-1 text-muted hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${eventName}`} onClick={() => setEventText(uniqueEvents.filter((_, position) => position !== index).join("\n"))}><X size={13} /></button></li>)}</ol></div>}
            <div className="flex flex-wrap gap-2"><button type="button" className="button-secondary" disabled={!app?.ga4PropertyId || !props.googleConnected || busy || !uniqueEvents.length} onClick={() => void validateEvents()}><Check size={15} />Validate Events</button><button className="button-primary" disabled={busy || appsLoading}>{busy ? "Saving…" : editing ? "Save Changes" : "Save Funnel"}</button></div>
          </form>
        </Card>
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-primary">Saved Funnels</h2><p className="mt-1 text-xs text-secondary">{features.length} configured</p></div><div className="flex gap-2"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-muted" /><input className="field !py-2 !pl-9 !text-xs" placeholder="Search funnels" value={searchParams.get("search") ?? ""} onChange={(event) => { const next = new URLSearchParams(searchParams); if (event.target.value) next.set("search", event.target.value); else next.delete("search"); setSearchParams(next, { replace: true }); }} /></div><button className="button-secondary !px-2.5 !py-2" onClick={() => void loadFeatures()} aria-label="Refresh saved funnels"><RefreshCw size={15} /></button></div></div>
        {loading || appsLoading ? <Skeleton /> : !filteredFeatures.length ? <Empty title={features.length ? "No funnels match your search" : "No funnels created"} description={features.length ? "Try another search term." : "Create a funnel above to define ordered GA4 events for an application."} /> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-surface-soft text-xs font-semibold uppercase tracking-wide text-secondary"><tr><th className="px-4 py-3.5 font-bold">Funnel Name</th><th className="px-4 py-3.5 font-bold">Application</th><th className="px-4 py-3.5 font-bold">Actions</th></tr></thead><tbody className="divide-y divide-line">{filteredFeatures.map((row) => <tr key={row.feature.id} className="hover:bg-surface-soft/70"><td className="px-4 py-3.5 text-sm font-semibold text-primary">{row.feature.name}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-secondary"><IconTile app={row.app} size="sm" />{row.app.name}</span></td><td className="px-4 py-3"><div className="flex gap-1"><button className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40" onClick={() => { const next = new URLSearchParams(searchParams); next.set("app", row.app.id); next.set("edit", row.feature.id); setAppId(row.app.id); setSearchParams(next); }} title="Edit" aria-label={`Edit ${row.feature.name}`}><Pencil size={14} /></button><button className="rounded-lg p-2 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40" onClick={() => void duplicateFunnel(row)} title="Duplicate" aria-label={`Duplicate ${row.feature.name}`}><Copy size={14} /></button><button className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setPendingDelete({ id: row.feature.id, name: row.feature.name })} title="Delete" aria-label={`Delete ${row.feature.name}`}><Trash2 size={14} /></button><Link className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" to={`/overview?app=${encodeURIComponent(row.app.id)}`} title="View in Overview" aria-label={`View ${row.feature.name} in Overview`}><ArrowRight size={14} /></Link></div></td></tr>)}</tbody></table></div>}
      </Card>
      {pendingDelete && <ConfirmDialog title="Delete funnel?" description={`Delete “${pendingDelete.name}” and its ordered events? This action cannot be undone.`} onCancel={() => setPendingDelete(null)} onConfirm={() => void deleteFunnel()} />}
    </AppShell>
  );
}

function ConfirmDialog({ title, description, onCancel, onConfirm }: { title: string; description: string; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><Card className="w-full max-w-md p-5"><h2 className="text-base font-semibold text-primary">{title}</h2><p className="mt-2 text-sm leading-6 text-secondary">{description}</p><div className="mt-5 flex justify-end gap-2"><button className="button-secondary" onClick={onCancel}>Cancel</button><button className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700" onClick={onConfirm}><Trash2 size={14} />Delete</button></div></Card></div>;
}

const appSchema = z.object({
  name: z.string().trim().min(1, "App name is required").max(120),
  packageName: z.string().trim().regex(/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/, "Enter a valid package or bundle identifier"),
  appUrl: z.string().trim().url("Enter a valid application URL").refine((value) => {
    try { const url = new URL(value); return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password; }
    catch { return false; }
  }, "Enter an HTTP or HTTPS URL without credentials"),
  ga4PropertyId: z.string().trim().regex(/^\d+$/, "Enter a numeric GA4 Property ID"),
  appIconData: z.string().nullable().optional(),
  appIconUrl: z.string().url().nullable().optional(),
});
type AppFormValues = z.infer<typeof appSchema>;

export function ManageAppsPage(props: Props) {
  const { apps, setApps, loading, error, setError, loadApps } = useApplications();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [appUrlValue, setAppUrlValue] = useState("");
  const [iconLookupBusy, setIconLookupBusy] = useState(false);
  const [iconLookupError, setIconLookupError] = useState("");
  const [iconSource, setIconSource] = useState<"google-play" | "upload" | "">("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState("");
  const iconLookupSequence = useRef(0);
  const [iconFetchTick, setIconFetchTick] = useState(0);
  const { toast } = useWorkspace();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AppFormValues>({ resolver: zodResolver(appSchema), defaultValues: { name: "", packageName: "", appUrl: "", ga4PropertyId: "", appIconData: null } });
  const appUrlField = register("appUrl");
  useRegisterRefresh(loadApps, [loadApps]);
  const filteredApps = apps.filter((app) => `${app.name} ${app.packageName ?? ""} ${app.appUrl ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));

  useEffect(() => {
    if (!dialogOpen || !appUrlValue || iconSource !== "") return;
    let candidate: URL;
    try { candidate = new URL(appUrlValue); } catch { return; }
    if (candidate.hostname !== "play.google.com" || candidate.pathname !== "/store/apps/details") return;
    const requestId = ++iconLookupSequence.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        setIconLookupBusy(true);
        setIconLookupError("");
        try {
          const icon = await services.googlePlayIcon(appUrlValue);
          if (requestId !== iconLookupSequence.current) return;
          await new Promise<void>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("The selected Play Store icon did not load. Upload an icon instead."));
            image.src = icon.appIconUrl;
          });
          if (requestId !== iconLookupSequence.current) return;
          setValue("packageName", icon.packageName, { shouldValidate: true });
          setValue("appIconUrl", icon.appIconUrl, { shouldValidate: true });
          setValue("appIconData", null, { shouldValidate: true });
          setIconPreview(icon.appIconUrl);
          setIconSource("google-play");
        } catch (lookupError) {
          if (requestId === iconLookupSequence.current) setIconLookupError(messageFrom(lookupError));
        } finally {
          if (requestId === iconLookupSequence.current) setIconLookupBusy(false);
        }
      })();
    }, iconFetchTick ? 0 : 650);
    return () => {
      window.clearTimeout(timer);
      if (requestId === iconLookupSequence.current) iconLookupSequence.current += 1;
    };
  }, [appUrlValue, dialogOpen, iconSource, iconFetchTick, setValue]);

  function openForm(app?: Application) {
    const target = app ?? null;
    setEditingApp(target);
    setFormError("");
    setIconPreview(target?.appIconData || target?.appIconUrl || null);
    setAppUrlValue(target?.appUrl ?? "");
    setIconLookupError("");
    setIconLookupBusy(false);
    setIconSource(target?.appIconData ? "upload" : target?.appIconUrl ? "google-play" : "");
    reset({ name: target?.name ?? "", packageName: target?.packageName ?? "", appUrl: target?.appUrl ?? "", ga4PropertyId: target?.ga4PropertyId ?? "", appIconData: target?.appIconData ?? null, appIconUrl: target?.appIconUrl ?? null });
    setDialogOpen(true);
  }
  function closeForm() { iconLookupSequence.current += 1; setDialogOpen(false); setEditingApp(null); setFormError(""); setIconLookupBusy(false); }

  async function handleIconFile(file?: File) {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) { setFormError("Use a PNG, JPG, or WebP app icon."); return; }
    if (file.size > 512 * 1024) { setFormError("App icons must be 512 KB or smaller."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") { setFormError("Could not read the selected icon."); return; }
      setIconPreview(reader.result);
      setIconLookupBusy(false);
      setIconSource("upload");
      setValue("appIconData", reader.result, { shouldValidate: true });
      setValue("appIconUrl", null, { shouldValidate: true });
      setFormError("");
    };
    reader.onerror = () => setFormError("Could not read the selected icon.");
    reader.readAsDataURL(file);
  }

  async function saveApp(values: AppFormValues) {
    setFormError("");
    setBusy(true);
    try {
      const input: ApplicationInput = { ...values, appIconData: values.appIconData || null, appIconUrl: values.appIconUrl || null };
      const result = editingApp ? await services.updateApp(editingApp.id, input) : await services.createApp(input);
      setApps((items) => editingApp ? items.map((item) => item.id === result.id ? result : item) : [result, ...items]);
      toast(editingApp ? "App updated." : "App added.");
      closeForm();
    } catch (saveError) { setFormError(messageFrom(saveError)); }
    finally { setBusy(false); }
  }

  async function deleteApp() {
    if (!pendingDelete) return;
    try {
      await services.deleteApp(pendingDelete.id);
      setApps((items) => items.filter((item) => item.id !== pendingDelete.id));
      toast("App deleted.");
      setPendingDelete(null);
    } catch (deleteError) { setError(messageFrom(deleteError)); }
  }

  async function testConnection(app: Application) {
    if (!app.ga4PropertyId) { setError(`Add a GA4 Property ID for ${app.name} before testing the connection.`); return; }
    setTesting(app.id); setError("");
    try {
      await services.validateProperty(app.id, app.ga4PropertyId);
      toast(`GA4 connection verified for ${app.name}.`);
    } catch (testError) { setError(messageFrom(testError)); }
    finally { setTesting(""); }
  }

  return (
    <AppShell profile={props.profile} googleConnected={props.googleConnected} onLogout={props.onLogout}>
      <PageTitle title="Manage Apps" subtitle="Manage the applications connected to your GA4 analytics workspace." action={<button className="button-primary" onClick={() => openForm()}><Plus size={15} /> Add App</button>} />
      {error && <div className="mb-4"><Alert>{error}<button className="ml-auto" onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></Alert></div>}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-primary">Applications</h2><p className="mt-1 text-xs text-secondary">{apps.length} apps in this workspace</p></div><div className="flex gap-2"><div className="relative w-full sm:w-64"><Search size={14} className="absolute left-3 top-3 text-muted" /><input className="field !py-2 !pl-9 !text-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search apps" aria-label="Search apps" /></div><button className="button-secondary !px-2.5 !py-2" onClick={() => void loadApps()} aria-label="Refresh apps"><RefreshCw size={15} /></button></div></div>
        {loading ? <Skeleton /> : !filteredApps.length ? <Empty title={apps.length ? "No apps match your search" : "No apps yet"} description={apps.length ? "Try searching by app name, package, or URL." : "Add an app with its GA4 property to start building funnels."} action={!apps.length ? <button className="button-primary" onClick={() => openForm()}><Plus size={15} /> Add App</button> : undefined} /> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-surface-soft text-xs font-semibold uppercase tracking-wide text-secondary"><tr><th className="px-4 py-3.5 font-bold">Icon</th><th className="px-4 py-3.5 font-bold">App Name</th><th className="px-4 py-3.5 font-bold">App URL</th><th className="px-4 py-3.5 font-bold">GA4 Property ID</th><th className="px-4 py-3.5 font-bold">Funnels</th><th className="px-4 py-3.5 font-bold">Status</th><th className="px-4 py-3.5 font-bold">Actions</th></tr></thead>
          <tbody className="divide-y divide-line">{filteredApps.map((app) => <tr key={app.id} className="transition-colors duration-150 hover:bg-surface-soft">
            <td className="px-4 py-3"><IconTile app={app} size="sm" /></td>
            <td className="px-4 py-3 font-medium text-primary">{app.name}</td>
            <td className="max-w-48 px-4 py-3">{app.appUrl ? <a href={app.appUrl} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-indigo-600 hover:underline">{new URL(app.appUrl).host}<ExternalLink size={12} /></a> : <span className="text-muted">—</span>}</td>
            <td className="px-4 py-3 font-mono text-xs text-secondary">{app.ga4PropertyId || "—"}</td>
            <td className="px-4 py-3 tabular-nums text-secondary">{app._count?.features ?? "—"}</td>
            <td className="px-4 py-3"><Status connected={props.googleConnected && Boolean(app.ga4PropertyId)} /></td>
            <td className="px-4 py-3"><div className="flex items-center gap-1">
              <button className="rounded-md p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => openForm(app)} title="Edit" aria-label={`Edit ${app.name}`}><Pencil size={14} /></button>
              <button className="rounded-md p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => void testConnection(app)} disabled={testing === app.id} title="Test connection" aria-label={`Test connection for ${app.name}`}><RefreshCw size={14} className={testing === app.id ? "animate-spin" : ""} /></button>
              <button className="rounded-md p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => setPendingDelete(app)} title="Delete" aria-label={`Delete ${app.name}`}><Trash2 size={14} /></button>
            </div></td>
          </tr>)}</tbody>
        </table></div>}
      </Card>
      {dialogOpen && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}><Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-base font-semibold text-primary">{editingApp ? "Edit app" : "Add app"}</h2><p className="mt-1 text-xs text-secondary">Connect your product to its GA4 Property ID.</p></div><button className="rounded p-1.5 text-muted hover:bg-surface-soft" onClick={closeForm} aria-label="Close dialog"><X size={17} /></button></div>
        <form onSubmit={(event) => void handleSubmit(saveApp)(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label" htmlFor="app-name">App name</label><input id="app-name" className="field" placeholder="Fitness Pro" {...register("name")} />{errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}</div>
          <div><label className="label" htmlFor="app-package">Package name</label><input id="app-package" className="field" placeholder="com.example.fitness" {...register("packageName")} />{errors.packageName && <p className="mt-1 text-xs text-rose-600">{errors.packageName.message}</p>}</div>
          <div><label className="label" htmlFor="app-url">Play Store URL</label><input id="app-url" className="field" type="url" placeholder="https://play.google.com/store/apps/details?id=com.example.app" name={appUrlField.name} ref={appUrlField.ref} onBlur={appUrlField.onBlur} onChange={(event) => { void appUrlField.onChange(event); const value = event.target.value; setAppUrlValue(value); setIconLookupError(""); setIconLookupBusy(false); if (iconSource === "google-play") { setIconSource(""); setIconPreview(null); setValue("appIconUrl", null); setValue("appIconData", null); } }} />{errors.appUrl && <p className="mt-1 text-xs text-rose-600">{errors.appUrl.message}</p>}</div>
          <div><label className="label" htmlFor="app-property">GA4 Property ID</label><input id="app-property" className="field" inputMode="numeric" placeholder="412345678" {...register("ga4PropertyId")} />{errors.ga4PropertyId && <p className="mt-1 text-xs text-rose-600">{errors.ga4PropertyId.message}</p>}</div>
          <div><label className="label" htmlFor="app-icon">App icon</label><div className="flex flex-wrap items-center gap-3"><label htmlFor="app-icon" className="button-secondary cursor-pointer"><ImagePlus size={15} />Upload fallback</label><input id="app-icon" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleIconFile(event.target.files?.[0])} />{iconPreview ? <img src={iconPreview} alt="App icon preview" className="h-10 w-10 rounded-lg border border-line object-cover" onError={() => { if (iconSource === "google-play") { setIconPreview(null); setValue("appIconUrl", null); setIconLookupError("The app icon could not be loaded. Upload an icon instead."); } }} /> : <span className="text-xs text-muted">No icon selected</span>}{iconPreview && <button type="button" className="text-xs text-rose-600 hover:text-rose-700" onClick={() => { setIconPreview(null); setIconSource(""); setValue("appIconData", null); setValue("appIconUrl", null); }}>Remove icon</button>}</div>{iconLookupBusy && <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-secondary" role="status"><RefreshCw size={13} className="animate-spin" />Checking Google Play icon…</p>}{iconLookupError && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{iconLookupError}</p>}<input type="hidden" {...register("appIconData")} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="app-icon-url">App icon URL</label><div className="flex gap-2"><input id="app-icon-url" className="field font-mono text-xs" type="url" placeholder="Fetched automatically from the Play Store URL" {...register("appIconUrl", { onChange: (event) => { const value = event.target.value.trim(); setIconPreview(value || null); setIconSource(value ? "google-play" : ""); if (value) setValue("appIconData", null); } })} /><button type="button" className="button-secondary shrink-0" disabled={iconLookupBusy || !appUrlValue} onClick={() => { setIconLookupError(""); setIconSource(""); setValue("appIconUrl", null); setIconPreview(null); setIconFetchTick((n) => n + 1); }}><RefreshCw size={14} className={iconLookupBusy ? "animate-spin" : ""} />Fetch icon</button></div><p className="mt-1 text-[11px] text-muted">Enter the Play Store URL above, then fetch the official icon.</p></div>
          {formError && <div className="sm:col-span-2"><Alert>{formError}</Alert></div>}
          <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2"><button type="button" className="button-secondary" onClick={closeForm}>Cancel</button><button className="button-primary" disabled={busy}>{busy ? "Saving…" : editingApp ? "Save changes" : "Save app"}</button></div>
        </form></Card></div>}
      {pendingDelete && <ConfirmDialog title="Delete app?" description={`Delete “${pendingDelete.name}” and its funnels, cached analytics, and sync data? This cannot be undone.`} onCancel={() => setPendingDelete(null)} onConfirm={() => void deleteApp()} />}
    </AppShell>
  );
}

