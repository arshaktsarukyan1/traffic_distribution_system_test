import type { ReactNode } from "react";

export type FilterBarProps = {
  title?: string;
  children: ReactNode;
  /** Right-aligned actions (e.g. Apply / Reset) */
  actions?: ReactNode;
};

export function FilterBar({ title = "Filters", children, actions }: FilterBarProps) {
  return (
    <section
      className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm"
      aria-label={title}
    >
      <h2 className="mb-3 text-base font-semibold text-slate-900">{title}</h2>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-4">{children}</div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-300 pt-3 lg:border-0 lg:pt-0">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
