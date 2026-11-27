import { ShieldCheck } from "lucide-react";
import { googleAuthUrl } from "../services/api";

type Props = { eyebrow: string; title: string; subtitle: string; googleConnected: boolean };

export function PageHeader({ eyebrow, title, subtitle, googleConnected }: Props) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <span className="chip !border-indigo-100 !bg-indigo-50 !text-indigo-700">{eyebrow}</span>
        <h1 className="page-title mt-3">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-secondary">{subtitle}</p>
      </div>
      {googleConnected
        ? <span className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"><ShieldCheck size={15} /> Google connected</span>
        : <a className="button-primary self-start" href={googleAuthUrl}>Connect Google Analytics</a>}
    </div>
  );
}
