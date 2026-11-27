import { Activity, BarChart3, Workflow } from "lucide-react";

const features = [
  { icon: Workflow, title: "Ordered feature journeys", text: "Organize GA4 events around the product experiences you want to understand." },
  { icon: Activity, title: "Event population analysis", text: "Compare active-user populations and event counts for a selected period." },
  { icon: BarChart3, title: "Real GA4 data", text: "Read analytics from the company's centrally connected GA4 properties." },
];

export function Landing() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center py-10">
      <header className="mb-14 flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-sm font-semibold text-primary">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-glow"><Workflow size={18} /></span>
          Journey Analytics
        </span>
        <span className="chip !border-emerald-100 !bg-emerald-50 !text-emerald-700">Shared team workspace</span>
      </header>
      <section className="mx-auto max-w-3xl text-center">
        <span className="chip !border-indigo-100 !bg-indigo-50 !text-indigo-700">GA4 product analytics</span>
        <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-primary sm:text-6xl">
          Understand engagement across <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">every feature</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-secondary">
          This shared workspace is ready for your Operations team. Connect the company's Google account with read-only Analytics access to load live GA4 data.
        </p>
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
