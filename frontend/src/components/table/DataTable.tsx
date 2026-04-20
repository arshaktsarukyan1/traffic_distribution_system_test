import type { ReactNode } from "react";

export type DataTableColumn<Row> = {
  id: string;
  header: string;
  /** Return cell content; align optional for numeric columns */
  cell: (row: Row) => ReactNode;
  align?: "left" | "right";
};

export type DataTableProps<Row> = {
  caption?: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  /** Stable row id for React keys */
  getRowId: (row: Row) => string;
  emptyMessage?: string;
};

export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowId,
  emptyMessage = "No rows to display.",
}: DataTableProps<Row>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-left text-base text-slate-950">
        {caption ? <caption className="border-b border-slate-300 bg-blue-50 px-4 py-3 text-left text-base font-semibold text-slate-950">{caption}</caption> : null}
        <thead className="bg-slate-100 text-sm font-semibold uppercase tracking-wide text-slate-800">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={
                  "border-b border-slate-300 px-4 py-3 " +
                  (col.align === "right" ? "text-right tabular-nums" : "text-left")
                }
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-4 py-6 text-center text-slate-600"
                colSpan={columns.length}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowId(row)}
                className="odd:bg-white even:bg-blue-50/30 hover:bg-blue-100/60"
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={
                      "border-t border-slate-300 px-4 py-3 " +
                      (col.align === "right" ? "text-right tabular-nums" : "text-left")
                    }
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
