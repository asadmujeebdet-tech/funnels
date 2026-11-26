import { BarChart3, LogOut, Sparkles } from "lucide-react";
import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import type { Profile } from "../types";

type Props = PropsWithChildren<{
  profile: Profile | null;
  onLogout: () => void;
}>;

export function AppShell({ profile, onLogout, children }: Props) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white">
              <BarChart3 size={21} />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-tight">Journey Analytics</span>
              <span className="block text-xs text-muted">GA4 feature analyzer</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:flex">
              <Sparkles size={14} /> Event populations
            </span>
            {profile && (
              <>
                <span className="hidden text-sm text-slate-500 md:block">{profile.email}</span>
                <button onClick={onLogout} aria-label="Log out" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-ink">
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
