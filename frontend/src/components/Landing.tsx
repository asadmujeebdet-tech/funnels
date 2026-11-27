import { Activity, ArrowRight, BarChart3, Lock, Workflow } from "lucide-react";
import { googleAuthUrl } from "../services/api";

const features = [
  { icon: Workflow, title: "Ordered feature journeys", text: "Organize GA4 events around the product experiences you want to understand." },
  { icon: Activity, title: "Event population analysis", text: "Compare active-user populations and event counts for a selected period." },
  { icon: BarChart3, title: "Real GA4 data", text: "Use your connected Google Analytics property without fabricated demo metrics." },
];

export function Landing() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center py-10">
      <header className="mb-14 flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-sm font-semibold text-primary">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-glow"><Workflow size={18} /></span>
          Journey Analytics
        </span>
        <a className="button-secondary" href={googleAuthUrl}>Sign in</a>
      </header>

      <section className="mx-auto max-w-3xl text-center">
        <span className="chip !border-indigo-100 !bg-indigo-50 !text-indigo-700">GA4 product analytics</span>
        <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-primary sm:text-6xl">
          Understand engagement across <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">every feature</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-secondary">
          Connect Google Analytics, define ordered feature journeys, and inspect event populations using your real GA4 data.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3">
          <a className="button-primary !px-6 !py-3" href={googleAuthUrl}>Continue with Google <ArrowRight size={16} /></a>
          <p className="flex items-center gap-2 text-xs text-muted"><Lock size={13} /> Read-only access. OAuth tokens remain encrypted on the server.</p>
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-6 transition hover:-translate-y-0.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={19} /></span>
            <h2 className="mt-4 text-sm font-semibold text-primary">{title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-secondary">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
