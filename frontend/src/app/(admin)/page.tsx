import { TrendChart } from "@/components/charts/TrendChart";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDateRange } from "@/components/filters/FilterDateRange";
import { FilterSelect } from "@/components/filters/FilterSelect";
import { KpiCard } from "@/components/kpi/KpiCard";
import { DataTable } from "@/components/table/DataTable";

const trend = [
  { label: "Mon", value: 120 },
  { label: "Tue", value: 156 },
  { label: "Wed", value: 142 },
  { label: "Thu", value: 190 },
  { label: "Fri", value: 175 },
];

type Row = { id: string; campaign: string; visits: number; ctr: string };

const rows: Row[] = [
  { id: "1", campaign: "US — search", visits: 12400, ctr: "3.2%" },
  { id: "2", campaign: "EU — social", visits: 8200, ctr: "2.1%" },
  { id: "3", campaign: "APAC — display", visits: 6400, ctr: "1.4%" },
];

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-base text-slate-800">
        Internal dashboard shell with reusable KPI, table, chart, and filter building blocks.
        Use Tab from the top of the page to verify the skip link and focus order.
      </p>

      <FilterBar
        actions={
          <>
            <button
              type="button"
              className="h-11 rounded-md border border-slate-400 bg-white px-4 text-base font-semibold text-slate-950 outline-none ring-blue-700 ring-offset-2 hover:bg-slate-100 focus-visible:ring-4"
            >
              Reset
            </button>
            <button
              type="button"
              className="h-11 rounded-md bg-blue-800 px-4 text-base font-semibold text-white outline-none ring-blue-700 ring-offset-2 hover:bg-blue-900 focus-visible:ring-4"
            >
              Apply
            </button>
          </>
        }
      >
        <FilterSelect
          id="filter-offer"
          label="Offer"
          name="offer"
          defaultValue=""
          options={[
            { value: "", label: "All offers" },
            { value: "a", label: "Offer A" },
            { value: "b", label: "Offer B" },
          ]}
        />
        <FilterSelect
          id="filter-geo"
          label="Geo"
          name="geo"
          defaultValue=""
          options={[
            { value: "", label: "All regions" },
            { value: "us", label: "United States" },
            { value: "eu", label: "Europe" },
          ]}
        />
        <FilterDateRange startId="filter-from" endId="filter-to" />
      </FilterBar>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Visits" value="28,400" description="Last 24 hours" delta="+6.1% vs prior day" deltaTone="positive" />
        <KpiCard label="Clicks" value="812" description="Tracked events" delta="-0.8% vs prior day" deltaTone="negative" />
        <KpiCard label="Conversions" value="94" description="Postbacks / goals" />
        <KpiCard label="Revenue" value="$1,240.00" description="Estimated" delta="Flat" deltaTone="neutral" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <TrendChart title="Traffic trend" description="Sample series for layout review." data={trend} />
        </div>
        <div className="lg:col-span-3">
          <DataTable<Row>
            caption="Top campaigns (sample)"
            columns={[
              { id: "campaign", header: "Campaign", cell: (r) => r.campaign },
              {
                id: "visits",
                header: "Visits",
                align: "right",
                cell: (r) => r.visits.toLocaleString(),
              },
              {
                id: "ctr",
                header: "CTR",
                align: "right",
                cell: (r) => r.ctr,
              },
            ]}
            rows={rows}
            getRowId={(r) => r.id}
          />
        </div>
      </div>
    </div>
  );
}
