"use client";

export type SplitRow = {
  id: number;
  weight_percent: number;
  is_active: boolean;
};

type Option = { id: number; label: string };

type WeightSplitEditorProps = {
  title: string;
  description: string;
  options: Option[];
  rows: SplitRow[];
  onChange: (rows: SplitRow[]) => void;
};

function activeTotal(rows: SplitRow[]): number {
  return rows.filter((r) => r.is_active).reduce((s, r) => s + r.weight_percent, 0);
}

export function WeightSplitEditor({
  title,
  description,
  options,
  rows,
  onChange,
}: WeightSplitEditorProps) {
  const total = activeTotal(rows);
  const valid = rows.length === 0 || total === 100;

  const addRow = () => {
    const used = new Set(rows.map((r) => r.id));
    const nextOpt = options.find((o) => !used.has(o.id));
    if (!nextOpt) {
      return;
    }
    onChange([
      ...rows,
      { id: nextOpt.id, weight_percent: 10, is_active: true },
    ]);
  };

  const removeRow = (id: number) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const updateRow = (id: number, patch: Partial<SplitRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const splitEvenly = () => {
    const active = rows.filter((r) => r.is_active);
    if (active.length === 0) {
      return;
    }
    const base = Math.floor(100 / active.length);
    let remainder = 100 - base * active.length;
    const next = rows.map((r) => {
      if (!r.is_active) {
        return r;
      }
      const bump = remainder > 0 ? 1 : 0;
      if (remainder > 0) {
        remainder -= 1;
      }
      return { ...r, weight_percent: base + bump };
    });
    onChange(next);
  };

  return (
    <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={addRow}
            disabled={rows.length >= options.length}
          >
            Add row
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            onClick={splitEvenly}
            disabled={rows.filter((r) => r.is_active).length === 0}
          >
            Split active evenly
          </button>
        </div>
      </div>

      <p
        className={
          "mt-3 text-sm font-medium " + (valid ? "text-emerald-700" : "text-amber-800")
        }
      >
        {rows.length === 0
          ? "No rows — campaign can be saved without this split (optional)."
          : valid
            ? "Active weights total 100%."
            : `Active weights total ${total}% (must be exactly 100%).`}
      </p>

      {rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-4 font-medium">Item</th>
                <th className="py-2 pr-4 font-medium">Weight %</th>
                <th className="py-2 pr-4 font-medium">Active</th>
                <th className="py-2 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                return (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">
                      <select
                        className="form-control h-10 w-full max-w-xs px-2 text-sm"
                        value={row.id}
                        onChange={(e) => {
                          const nextId = Number(e.target.value);
                          updateRow(row.id, { id: nextId });
                        }}
                      >
                        {options.map((o) => (
                          <option
                            key={o.id}
                            value={o.id}
                            disabled={rows.some((r) => r.id === o.id && r.id !== row.id)}
                          >
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="form-control h-10 w-24 px-2 text-sm"
                        value={row.weight_percent}
                        onChange={(e) =>
                          updateRow(row.id, { weight_percent: Number(e.target.value) || 0 })
                        }
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={row.is_active}
                        onChange={(e) => updateRow(row.id, { is_active: e.target.checked })}
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="text-sm font-medium text-red-700 hover:underline"
                        onClick={() => removeRow(row.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
