import type { SplitRow } from "@/components/campaign";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function activeSum(rows: SplitRow[]): number {
  return rows.filter((r) => r.is_active).reduce((s, r) => s + r.weight_percent, 0);
}
