"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { reportApiError } from "@/lib/reportApiError";

type OfferOpt = { id: number; name: string };

export type TargetingRuleRow = {
  id: number;
  offer_id: number | null;
  country_code: string | null;
  region: string | null;
  device_type: "desktop" | "mobile" | "tablet" | null;
  priority: number;
  is_active: boolean;
};

type LaravelRulesPage = {
  data: Array<
    TargetingRuleRow & {
      offer?: { id: number; name: string } | null;
    }
  >;
  current_page: number;
  last_page: number;
};

type TargetingRulesSectionProps = {
  campaignId: number | null;
  offers: OfferOpt[];
};

const emptyForm = () => ({
  offer_id: "" as number | "",
  country_code: "",
  region: "",
  device_type: "" as "" | "desktop" | "mobile" | "tablet",
  priority: 100,
  is_active: true,
});

export function TargetingRulesSection({ campaignId, offers }: TargetingRulesSectionProps) {
  const [rules, setRules] = useState<TargetingRuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ReturnType<typeof emptyForm> | null>(null);

  const load = useCallback(async () => {
    if (!campaignId) {
      setRules([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const collected: TargetingRuleRow[] = [];
      let page = 1;
      let last = 1;
      do {
        const chunk = await api.get<LaravelRulesPage>(
          `v1/campaigns/${campaignId}/targeting-rules?page=${page}`,
        );
        for (const r of chunk.data) {
          collected.push({
            id: r.id,
            offer_id: r.offer_id,
            country_code: r.country_code,
            region: r.region,
            device_type: r.device_type,
            priority: r.priority,
            is_active: r.is_active,
          });
        }
        last = chunk.last_page;
        page += 1;
      } while (page <= last);
      collected.sort((a, b) => a.priority - b.priority || a.id - b.id);
      setRules(collected);
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createRule = async () => {
    if (!campaignId) {
      return;
    }
    setError(null);
    if (!form.offer_id) {
      setError("Select an offer for the new rule.");
      return;
    }
    try {
      await api.post(`v1/campaigns/${campaignId}/targeting-rules`, {
        offer_id: form.offer_id,
        country_code: form.country_code.trim() || null,
        region: form.region.trim() || null,
        device_type: form.device_type || null,
        priority: form.priority,
        is_active: form.is_active,
      });
      setForm(emptyForm());
      await load();
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Failed to create rule");
    }
  };

  const saveEdit = async () => {
    if (!campaignId || !editingId || !editDraft) {
      return;
    }
    setError(null);
    if (!editDraft.offer_id) {
      setError("Offer is required.");
      return;
    }
    try {
      await api.patch(`v1/campaigns/${campaignId}/targeting-rules/${editingId}`, {
        offer_id: editDraft.offer_id,
        country_code: editDraft.country_code.trim() || null,
        region: editDraft.region.trim() || null,
        device_type: editDraft.device_type || null,
        priority: editDraft.priority,
        is_active: editDraft.is_active,
      });
      setEditingId(null);
      setEditDraft(null);
      await load();
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Failed to update rule");
    }
  };

  const destroy = async (id: number) => {
    if (!campaignId) {
      return;
    }
    if (!window.confirm("Delete this targeting rule?")) {
      return;
    }
    setError(null);
    try {
      await api.delete(`v1/campaigns/${campaignId}/targeting-rules/${id}`);
      await load();
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Failed to delete");
    }
  };

  if (!campaignId) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Save the campaign once to enable targeting rules (country, device, region, offer routing).
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Targeting rules</h2>
      <p className="mt-1 text-sm text-slate-600">
        Rules are evaluated in priority order. Country and device filters must match the session to
        route to the selected offer.
      </p>

      {error ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="mt-3 text-sm text-slate-600">Loading rules…</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="py-2 pr-3 font-medium">Priority</th>
              <th className="py-2 pr-3 font-medium">Offer</th>
              <th className="py-2 pr-3 font-medium">Country</th>
              <th className="py-2 pr-3 font-medium">Region</th>
              <th className="py-2 pr-3 font-medium">Device</th>
              <th className="py-2 pr-3 font-medium">Active</th>
              <th className="py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) =>
              editingId === r.id && editDraft ? (
                <tr key={r.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className="w-20 rounded-md border border-slate-200 px-2 py-1"
                      value={editDraft.priority}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, priority: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      className="max-w-[12rem] rounded-md border border-slate-200 px-2 py-1"
                      value={editDraft.offer_id}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          offer_id: e.target.value ? Number(e.target.value) : "",
                        })
                      }
                    >
                      <option value="">—</option>
                      {offers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="w-16 rounded-md border border-slate-200 px-2 py-1 uppercase"
                      maxLength={2}
                      value={editDraft.country_code}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          country_code: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="w-36 rounded-md border border-slate-200 px-2 py-1"
                      value={editDraft.region}
                      onChange={(e) => setEditDraft({ ...editDraft, region: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      className="rounded-md border border-slate-200 px-2 py-1"
                      value={editDraft.device_type}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          device_type: e.target.value as typeof editDraft.device_type,
                        })
                      }
                    >
                      <option value="">Any</option>
                      <option value="desktop">Desktop</option>
                      <option value="mobile">Mobile</option>
                      <option value="tablet">Tablet</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={editDraft.is_active}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, is_active: e.target.checked })
                      }
                    />
                  </td>
                  <td className="py-2">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        className="text-left text-sm font-medium text-slate-900 hover:underline"
                        onClick={() => void saveEdit()}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="text-left text-sm text-slate-600 hover:underline"
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{r.priority}</td>
                  <td className="py-2 pr-3">
                    {offers.find((o) => o.id === r.offer_id)?.name ?? (r.offer_id ?? "—")}
                  </td>
                  <td className="py-2 pr-3">{r.country_code ?? "—"}</td>
                  <td className="py-2 pr-3">{r.region ?? "—"}</td>
                  <td className="py-2 pr-3">{r.device_type ?? "Any"}</td>
                  <td className="py-2 pr-3">{r.is_active ? "Yes" : "No"}</td>
                  <td className="py-2">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        className="text-left text-sm font-medium text-slate-900 hover:underline"
                        onClick={() => {
                          setEditingId(r.id);
                          setEditDraft({
                            offer_id: r.offer_id ?? "",
                            country_code: r.country_code ?? "",
                            region: r.region ?? "",
                            device_type: r.device_type ?? "",
                            priority: r.priority,
                            is_active: r.is_active,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-left text-sm text-red-700 hover:underline"
                        onClick={() => void destroy(r.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">Add rule</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Offer</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2"
              value={form.offer_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  offer_id: e.target.value ? Number(e.target.value) : "",
                })
              }
            >
              <option value="">Select offer…</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Country (ISO-2)</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 uppercase"
              maxLength={2}
              value={form.country_code}
              onChange={(e) =>
                setForm({ ...form, country_code: e.target.value.toUpperCase() })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Region</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Device</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2"
              value={form.device_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  device_type: e.target.value as typeof form.device_type,
                })
              }
            >
              <option value="">Any</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Priority</span>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2"
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <span className="font-medium text-slate-700">Active</span>
          </label>
        </div>
        <button
          type="button"
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => void createRule()}
        >
          Add targeting rule
        </button>
      </div>
    </section>
  );
}
