import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { JourneyEvent } from "../types";

export function JourneyTable({ events }: { events: JourneyEvent[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "position", desc: false }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const columns = useMemo<ColumnDef<JourneyEvent>[]>(() => [
    { accessorKey: "position", header: "Step", cell: (info) => String(Number(info.getValue()) + 1).padStart(2, "0") },
    { accessorKey: "eventName", header: "Event" },
    { accessorKey: "activeUsers", header: "Active users", cell: (info) => Number(info.getValue()).toLocaleString() },
    { accessorKey: "eventCount", header: "Event count", cell: (info) => Number(info.getValue()).toLocaleString() },
    {
      id: "dropUsers",
      accessorFn: (row) => {
        const previous = events[row.position - 1];
        return previous ? previous.activeUsers - row.activeUsers : null;
      },
      header: "Drop users",
      cell: (info) => {
        const value = info.getValue<number | null>();
        return value === null ? "—" : value.toLocaleString();
      },
    },
    {
      accessorKey: "dropPercentage",
      header: "Drop %",
      cell: (info) => {
        const value = info.getValue<number | null>();
        return value === null ? "—" : `${value.toFixed(1)}%`;
      },
    },
    {
      id: "conversion",
      accessorFn: (row) => events[0]?.activeUsers ? (row.activeUsers / events[0].activeUsers) * 100 : null,
      header: "Conversion",
      cell: (info) => {
        const value = info.getValue<number | null>();
        return value === null ? "—" : `${value.toFixed(1)}%`;
      },
    },
    {
      id: "status",
      accessorFn: (row) => {
        if (row.position === 0) return "Start";
        const previous = events[row.position - 1];
        if (!previous) return "—";
        return row.activeUsers < previous.activeUsers ? "Drop" : row.activeUsers > previous.activeUsers ? "Increase" : "Flat";
      },
      header: "Status",
      cell: (info) => {
        const value = String(info.getValue());
        const tone = value === "Drop" ? "bg-amber-50 text-amber-700" : value === "Start" ? "bg-indigo-50 text-indigo-700" : value === "Increase" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600";
        return <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${tone}`}>{value}</span>;
      },
    },
  ], [events]);
  const table = useReactTable({
    data: events,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => row.original.eventName.toLowerCase().includes(filterValue.toLowerCase()),
    initialState: { pagination: { pageSize: 25 } },
  });
  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">{events.length.toLocaleString()} ordered events</p>
        <div className="relative w-full sm:max-w-xs"><Search size={14} className="absolute left-3 top-3 text-slate-400" /><input className="field !py-2 !pl-9 !text-xs" aria-label="Search journey events" placeholder="Search events" value={globalFilter} onChange={(event) => table.setGlobalFilter(event.target.value)} /></div>
      </div>
      <div className="max-h-[620px] overflow-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-[1] bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
            {table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => {
              const sorted = header.column.getIsSorted();
              return <th key={header.id} className="whitespace-nowrap px-4 py-3 font-semibold first:px-5"><button className="inline-flex items-center gap-1.5 hover:text-slate-800" onClick={header.column.getToggleSortingHandler()}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}{sorted === "asc" ? <ChevronUp size={12} /> : sorted === "desc" ? <ChevronDown size={12} /> : null}</button></th>;
            })}</tr>)}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row) => <tr key={row.id} className="hover:bg-slate-50/80">{row.getVisibleCells().map((cell) => <td key={cell.id} className={`whitespace-nowrap px-4 py-3.5 tabular-nums text-slate-600 ${cell.column.id === "eventName" ? "font-mono text-[11px] text-slate-700" : ""}`}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
            {table.getRowModel().rows.length === 0 && <tr><td colSpan={columns.length} className="px-5 py-8 text-center text-slate-400">No events match your search.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        <span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
        <div className="flex gap-2"><button className="button-secondary !px-3 !py-1.5 !text-xs" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</button><button className="button-secondary !px-3 !py-1.5 !text-xs" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button></div>
      </div>
    </div>
  );
}
