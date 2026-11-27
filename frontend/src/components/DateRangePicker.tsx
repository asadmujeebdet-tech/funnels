import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = { start: string; end: string; max: string; onChange: (start: string, end: string) => void };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (v: string) => { const [y, m, d] = v.split("-").map(Number); return new Date(y!, m! - 1, d!); };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt = (v: string) => parse(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

function presets(max: string) {
  const t = parse(max);
  const monthStart = new Date(t.getFullYear(), t.getMonth(), 1);
  const lastMonthStart = new Date(t.getFullYear(), t.getMonth() - 1, 1);
  const lastMonthEnd = new Date(t.getFullYear(), t.getMonth(), 0);
  return [
    { label: "Today", range: [iso(t), iso(t)] },
    { label: "Yesterday", range: [iso(addDays(t, -1)), iso(addDays(t, -1))] },
    { label: "Last 7 days", range: [iso(addDays(t, -6)), iso(t)] },
    { label: "Last 14 days", range: [iso(addDays(t, -13)), iso(t)] },
    { label: "Last 30 days", range: [iso(addDays(t, -29)), iso(t)] },
    { label: "Last 90 days", range: [iso(addDays(t, -89)), iso(t)] },
    { label: "This month", range: [iso(monthStart), iso(t)] },
    { label: "Last month", range: [iso(lastMonthStart), iso(lastMonthEnd)] },
  ] as const;
}

function Month({ year, month, from, to, hover, max, onPick, onHover }: { year: number; month: number; from: string; to: string; hover: string; max: string; onPick: (v: string) => void; onHover: (v: string) => void }) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => iso(new Date(year, month, i + 1)))];
  const rangeEnd = to || hover;
  const [lo, hi] = rangeEnd && rangeEnd < from ? [rangeEnd, from] : [from, rangeEnd];
  return (
    <div className="w-[224px]">
      <p className="mb-2 text-center text-sm font-semibold text-primary">{MONTHS[month]} {year}</p>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted">{WEEK.map((w, i) => <span key={i} className="py-1">{w}</span>)}</div>
      <div className="grid grid-cols-7">
        {cells.map((value, i) => {
          if (!value) return <span key={i} />;
          const disabled = value > max;
          const isEdge = value === lo || value === hi;
          const inRange = lo && hi && value > lo && value < hi;
          return (
            <button key={value} type="button" disabled={disabled} onClick={() => onPick(value)} onMouseEnter={() => onHover(value)}
              className={`h-8 text-xs tabular-nums transition-colors ${isEdge ? "rounded-full bg-indigo-600 font-semibold text-white" : inRange ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200" : "rounded-full text-primary hover:bg-surface-soft"} ${disabled ? "cursor-not-allowed opacity-30" : ""}`}>
              {Number(value.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ start, end, max, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);
  const [hover, setHover] = useState("");
  const [view, setView] = useState(() => { const d = parse(end); return { y: d.getFullYear(), m: d.getMonth() }; });
  const root = useRef<HTMLDivElement>(null);
  const list = useMemo(() => presets(max), [max]);
  const active = list.find((p) => p.range[0] === start && p.range[1] === end)?.label ?? "Custom";

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  function toggle() {
    if (!open) { setFrom(start); setTo(end); setHover(""); const d = parse(end); setView({ y: d.getFullYear(), m: d.getMonth() - 1 }); }
    setOpen((o) => !o);
  }
  function pick(value: string) {
    if (!from || to) { setFrom(value); setTo(""); return; }
    if (value < from) { setTo(from); setFrom(value); } else setTo(value);
  }
  function shift(n: number) { const d = new Date(view.y, view.m + n, 1); setView({ y: d.getFullYear(), m: d.getMonth() }); }
  const next = new Date(view.y, view.m + 1, 1);
  const canApply = Boolean(from && to);

  return (
    <div ref={root} className="relative">
      <button type="button" className="field flex h-[42px] items-center gap-2 !py-0 text-left" aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <CalendarDays size={15} className="shrink-0 text-muted" />
        <span className="truncate text-sm text-primary">{fmt(start)} – {fmt(end)}</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Select date range" className="absolute right-0 top-full z-50 mt-2 flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl md:flex-row">
          <ul className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-line p-2 md:w-40 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
            {[...list, { label: "Custom", range: [from, to] as const }].map((p) => (
              <li key={p.label}>
                <button type="button" className={`w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm ${active === p.label && p.label !== "Custom" || (p.label === "Custom" && active === "Custom") ? "bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200" : "text-secondary hover:bg-surface-soft"}`}
                  onClick={() => { if (p.label === "Custom") return; onChange(p.range[0], p.range[1]); setOpen(false); }}>{p.label}</button>
              </li>
            ))}
          </ul>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2 text-xs">
              <span className="flex-1 rounded-lg border border-line px-3 py-2 text-primary">{from ? fmt(from) : "Start date"}</span>
              <span className="text-muted">–</span>
              <span className="flex-1 rounded-lg border border-line px-3 py-2 text-primary">{to ? fmt(to) : "End date"}</span>
            </div>
            <div className="flex items-start gap-4" onMouseLeave={() => setHover("")}>
              <button type="button" aria-label="Previous month" className="mt-0.5 rounded-lg p-1.5 text-secondary hover:bg-surface-soft" onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
              <Month year={view.y} month={view.m} from={from} to={to} hover={hover} max={max} onPick={pick} onHover={setHover} />
              <div className="hidden md:block"><Month year={next.getFullYear()} month={next.getMonth()} from={from} to={to} hover={hover} max={max} onPick={pick} onHover={setHover} /></div>
              <button type="button" aria-label="Next month" className="mt-0.5 rounded-lg p-1.5 text-secondary hover:bg-surface-soft" onClick={() => shift(1)}><ChevronRight size={16} /></button>
            </div>
            <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
              <button type="button" className="button-secondary !py-2 text-xs" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className="button-primary !py-2 text-xs" disabled={!canApply} onClick={() => { onChange(from, to); setOpen(false); }}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
