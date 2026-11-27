import { Activity, ArrowDown, ArrowUp, ChevronDown, DollarSign, Filter, Megaphone, RefreshCw, Search, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type PaginationState, type SortingState } from "@tanstack/react-table";
import { AppShell } from "../components/AppShell";
import { LazyEChart } from "../components/LazyEChart";
import { services } from "../services/api";
import { daysAgo, messageFrom, today } from "../utils/dates";
import { useRegisterRefresh, useWorkspace } from "../state/WorkspaceContext";
import type { CampaignCostReport, Profile } from "../types";

type Props = { profile: Profile; googleConnected: boolean; onLogout: () => void };
type CampaignRow = CampaignCostReport["campaigns"][number];
type Metric = "cost" | "clicks" | "impressions";

function MetricCard({ label, value, note, icon: Icon, tone }: {
  label: string;
  value: string;
  note?: string;
  icon: typeof DollarSign;
  tone: "blue" | "violet" | "green" | "amber";
}) {
  const tones = { blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", rose: "bg-rose-50 text-rose-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", cyan: "bg-cyan-50 text-cyan-600" };
  return <section className="rounded-2xl border border-line bg-surface p-4 shadow-card"><div className="flex items-center gap-2.5"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon size={16} aria-hidden="true" /></span><p className="truncate text-xs font-medium text-secondary">{label}</p></div><p className="mt-3 truncate text-2xl font-semibold tabular-nums tracking-tight text-primary">{value}</p>{note && <p className="mt-1 truncate text-xs text-muted">{note}</p>}</section>;
}

function currencyFormatter(currency: string | null): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", currencyDisplay: "narrowSymbol", maximumFractionDigits: 2 });
  } catch {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  }
}

export function CampaignsPage({ profile, googleConnected, onLogout }: Props) {
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(daysAgo(1));
  const [, setPreset] = useState("30d");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [report, setReport] = useState<CampaignCostReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchedAt, setFetchedAt] = useState("");
  const [trendMetric, setTrendMetric] = useState<Metric>("cost");
  const [sorting, setSorting] = useState<SortingState>([{ id: "cost", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [campaignMenuOpen, setCampaignMenuOpen] = useState(false);
  const requestSequence = useRef(0);
  const campaignFilterRef = useRef<HTMLDivElement>(null);
  const campaignSearchRef = useRef<HTMLInputElement>(null);
  const { dark } = useWorkspace();

  const loadCampaigns = useCallback(async (notifyErrors = false) => {
    const requestId = ++requestSequence.current;
    if (!googleConnected) {
      setReport(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await services.campaigns(startDate, endDate);
      if (requestId !== requestSequence.current) return;
      setReport(response);
      setFetchedAt(new Date().toISOString());
      setError("");
    } catch (loadError) {
      if (requestId !== requestSequence.current) return;
      setError(messageFrom(loadError));
      if (notifyErrors) throw loadError;
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [googleConnected, startDate, endDate]);
  useRegisterRefresh(() => loadCampaigns(true), [loadCampaigns]);
  useEffect(() => { void loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!campaignMenuOpen) return;
    campaignSearchRef.current?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !campaignFilterRef.current?.contains(event.target)) setCampaignMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [campaignMenuOpen]);

  const money = useMemo(() => currencyFormatter(report?.currency ?? null), [report?.currency]);
  const campaignOptions = useMemo(() => (report?.campaigns ?? []).map((row) => row.campaign), [report]);
  const filteredCampaignOptions = useMemo(() => campaignOptions.filter((name) => name.toLowerCase().includes(debouncedQuery.trim().toLowerCase())), [campaignOptions, debouncedQuery]);
  const matchingCampaigns = useMemo(() => (report?.campaigns ?? []).filter((row) => {
    const matchesText = row.campaign.toLowerCase().includes(debouncedQuery.trim().toLowerCase());
    const matchesSelection = !selectedCampaign || row.campaign === selectedCampaign;
    return matchesText && matchesSelection;
  }), [report, debouncedQuery, selectedCampaign]);

  const trend = useMemo(() => {
    const byDate = new Map<string, { date: string; cost: number | null | undefined; clicks: number | null | undefined; impressions: number | null | undefined }>();
    for (const campaign of matchingCampaigns) {
      for (const point of campaign.trend ?? []) {
        const aggregate = byDate.get(point.date) ?? { date: point.date, cost: undefined, clicks: undefined, impressions: undefined };
        for (const metric of ["cost", "clicks", "impressions"] as const) {
          const value = point[metric];
          if (value === null) aggregate[metric] = null;
          else if (aggregate[metric] !== null) aggregate[metric] = (aggregate[metric] ?? 0) + value;
        }
        byDate.set(point.date, aggregate);
      }
    }
    return [...byDate.values()].map((point) => ({ ...point, cost: point.cost ?? null, clicks: point.clicks ?? null, impressions: point.impressions ?? null })).sort((left, right) => left.date.localeCompare(right.date));
  }, [matchingCampaigns]);

  const columns = useMemo<ColumnDef<CampaignRow>[]>(() => [
    { accessorKey: "campaign", header: "Campaign Name", cell: (info) => <span className="font-medium text-primary">{info.getValue<string>()}</span> },
    { accessorKey: "cost", header: "Cost", cell: (info) => { const value = info.getValue<number | null>(); return <span className="font-semibold tabular-nums text-primary">{value === null ? "—" : money.format(value)}</span>; } },
    { accessorKey: "impressions", header: "Impressions", cell: (info) => info.getValue<number | null>()?.toLocaleString() ?? "—" },
    { accessorKey: "clicks", header: "Clicks", cell: (info) => info.getValue<number | null>()?.toLocaleString() ?? "—" },
    { accessorKey: "ctr", header: "CTR", cell: (info) => { const value = info.getValue<number | null>(); return value === null ? "—" : `${(value * 100).toFixed(1)}%`; } },
    { accessorKey: "cpc", header: "CPC", cell: (info) => { const value = info.getValue<number | null>(); return value === null ? "—" : money.format(value); } },
    {
      id: "costShare",
      header: "Cost Share",
      accessorFn: (row) => report?.totalCost != null && report.totalCost > 0 && row.cost !== null ? row.cost / report.totalCost : null,
      cell: (info) => {
        const share = info.getValue<number | null>();
        return <div className="flex min-w-28 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft"><div className="h-full rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${Math.min((share ?? 0) * 100, 100)}%` }} /></div><span className="w-11 text-right tabular-nums text-muted">{share === null ? "—" : `${(share * 100).toFixed(1)}%`}</span></div>;
      },
    },
  ], [money, report?.totalCost]);

  const table = useReactTable({
    data: matchingCampaigns,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const topCampaign = report?.campaigns[0];
  const trendOption = useMemo(() => ({
    color: [dark ? "#aaa6ff" : "#615eea"],
    animationDurationUpdate: 350,
    grid: { left: 52, right: 24, top: 28, bottom: 42 },
    tooltip: { trigger: "axis", backgroundColor: dark ? "#172235" : "#ffffff", borderColor: dark ? "#36445c" : "#e2e8f0", textStyle: { color: dark ? "#e5eaf4" : "#172033" } },
    xAxis: { type: "category", data: trend.map((point) => point.date), axisLabel: { color: dark ? "#9aa7bc" : "#94a3b8" }, axisLine: { lineStyle: { color: dark ? "#344158" : "#e2e8f0" } } },
    yAxis: { type: "value", axisLabel: { color: dark ? "#9aa7bc" : "#94a3b8" }, splitLine: { lineStyle: { color: dark ? "#29364b" : "#f1f5f9" } } },
    series: [{ type: "line", smooth: true, symbolSize: 5, areaStyle: { opacity: .08 }, data: trend.map((point) => point[trendMetric]) }],
  }), [trend, trendMetric, dark]);

  return (
    <AppShell profile={profile} googleConnected={googleConnected} onLogout={onLogout}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div><h1 className="page-title">Campaigns</h1><p className="mt-1.5 max-w-2xl text-sm text-secondary">Campaign cost and performance across apps with a validated GA4 property.</p></div>
      </div>
      {error && <div className="mb-4"><div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{error}<button className="ml-auto" onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div></div>}
      {!googleConnected && <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 px-3.5 py-3 text-sm text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">Connect Google Analytics to query campaign performance.</div>}

      <div className="sticky top-[64px] z-20 -mx-4 px-4 py-2 sm:-mx-7 sm:px-7">
        <section className="rounded-2xl bg-surface/95 p-3 shadow-md backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-semibold text-secondary"><Filter size={14} />Campaign filters</div>{loading && <span className="inline-flex items-center gap-1.5 text-[11px] text-indigo-600" role="status"><RefreshCw size={12} className="animate-spin" />Updating</span>}</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div ref={campaignFilterRef} className="relative">
              <label className="label" htmlFor="campaign-name-filter">Campaign Name</label>
              <button id="campaign-name-filter" type="button" className="field flex items-center justify-between gap-2 text-left" aria-haspopup="listbox" aria-expanded={campaignMenuOpen} aria-controls="campaign-name-options" onClick={() => setCampaignMenuOpen((open) => !open)}>
                <span className="truncate">{selectedCampaign || "All campaigns"}</span><ChevronDown size={15} className={`shrink-0 text-muted transition-transform duration-150 ${campaignMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {campaignMenuOpen && <div id="campaign-name-options" role="listbox" aria-label="Campaigns" className="absolute left-0 right-0 top-full z-[60] mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-xl">
                <div className="border-b border-line p-2"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-muted" /><input ref={campaignSearchRef} className="field pl-9" placeholder="Search campaigns" value={query} onChange={(event) => { setSelectedCampaign(""); setQuery(event.target.value); setPagination((current) => ({ ...current, pageIndex: 0 })); }} onKeyDown={(event) => { if (event.key === "Escape") setCampaignMenuOpen(false); }} aria-label="Search campaigns" /></div></div>
                <div className="max-h-56 overflow-y-auto p-1">
                  <button type="button" role="option" aria-selected={!selectedCampaign} className="w-full rounded-md px-3 py-2 text-left text-sm text-secondary hover:bg-surface-soft" onClick={() => { setSelectedCampaign(""); setQuery(""); setDebouncedQuery(""); setPagination((current) => ({ ...current, pageIndex: 0 })); setCampaignMenuOpen(false); }}>All campaigns</button>
                  {filteredCampaignOptions.map((name) => <button key={name} type="button" role="option" aria-selected={selectedCampaign === name} className="w-full truncate rounded-md px-3 py-2 text-left text-sm text-primary hover:bg-surface-soft" onClick={() => { setSelectedCampaign(name); setQuery(""); setDebouncedQuery(""); setPagination((current) => ({ ...current, pageIndex: 0 })); setCampaignMenuOpen(false); }}>{name}</button>)}
                  {!filteredCampaignOptions.length && <p className="px-3 py-3 text-xs text-muted">No matching campaigns.</p>}
                </div>
              </div>}
            </div>
            <div><label className="label" htmlFor="campaign-start">From</label><input id="campaign-start" className="field" type="date" value={startDate} max={endDate} onChange={(event) => { setPreset("custom"); setStartDate(event.target.value); }} /></div>
            <div><label className="label" htmlFor="campaign-end">To</label><input id="campaign-end" className="field" type="date" value={endDate} min={startDate} max={today()} onChange={(event) => { setPreset("custom"); setEndDate(event.target.value); }} /></div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(selectedCampaign || query) && <button className="button-secondary !py-2 text-xs" onClick={() => { setSelectedCampaign(""); setQuery(""); setDebouncedQuery(""); setPagination((current) => ({ ...current, pageIndex: 0 })); }}><X size={13} />Clear filters</button>}
          </div>
        </section>
      </div>

      {loading && !report ? <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="skeleton h-28" key={index} />)}</div> : report && <>
        <div className={`grid grid-cols-2 gap-3 xl:grid-cols-4 ${loading ? "opacity-75" : "opacity-100"} transition-opacity duration-200`} aria-busy={loading}>
          <MetricCard label="Total Cost" value={report.totalCost === null ? "—" : money.format(report.totalCost)} note={report.currency ?? "Currency unavailable"} icon={DollarSign} tone="blue" />
          <MetricCard label="Total Campaigns" value={report.campaigns.length.toLocaleString()} note="Unique campaign names" icon={Megaphone} tone="violet" />
          <MetricCard label="Average Cost" value={report.totalCost === null ? "—" : money.format(report.campaigns.length ? report.totalCost / report.campaigns.length : 0)} note="Per campaign" icon={Activity} tone="green" />
          <MetricCard label="Top Campaign" value={topCampaign?.campaign ?? "—"} note={topCampaign?.cost === null || topCampaign === undefined ? "Cost unavailable" : money.format(topCampaign.cost)} icon={TrendingUp} tone="amber" />
        </div>
        <div className={`mt-5 grid gap-5 xl:grid-cols-2 transition-opacity duration-200 ${loading ? "opacity-75" : "opacity-100"}`} aria-busy={loading}>
          <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-semibold text-primary">Cost by Campaign</h2><p className="mt-1 text-xs text-secondary">Top campaigns · {report.startDate} – {report.endDate}</p></div>
            {matchingCampaigns.length ? <div className="p-4"><LazyEChart style={{ height: Math.max(260, Math.min(12, matchingCampaigns.length) * 34 + 48) }} option={{ animationDurationUpdate: 350, grid: { left: 12, right: 24, top: 8, bottom: 8, containLabel: true }, tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (value: number | null) => value === null ? "—" : money.format(value), backgroundColor: dark ? "#172235" : "#ffffff", borderColor: dark ? "#36445c" : "#e2e8f0", textStyle: { color: dark ? "#e5eaf4" : "#172033" } }, xAxis: { type: "value", axisLabel: { color: dark ? "#9aa7bc" : "#94a3b8" }, splitLine: { lineStyle: { color: dark ? "#29364b" : "#f1f5f9" } } }, yAxis: { type: "category", inverse: true, data: matchingCampaigns.slice(0, 12).map((row) => row.campaign), axisLabel: { color: dark ? "#c1cad9" : "#475569", width: 150, overflow: "truncate" }, axisLine: { show: false }, axisTick: { show: false } }, series: [{ type: "bar", data: matchingCampaigns.slice(0, 12).map((row) => row.cost), barMaxWidth: 22, itemStyle: { borderRadius: [0, 5, 5, 0], color: dark ? "#827cf3" : "#615eea" } }] }} /></div> : <div className="p-5 text-sm text-muted">No matching campaigns for this filter.</div>}
          </section>
          <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h2 className="text-sm font-semibold text-primary">Campaign Cost Trend</h2><p className="mt-1 text-xs text-secondary">Daily performance for matching campaigns.</p></div><label className="sr-only" htmlFor="campaign-trend-metric">Trend metric</label><select id="campaign-trend-metric" className="field !w-auto !py-2 !text-xs" value={trendMetric} onChange={(event) => setTrendMetric(event.target.value as Metric)}><option value="cost">Cost</option><option value="clicks">Clicks</option><option value="impressions">Impressions</option></select></div>
            {trend.length ? <div className="p-4"><LazyEChart style={{ height: 300 }} option={trendOption} /></div> : <div className="p-5 text-sm text-muted">Trend not available for the selected campaigns and dates.</div>}
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-primary">Campaign performance</h2><p className="mt-1 text-xs text-secondary">{matchingCampaigns.length} matching campaigns · updated {fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : "—"}</p></div></div>
          {!matchingCampaigns.length ? <div className="px-5 py-10 text-center"><h3 className="text-sm font-semibold text-primary">{report.campaigns.length ? "No campaigns match these filters" : "No campaign data available"}</h3><p className="mt-1 text-sm text-secondary">{report.campaigns.length ? "Clear the campaign filters or choose a different date range." : "Check that campaign data is available in the linked GA4 properties."}</p></div> : <>
            <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-surface-soft text-xs font-semibold uppercase tracking-wide text-secondary"><tr>{table.getHeaderGroups()[0]?.headers.map((header) => <th key={header.id} className="px-4 py-3.5 font-bold"><button className={`inline-flex items-center gap-1 ${header.column.getCanSort() ? "hover:text-primary" : ""}`} onClick={header.column.getToggleSortingHandler()} disabled={!header.column.getCanSort()}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === "asc" ? <ArrowUp size={12} /> : header.column.getIsSorted() === "desc" ? <ArrowDown size={12} /> : header.column.getCanSort() ? <ChevronDown size={12} className="opacity-30" /> : null}</button></th>)}</tr></thead>
              <tbody className="divide-y divide-line">{table.getRowModel().rows.map((row) => <tr key={row.id} className="transition-colors duration-150 hover:bg-surface-soft">{row.getVisibleCells().map((cell) => <td key={cell.id} className="px-4 py-3.5 text-sm font-medium text-primary">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody>
            </table></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-secondary">
              <span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}</span>
              <div className="flex items-center gap-2"><label htmlFor="campaign-page-size" className="text-muted">Rows per page</label><select id="campaign-page-size" className="field !w-auto !py-1.5 !text-xs" value={pagination.pageSize} onChange={(event) => table.setPageSize(Number(event.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select><button className="button-secondary !px-2.5 !py-1.5" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">Previous</button><button className="button-secondary !px-2.5 !py-1.5" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">Next</button></div>
            </div>
          </>}
        </section>
      </>}
      {loading && report && <div className="mt-3 text-right text-xs text-muted">Refreshing campaign data…</div>}
    </AppShell>
  );
}
