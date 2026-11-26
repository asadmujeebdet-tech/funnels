import { ShieldCheck } from "lucide-react";
import { googleAuthUrl } from "../services/api";

type Props = { eyebrow: string; title: string; subtitle: string; googleConnected: boolean };

export function PageHeader({ eyebrow, title, subtitle, googleConnected }: Props) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
        <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
      </div>
      {googleConnected
        ? <span className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"><ShieldCheck size={15} /> Google connected</span>
        : <a className="button-primary self-start" href={googleAuthUrl}>Connect Google Analytics</a>}
    </div>
  );
}
