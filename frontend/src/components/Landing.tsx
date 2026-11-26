import { Activity, BarChart3, Lock, Workflow } from "lucide-react";
import { googleAuthUrl } from "../services/api";

export function Landing() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-12 py-10 lg:grid-cols-[1.05fr_.95fr]">
      <div className="max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          <Workflow size={14} /> Journey Analytics
        </span>
        <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
          Understand engagement across every product feature.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-slate-500">
          Connect Google Analytics, define ordered feature journeys, and inspect event populations using your real GA4 data.
        </p>
        <a className="button-primary mt-8 px-5 py-3" href={googleAuthUrl}><BarChart3 size={16} /> Continue with Google</a>
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Lock size={13} /> Read-only access. OAuth tokens remain encrypted on the server.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-5">
          <div><p className="text-sm font-semibold text-slate-800">Feature journey analysis</p><p className="mt-1 text-xs text-slate-500">A workspace for product analytics teams</p></div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Activity size={20} /></span>
        </div>
        {[
          { icon: Workflow, title: "Ordered feature journeys", text: "Organize GA4 events around the product experiences you want to understand." },
          { icon: Activity, title: "Event population analysis", text: "Compare active-user populations and event counts for a selected period." },
          { icon: BarChart3, title: "Real GA4 data", text: "Use your connected Google Analytics property without fabricated demo metrics." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4 border-b border-slate-100 py-4 last:border-0 last:pb-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-indigo-600"><Icon size={18} /></span>
            <div><p className="text-sm font-medium text-slate-800">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
