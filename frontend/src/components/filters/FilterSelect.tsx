import type { SelectHTMLAttributes } from "react";

export type FilterSelectOption = { value: string; label: string };

export type FilterSelectProps = {
  id: string;
  label: string;
  options: FilterSelectOption[];
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">;

export function FilterSelect({ id, label, options, className = "", ...rest }: FilterSelectProps) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <select
        id={id}
        className={"form-control " + className}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
