import type { InputHTMLAttributes } from "react";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id">;

export type FilterDateRangeProps = {
  startId: string;
  endId: string;
  startLabel?: string;
  endLabel?: string;
  startInputProps?: DateInputProps;
  endInputProps?: DateInputProps;
};

export function FilterDateRange({
  startId,
  endId,
  startLabel = "From",
  endLabel = "To",
  startInputProps,
  endInputProps,
}: FilterDateRangeProps) {
  const inputClass = "form-control w-full min-w-[10rem]";

  return (
    <fieldset className="flex flex-wrap items-end gap-4 border-0 p-0">
      <legend className="sr-only">Date range</legend>
      <div className="form-field">
        <label htmlFor={startId} className="form-label">
          {startLabel}
        </label>
        <input id={startId} type="date" className={inputClass} {...startInputProps} />
      </div>
      <div className="form-field">
        <label htmlFor={endId} className="form-label">
          {endLabel}
        </label>
        <input id={endId} type="date" className={inputClass} {...endInputProps} />
      </div>
    </fieldset>
  );
}
