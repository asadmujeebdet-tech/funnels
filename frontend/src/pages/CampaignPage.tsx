import { CalendarDays, ChevronDown, CircleAlert, Megaphone, Wallet } from "lucide-react";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { Landing } from "../components/Landing";
import { PageHeader } from "../components/PageHeader";
import { services } from "../services/api";
import { daysAgo, messageFrom, today } from "../utils/dates";
import type { Application, CampaignCostReport, Profile } from "../types";

type Props = { profile: Profile | null; googleConnected: boolean; onLogout: () => void };

export function CampaignPage({ profile, googleConnected, onLogout }: Props) {
  const [apps, setApps] = useState<Application[]>([]);
  const [appId, setAppId] = useState("");
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today());
  const [report, setReport] = useState<CampaignCostReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const app = apps.find((item) => item.id === appId);
  const money = useMemo(() => {
    const currency = report?.currency;
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 });
    } catch {
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    }
  }, [report?.currency]);

  useEffect(() => {
    if (!profile) return;
    services.apps().then((result) => {
      setApps(result);
      const first = result.find((item) => item.ga4PropertyId) ?? result[0];
      if (first) setAppId(first.id);
    }).catch((e: unknown) => setError(messageFrom(e)));
  }, [profile]);

  useEffect(() => {
    if (!appId || !app?.ga4PropertyId || !googleConnected) {
      setReport(null);
      return;
    }
    setLoading(true);
    setError("");
    services.campaigns(appId, startDate, endDate)
      .then(setReport)
      .catch((e: unknown) => { setReport(null); setError(messageFrom(e)); })
      .finally(() => setLoading(false));
  }, [appId, app?.ga4PropertyId, googleConnected, startDate, endDate]);

  const rows = useMemo(
    () => (report?.campaigns ?? []).filter((row) => row.campaign.toLowerCase().includes(query.trim().toLowerCase())),
    [report, query],
  );
  const topCampaign = report?.campaigns[0];

  if (!profile) {
    return <AppShell profile={null} onLogout={onLogout}><Landing /></AppShell>;
  }

  return (
    <AppShell profile={profile} onLogout={onLogout}>
      <PageHeader eyebrow="Google Ads" title="Campaign cost" subtitle="Ad cost by Google Ads campaign, pulled from your linked GA4 property." googleConnected={googleConnected} />

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />{error}
          <button className="ml-auto" onClick={() => setError("")} aria-label="Dismiss">×</button>
        </div>
      )}

      <section className="card p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="campaign-app">Application</label>
            <div className="relative">
              <select id="campaign-app" className="field appearance-none pr-9" value={appId} onChange={(e) => setAppId(e.target.value)}>
                <option value="">Select an application</option>
                {apps.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={16} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="campaign-start">Start date</label>
            <div className="relative"><CalendarDays className="absolute left-3.5 top-3.5 text-slate-400" size={16} /><input id="campaign-start" className="field pl-10" type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          </div>
          <div>
            <label className="label" htmlFor="campaign-end">End date</label>
            <div className="relative"><CalendarDays className="absolute left-3.5 top-3.5 text-slate-400" size={16} /><input id="campaign-end" className="field pl-10" type="date" value={endDate} min={startDate} max={today()} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
        </div>
      </section>

      {app && !app.ga4PropertyId && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">Add a GA4 property ID for this application on the Journeys page first.</div>
      )}

      {loading && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28" />)}</div>
      )}

      {report && !loading && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={Wallet} label="Total cost" value={money.format(report.totalCost)} />
            <Stat icon={Megaphone} label="Campaigns" value={report.campaigns.length.toLocaleString()} />
            <Stat icon={Wallet} label="Top campaign" value={topCampaign ? money.format(topCampaign.cost) : "—"} hint={topCampaign?.campaign} />
          </div>

          {report.campaigns.length === 0 ? (
            <div className="card border-dashed p-10 text-center text-sm text-slate-500">
              No Google Ads campaign cost for this period. Make sure Google Ads is linked to this GA4 property and cost data import is enabled.
            </div>
          ) : (
            <>
              <section className="card p-5 sm:p-6">
                <h2 className="font-bold">Cost by campaign</h2>
                <p className="mt-1 text-xs text-slate-500">Top {Math.min(10, report.campaigns.length)} campaigns · {report.startDate} – {report.endDate}</p>
                <ReactECharts
                  style={{ height: Math.max(260, Math.min(10, report.campaigns.length) * 38 + 40) }}
                  notMerge
                  option={{
                    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
                    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => money.format(v) },
                    xAxis: { type: "value", axisLabel: { color: "#94a3b8" }, splitLine: { lineStyle: { color: "#eef2f7" } } },
                    yAxis: { type: "category", inverse: true, data: report.campaigns.slice(0, 10).map((r) => r.campaign), axisLabel: { color: "#475569", width: 160, overflow: "truncate" }, axisLine: { show: false }, axisTick: { show: false } },
                    series: [{ type: "bar", data: report.campaigns.slice(0, 10).map((r) => r.cost), barMaxWidth: 20, itemStyle: { borderRadius: [0, 6, 6, 0], color: { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#818cf8" }, { offset: 1, color: "#5b5bf0" }] } } }],
                  }}
                />
              </section>

              <section className="card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <h2 className="font-bold">All campaigns</h2>
                  <input className="field sm:max-w-xs" placeholder="Search campaigns…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search campaigns" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr><th className="px-6 py-3 font-semibold">Campaign</th><th className="px-6 py-3 text-right font-semibold">Cost</th><th className="w-40 px-6 py-3 font-semibold">Share</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => {
                        const share = report.totalCost ? (row.cost / report.totalCost) * 100 : 0;
                        return (
                          <tr key={row.campaign} className="transition hover:bg-slate-50/70">
                            <td className="px-6 py-3.5 font-medium text-slate-700">{row.campaign}</td>
                            <td className="px-6 py-3.5 text-right tabular-nums text-slate-700">{money.format(row.cost)}</td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-accent" style={{ width: `${share}%` }} /></div><span className="w-10 text-right text-xs tabular-nums text-slate-500">{share.toFixed(0)}%</span></div>
                            </td>
                          </tr>
                        );
                      })}
                      {rows.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No campaigns match your search.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{label}</p><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent"><Icon size={16} /></span></div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
