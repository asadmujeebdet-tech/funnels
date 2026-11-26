import { BarChart3, ChevronDown, Grid2X2, LayoutDashboard, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, RefreshCw, Sun, Workflow } from "lucide-react";
import { useState, type PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { Profile } from "../types";
import { useWorkspace } from "../state/WorkspaceContext";

type Props = PropsWithChildren<{
  profile: Profile | null;
  googleConnected?: boolean;
  onLogout: () => void;
}>;

const nav = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/campaigns", label: "Campaigns", icon: BarChart3 },
  { to: "/funnels", label: "Create Funnels", icon: Workflow },
  { to: "/apps", label: "Manage Apps", icon: Grid2X2 },
];

const pageTitles: Record<string, string> = {
  "/overview": "Overview",
  "/campaigns": "Campaigns",
  "/funnels": "Create Funnels",
  "/apps": "Manage Apps",
};

function initials(profile: Profile) {
  return (profile.name || profile.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("");
}

export function AppShell({ profile, onLogout, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { theme, setTheme, refresh, refreshing, toastMessage } = useWorkspace();
  const title = pageTitles[location.pathname] ?? "GA4 Journey Analytics";

  if (!profile) return <div className="min-h-screen bg-app px-4 py-10 text-primary">{children}</div>;
  const themeLabel = theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light";
  const nextTheme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";

  return (
    <div className="min-h-screen bg-app text-primary">
      {mobileOpen && <button className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex ${sidebarCollapsed ? "w-[76px]" : "w-[250px]"} flex-col bg-nav px-4 py-5 text-slate-300 transition-[width,transform] duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-2">
          <NavLink to="/overview" onClick={() => setMobileOpen(false)} aria-label="Journey Analytics Overview" className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-white"><Workflow size={21} /></span>
            {!sidebarCollapsed && <span><span className="block text-sm font-bold tracking-tight text-white">Journey Analytics</span><span className="mt-0.5 block text-[11px] text-slate-400">GA4 Product Analytics</span></span>}
          </NavLink>
        </div>
        <nav className="mt-9 flex-1 space-y-1" aria-label="Primary navigation">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} title={sidebarCollapsed ? label : undefined} aria-label={label} className={({ isActive }) => `flex items-center rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${sidebarCollapsed ? "justify-center" : "gap-3"} ${isActive ? "bg-indigo-500/15 text-indigo-200 ring-1 ring-inset ring-indigo-400/15" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
              <Icon size={17} strokeWidth={1.8} />{!sidebarCollapsed && label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-4">
          <div className={`flex items-center rounded-lg px-2 py-2 ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-200">{initials(profile)}</span>
            {!sidebarCollapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{profile.name || "Account"}</p><p className="truncate text-[11px] text-slate-500">{profile.email}</p></div>}
            <button onClick={onLogout} aria-label="Log out" title="Log out" className={`rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white ${sidebarCollapsed ? "absolute bottom-3 right-2" : ""}`}><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      <div className={sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[250px]"}>
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-secondary hover:bg-surface-soft lg:hidden" aria-label="Open navigation"><Menu size={19} /></button>
            <button onClick={() => setSidebarCollapsed((current) => !current)} className="hidden rounded-lg p-2 text-secondary hover:bg-surface-soft lg:inline-flex" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-primary">{title}</p><p className="hidden text-[11px] text-muted sm:block">Home <span className="px-1.5">/</span> {title}</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button onClick={() => void refresh()} disabled={refreshing} className="button-secondary !px-2.5 !py-2 text-xs sm:!px-3.5" aria-label="Refresh data">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /><span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh Data"}</span>
            </button>
            <button onClick={() => setTheme(nextTheme)} className="button-secondary !p-2" title={`Theme: ${themeLabel}. Click to switch.`} aria-label={`Theme: ${themeLabel}`}>
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <span className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">{initials(profile)}</span>
            <ChevronDown size={14} className="hidden text-muted sm:block" />
          </div>
        </header>
        <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-7 sm:py-8">{children}</main>
      </div>
      {toastMessage && <div role={toastMessage.kind === "error" ? "alert" : "status"} className={`fixed right-4 top-[82px] z-[70] max-w-[min(90vw,440px)] rounded-lg border px-4 py-3 text-sm shadow-lg ${toastMessage.kind === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{toastMessage.message}</div>}
    </div>
  );
}
