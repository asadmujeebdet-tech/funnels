import { BarChart3, LineChart, Lock, Megaphone } from "lucide-react";
import { googleAuthUrl } from "../services/api";

export function Landing() {
  return (
    <div className="mx-auto mt-10 grid max-w-5xl items-center gap-10 lg:mt-20 lg:grid-cols-2">
      <div className="animate-rise">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          <BarChart3 size={14} /> GA4 Journey Analytics
        </span>
        <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
          See how users move through <span className="bg-gradient-to-r from-accent to-sky-500 bg-clip-text text-transparent">every feature.</span>
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-slate-500">
          Connect Google Analytics once, organize ordered events by feature, and track Google Ads campaign cost in one clean workspace.
        </p>
        <a className="button-primary mt-8 px-6 py-3" href={googleAuthUrl}>Continue with Google</a>
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Lock size={13} /> Read-only access. You sign in once — tokens stay encrypted on the server.</p>
      </div>
      <div className="card space-y-3 p-6">
        {[
          { icon: LineChart, title: "Feature journeys", text: "Compare active users and event counts across ordered events." },
          { icon: Megaphone, title: "Campaign cost", text: "Google Ads campaigns with cost, straight from your GA4 property." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4 rounded-xl bg-slate-50 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-accent shadow-sm"><Icon size={19} /></span>
            <div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
