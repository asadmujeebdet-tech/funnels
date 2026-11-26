import { CalendarDays, Check, ChevronDown, CircleAlert, Database, Plus, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { FeatureForm } from "../components/FeatureForm";
import { JourneyChart } from "../components/JourneyChart";
import { JourneyTable } from "../components/JourneyTable";
import { Landing } from "../components/Landing";
import { PageHeader } from "../components/PageHeader";
import { services } from "../services/api";
import { daysAgo, messageFrom } from "../utils/dates";
import type { Application, Feature, Journey, Profile, SavedReport, SyncJob } from "../types";

type Props = {
  profile: Profile | null;
  googleConnected: boolean;
  onLogout: () => void;
};

export function DashboardPage({ profile, googleConnected, onLogout }: Props) {
  const [apps, setApps] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState("");
  const [journey, setJourney] = useState<Journey | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [eventsDiscovered, setEventsDiscovered] = useState(false);
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [appVersion, setAppVersion] = useState("");
  const [appName, setAppName] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedApp = apps.find((app) => app.id === selectedAppId);
  const selectedFeature = features.find((feature) => feature.id === selectedFeatureId);
  const totalUsers = useMemo(
    () => journey?.events.reduce((sum, event) => sum + event.activeUsers, 0) ?? 0,
    [journey],
  );
  const totalEvents = useMemo(
    () => journey?.events.reduce((sum, event) => sum + event.eventCount, 0) ?? 0,
    [journey],
  );

  useEffect(() => {
    if (!profile) return;
    services.apps().then((result) => {
      setApps(result);
      if (result[0]) {
        setSelectedAppId(result[0].id);
        setPropertyId(result[0].ga4PropertyId ?? "");
      }
    }).catch((loadError: unknown) => setError(messageFrom(loadError)));
  }, [profile]);

  useEffect(() => {
    if (!selectedAppId) {
      setFeatures([]);
      setSelectedFeatureId("");
      setJourney(null);
      return;
    }
    services.features(selectedAppId).then((result) => {
      setFeatures(result);
      setSelectedFeatureId((current) => result.some((feature) => feature.id === current) ? current : result[0]?.id ?? "");
    }).catch((loadError: unknown) => setError(messageFrom(loadError)));
    setEvents([]);
    setJourney(null);
    setPropertyId(apps.find((app) => app.id === selectedAppId)?.ga4PropertyId ?? "");
  }, [selectedAppId, apps]);

  useEffect(() => {
    setEvents([]);
    setEventsDiscovered(false);
  }, [selectedAppId, startDate, endDate, appVersion]);

  useEffect(() => {
    if (!selectedAppId) {
      setSavedReports([]);
      setSyncJobs([]);
      return;
    }
    services.reports(selectedAppId).then(setSavedReports).catch((loadError: unknown) => setError(messageFrom(loadError)));
    services.syncJobs(selectedAppId).then(setSyncJobs).catch((loadError: unknown) => setError(messageFrom(loadError)));
  }, [selectedAppId]);

  useEffect(() => {
    if (!selectedAppId || !syncJobs.some((job) => job.status === "queued" || job.status === "running")) return;
    const timer = window.setInterval(() => {
      services.syncJobs(selectedAppId).then(setSyncJobs).catch((loadError: unknown) => setError(messageFrom(loadError)));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [selectedAppId, syncJobs]);

  useEffect(() => {
    if (!selectedAppId || !selectedFeatureId || !selectedApp?.ga4PropertyId || !googleConnected) {
      setJourney(null);
      return;
    }
    setLoading(true);
    services.journey(selectedAppId, selectedFeatureId, startDate, endDate, appVersion)
      .then(setJourney)
      .catch((loadError: unknown) => {
        setJourney(null);
        setError(messageFrom(loadError));
      })
      .finally(() => setLoading(false));
  }, [selectedAppId, selectedFeatureId, selectedApp?.ga4PropertyId, googleConnected, startDate, endDate, appVersion]);

  async function createApp(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const created = await services.createApp(appName);
      setApps((current) => [created, ...current]);
      setSelectedAppId(created.id);
      setAppName("");
      setNotice("Application created.");
    } catch (createError) {
      setError(messageFrom(createError));
    }
  }

  async function validateProperty(event: FormEvent) {
    event.preventDefault();
    if (!selectedAppId) return;
    setError("");
    try {
      await services.validateProperty(selectedAppId, propertyId);
      setApps((current) => current.map((app) => app.id === selectedAppId ? { ...app, ga4PropertyId: propertyId } : app));
      setNotice("GA4 property access verified.");
    } catch (validationError) {
      setError(messageFrom(validationError));
    }
  }

  async function discoverEvents() {
    if (!selectedAppId) return;
    setError("");
    try {
      const found = await services.discoverEvents(selectedAppId, startDate, endDate, appVersion);
      setEvents(found);
      setEventsDiscovered(true);
      setNotice(`${found.length} events discovered.`);
    } catch (discoveryError) {
      setError(messageFrom(discoveryError));
    }
  }

  async function createFeature(name: string, eventNames: string[]) {
    if (!selectedAppId) return;
    const feature = await services.createFeature(selectedAppId, name, eventNames);
    setFeatures((current) => [...current, feature]);
    setSelectedFeatureId(feature.id);
    setNotice(`Feature created with ${feature.events.length} ordered events.`);
  }

  async function startSync() {
    if (!selectedAppId) return;
    setError("");
    try {
      const job = await services.sync(selectedAppId);
      setSyncJobs((current) => [job, ...current]);
      setNotice("Historical sync started. Check the sync status shortly.");
    } catch (syncError) {
      setError(messageFrom(syncError));
    }
  }

  async function saveReport() {
    if (!selectedAppId || !journey) return;
    const name = window.prompt("Name this report");
    if (!name?.trim()) return;
    try {
      await services.saveReport(selectedAppId, name.trim(), {
        featureId: journey.feature.id,
        startDate,
        endDate,
        appVersion: appVersion || null,
      });
      setSavedReports(await services.reports(selectedAppId));
      setNotice("Report saved.");
    } catch (saveError) {
      setError(messageFrom(saveError));
    }
  }

  if (!profile) {
    return <AppShell profile={null} onLogout={onLogout}><Landing /></AppShell>;
  }

  return (
    <AppShell profile={profile} onLogout={onLogout}>
      <PageHeader eyebrow="Analytics workspace" title="Feature journey analyzer" subtitle="Compare event populations across your product features." googleConnected={googleConnected} />

      {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><CircleAlert size={18} className="mt-0.5 shrink-0" />{error}<button className="ml-auto" onClick={() => setError("")}>×</button></div>}
      {notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><Check size={17} />{notice}<button className="ml-auto" onClick={() => setNotice("")}>×</button></div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Analysis filters</h2>
                <p className="mt-1 text-xs text-slate-500">Choose an application and reporting period.</p>
              </div>
              <Database className="text-slate-400" size={20} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="label" htmlFor="app-select">Application</label>
                <div className="relative">
                  <select id="app-select" className="field appearance-none pr-9" value={selectedAppId} onChange={(event) => setSelectedAppId(event.target.value)}>
                    <option value="">Select an application</option>
                    {apps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={16} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="feature-select">Feature</label>
                <div className="relative">
                  <select id="feature-select" className="field appearance-none pr-9" value={selectedFeatureId} onChange={(event) => setSelectedFeatureId(event.target.value)}>
                    <option value="">Select a feature</option>
                    {features.map((feature) => <option key={feature.id} value={feature.id}>{feature.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={16} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="start-date">Start date</label>
                <div className="relative"><CalendarDays className="absolute left-3.5 top-3.5 text-slate-400" size={16} /><input id="start-date" className="field pl-10" type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></div>
              </div>
              <div>
                <label className="label" htmlFor="end-date">End date</label>
                <div className="relative"><CalendarDays className="absolute left-3.5 top-3.5 text-slate-400" size={16} /><input id="end-date" className="field pl-10" type="date" value={endDate} min={startDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setEndDate(event.target.value)} /></div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-xs">
                <label className="label" htmlFor="version">App version <span className="font-normal normal-case">(optional)</span></label>
                <input id="version" className="field" placeholder="e.g. 2.4.1" value={appVersion} onChange={(event) => setAppVersion(event.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="button-secondary" onClick={() => void discoverEvents()} disabled={!selectedApp?.ga4PropertyId || !googleConnected}><Search size={16} className="mr-2" />Discover events</button>
                <button className="button-secondary" onClick={() => void startSync()} disabled={!selectedApp?.ga4PropertyId || !googleConnected}><RefreshCw size={16} className="mr-2" />Sync 90 days</button>
              </div>
            </div>
            {events.length > 0 && <p className="mt-3 text-xs text-slate-500">Discovered {events.length} GA4 events. New features are validated against this list.</p>}
          </section>

          {journey && (
            <section className="card overflow-hidden">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <h2 className="font-bold">{journey.feature.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">{journey.startDate} – {journey.endDate}{journey.appVersion ? ` · Version ${journey.appVersion}` : ""}</p>
                </div>
                <button className="button-secondary" onClick={() => void saveReport()}>Save report</button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 sm:px-6">
                <Metric label="Events in feature" value={journey.events.length.toString()} />
                <Metric label="Total event count" value={totalEvents.toLocaleString()} />
                <Metric label="Summed active users" value={totalUsers.toLocaleString()} />
              </div>
              <div className="px-3 pb-3 sm:px-6"><JourneyChart journey={journey} /></div>
              <div className="border-t border-slate-100 px-1 sm:px-2"><JourneyTable events={journey.events} /></div>
              <div className="m-4 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 sm:mx-6">
                Population comparison only: active users are reported independently for each event. This is not a user-level sequential funnel, and summed active users can include the same people more than once.
              </div>
            </section>
          )}
          {loading && <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div>}
          {!journey && !loading && selectedFeature && selectedApp?.ga4PropertyId && googleConnected && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No journey data available for the selected filters.</div>
          )}
          {selectedApp && !selectedApp.ga4PropertyId && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">Connect a GA4 property ID to begin discovering events and analyzing journeys.</div>
          )}
          {!selectedFeature && selectedApp && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Create a feature with its ordered GA4 events to view a journey.</div>}
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2"><Plus className="text-accent" size={18} /><h2 className="font-bold">Applications</h2></div>
            <form onSubmit={(event) => void createApp(event)} className="flex gap-2">
              <input className="field min-w-0" aria-label="Application name" placeholder="Application name" value={appName} onChange={(event) => setAppName(event.target.value)} required maxLength={120} />
              <button className="button-primary shrink-0 px-3" aria-label="Create application"><Plus size={18} /></button>
            </form>
            {apps.length === 0 && <p className="mt-3 text-xs leading-5 text-slate-500">Create an application to get started.</p>}
          </section>

          {selectedApp && (
            <>
              <section className="card p-5">
                <div className="mb-4 flex items-center gap-2"><ShieldCheck className="text-accent" size={18} /><h2 className="font-bold">GA4 property</h2></div>
                <form onSubmit={(event) => void validateProperty(event)} className="space-y-3">
                  <div>
                    <label className="label" htmlFor="property-id">Property ID</label>
                    <input id="property-id" inputMode="numeric" pattern="[0-9]+" className="field" placeholder="123456789" value={propertyId} onChange={(event) => setPropertyId(event.target.value)} required />
                  </div>
                  <button className="button-secondary w-full" disabled={!googleConnected}>Verify property access</button>
                  {selectedApp.ga4PropertyId && <p className="text-center text-xs text-emerald-700">Property {selectedApp.ga4PropertyId} is linked</p>}
                </form>
              </section>

              <section className="card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div><h2 className="font-bold">Create feature</h2><p className="mt-1 text-xs text-slate-500">Name + ordered event list</p></div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{features.length} saved</span>
                </div>
                <FeatureForm knownEvents={eventsDiscovered ? events : null} onCreate={createFeature} />
              </section>

              <section className="card p-5">
                <h2 className="font-bold">Historical data</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Sync the last 90 days into Supabase for faster reporting and saved data snapshots.</p>
                <button onClick={() => void startSync()} disabled={!selectedApp.ga4PropertyId || !googleConnected} className="button-secondary mt-4 w-full"><RefreshCw size={15} className="mr-2" />Start synchronization</button>
                {syncJobs[0] && <p className="mt-3 text-xs text-slate-500">Latest sync: <span className="font-semibold capitalize">{syncJobs[0].status}</span>{syncJobs[0].error ? ` · ${syncJobs[0].error}` : ""}</p>}
              </section>

              <section className="card p-5">
                <h2 className="font-bold">Saved reports</h2>
                {savedReports.length === 0
                  ? <p className="mt-2 text-xs text-slate-500">Saved analysis configurations will appear here.</p>
                  : <ul className="mt-3 divide-y divide-slate-100">{savedReports.map((report) => <li key={report.id} className="py-2.5"><p className="text-sm font-semibold text-slate-700">{report.name}</p><p className="mt-1 text-xs text-slate-400">{new Date(report.updatedAt).toLocaleDateString()}</p></li>)}</ul>}
              </section>
            </>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-3.5"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold tracking-tight tabular-nums">{value}</p></div>;
}
