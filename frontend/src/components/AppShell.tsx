import { BarChart3, LogOut, Megaphone, Workflow } from "lucide-react";
import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import type { Profile } from "../types";

type Props = PropsWithChildren<{
  profile: Profile | null;
  onLogout: () => void;
}>;

const nav = [
  { to: "/", label: "Journeys", icon: Workflow, end: true },
  { to: "/campaign", label: "Campaigns", icon: Megaphone, end: false },
];

function initials(profile: Profile): string {
  return (profile.name || profile.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("");
}

export function AppShell({ profile, onLogout, children }: Props) {
  if (!profile) {
    return <div className="min-h-screen px-4 py-10">{children}</div>;
  }

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-nav px-4 py-5 text-slate-300 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-sky-400 text-white shadow-glow">
            <BarChart3 size={19} />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">Journey Analytics</p>
            <p className="text-[11px] text-slate-500">GA4 workspace</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">{initials(profile)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{profile.name || "Account"}</p>
            <p className="truncate text-[11px] text-slate-500">{profile.email}</p>
          </div>
          <button onClick={onLogout} aria-label="Log out" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex items-center gap-2 text-sm font-bold"><BarChart3 size={18} className="text-accent" /> Journey Analytics</span>
        <div className="flex items-center gap-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} aria-label={label}
              className={({ isActive }) => `rounded-lg p-2 ${isActive ? "bg-accent-soft text-accent" : "text-slate-500"}`}>
              <Icon size={18} />
            </NavLink>
          ))}
          <button onClick={onLogout} aria-label="Log out" className="rounded-lg p-2 text-slate-500"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
