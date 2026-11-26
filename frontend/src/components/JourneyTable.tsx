import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { JourneyEvent } from "../types";

const columns: ColumnDef<JourneyEvent>[] = [
  { accessorKey: "position", header: "#", cell: (info) => Number(info.getValue()) + 1 },
  { accessorKey: "eventName", header: "Event" },
  { accessorKey: "activeUsers", header: "Active users", cell: (info) => Number(info.getValue()).toLocaleString() },
  { accessorKey: "eventCount", header: "Event count", cell: (info) => Number(info.getValue()).toLocaleString() },
  {
    accessorKey: "dropPercentage",
    header: "Drop %",
    cell: (info) => {
      const value = info.getValue<number | null>();
      return value === null ? "—" : `${value.toFixed(1)}%`;
    },
  },
];

export function JourneyTable({ events }: { events: JourneyEvent[] }) {
  const table = useReactTable({ data: events, columns, getCoreRowModel: getCoreRowModel() });
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 font-semibold">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/70">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3.5 text-slate-600">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
