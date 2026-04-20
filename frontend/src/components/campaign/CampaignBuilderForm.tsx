"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { TargetingRulesSection } from "@/components/campaign/TargetingRulesSection";
import { WeightSplitEditor, type SplitRow } from "@/components/campaign/WeightSplitEditor";
import { fetchAllPages } from "@/lib/paginate";
import { clickUrl, redirectUrl, trackerScriptTag, type DomainRow } from "@/lib/tracking-urls";
import { activeSum, slugify } from "@/lib/campaign-form";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { reportApiError } from "@/lib/reportApiError";

type TrafficSource = { id: number; name: string; slug: string };
type Lander = { id: number; name: string; url: string };
type Offer = { id: number; name: string; url: string };

type CampaignPayload = {
  id: number;
  name: string;
  slug: string;
  status: string;
  destination_url: string;
  timezone: string | null;
  domain_id: number | null;
  traffic_source_id: number;
  daily_budget: string | number | null;
  monthly_budget: string | number | null;
  landers?: Array<{
    id: number;
    name: string;
    pivot: { weight_percent: number; is_active: boolean };
  }>;
  offers?: Array<{
    id: number;
    name: string;
    pivot: { weight_percent: number; is_active: boolean };
  }>;
  domain?: DomainRow | null;
};

type CampaignBuilderFormProps = {
  campaignId?: number;
};

export function CampaignBuilderForm({ campaignId }: CampaignBuilderFormProps) {
  const router = useRouter();
  const isNew = !campaignId;

  const [loading, setLoading] = useState(!isNew);
  /** Domains, landers, offers, traffic sources — must be ready before traffic source is usable. */
  const [refsLoading, setRefsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const [id, setId] = useState<number | null>(campaignId ?? null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("draft");
  const [destinationUrl, setDestinationUrl] = useState("https://example.com");
  const [timezone, setTimezone] = useState("UTC");
  const [domainId, setDomainId] = useState<number | "">("");
  const [trafficSourceId, setTrafficSourceId] = useState<number | "">("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");

  const [landerRows, setLanderRows] = useState<SplitRow[]>([]);
  const [offerRows, setOfferRows] = useState<SplitRow[]>([]);

  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [landers, setLanders] = useState<Lander[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);

  const selectedDomain = useMemo(
    () => domains.find((d) => d.id === domainId) ?? null,
    [domains, domainId],
  );

  const landerOptions = useMemo(
    () => landers.map((l) => ({ id: l.id, label: l.name })),
    [landers],
  );
  const offerOptions = useMemo(
    () => offers.map((o) => ({ id: o.id, label: o.name })),
    [offers],
  );

  const landerSplitValid = landerRows.length === 0 || activeSum(landerRows) === 100;
  const offerSplitValid = offerRows.length === 0 || activeSum(offerRows) === 100;

  const loadCampaign = useCallback(async () => {
    if (!campaignId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ data: CampaignPayload }>(`v1/campaigns/${campaignId}`);
      setId(data.id);
      setName(data.name);
      setSlug(data.slug);
      setStatus(data.status);
      setDestinationUrl(data.destination_url);
      setTimezone(data.timezone ?? "UTC");
      setDomainId(data.domain_id ?? "");
      setTrafficSourceId(data.traffic_source_id);
      setDailyBudget(data.daily_budget != null ? String(data.daily_budget) : "");
      setMonthlyBudget(data.monthly_budget != null ? String(data.monthly_budget) : "");
      setLanderRows(
        (data.landers ?? []).map((row) => ({
          id: row.id,
          weight_percent: row.pivot.weight_percent,
          is_active: Boolean(row.pivot.is_active),
        })),
      );
      setOfferRows(
        (data.offers ?? []).map((row) => ({
          id: row.id,
          weight_percent: row.pivot.weight_percent,
          is_active: Boolean(row.pivot.is_active),
        })),
      );
      setSlugTouched(true);
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;
    setRefsLoading(true);
    (async () => {
      try {
        const [d, l, o, ts] = await Promise.all([
          fetchAllPages<DomainRow>((page) => api.get(`v1/domains?page=${page}`)),
          fetchAllPages<Lander>((page) => api.get(`v1/landers?page=${page}`)),
          fetchAllPages<Offer>((page) => api.get(`v1/offers?page=${page}`)),
          api.get<{ data: TrafficSource[] }>("v1/traffic-sources").then((r) => r.data),
        ]);
        if (cancelled) {
          return;
        }
        setDomains(d);
        setLanders(l);
        setOffers(o);
        setTrafficSources(ts);
      } catch (e) {
        if (!cancelled) {
          reportApiError(e);
          setError(ApiError.isApiError(e) ? e.message : "Failed to load reference data");
        }
      } finally {
        if (!cancelled) {
          setRefsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!campaignId && trafficSources.length > 0 && trafficSourceId === "") {
      setTrafficSourceId(trafficSources[0].id);
    }
  }, [campaignId, trafficSources, trafficSourceId]);

  useEffect(() => {
    if (campaignId) {
      void loadCampaign();
    }
  }, [campaignId, loadCampaign]);

  const persist = async () => {
    setSaving(true);
    setError(null);
    if (!trafficSourceId) {
      setError("Select a traffic source.");
      setSaving(false);
      return;
    }
    if (!landerSplitValid || !offerSplitValid) {
      setError("Each non-empty lander or offer split must total 100% for active rows.");
      setSaving(false);
      return;
    }

    const body: Record<string, unknown> = {
      name,
      slug,
      status,
      destination_url: destinationUrl,
      timezone: timezone || "UTC",
      domain_id: domainId === "" ? null : domainId,
      traffic_source_id: trafficSourceId,
      daily_budget: dailyBudget.trim() === "" ? null : Number(dailyBudget),
      monthly_budget: monthlyBudget.trim() === "" ? null : Number(monthlyBudget),
    };

    body.landers = landerRows.map((r) => ({
      id: r.id,
      weight_percent: r.weight_percent,
      is_active: r.is_active,
    }));
    body.offers = offerRows.map((r) => ({
      id: r.id,
      weight_percent: r.weight_percent,
      is_active: r.is_active,
    }));

    try {
      if (isNew || !id) {
        const created = await api.post<{ data: CampaignPayload }>("v1/campaigns", body);
        router.push(`/campaigns/${created.data.id}/edit`);
        router.refresh();
        return;
      }
      await api.patch(`v1/campaigns/${id}`, body);
      await loadCampaign();
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const testOpen = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const title = isNew ? "New campaign" : `Edit campaign · ${name || slug || id}`;

  const pageBusy = refsLoading || (!!campaignId && loading);

  const redirect = id ? redirectUrl(slug, selectedDomain) : "";
  const click = id ? clickUrl(slug, selectedDomain) : "";
  const scriptTag = id ? trackerScriptTag(id, selectedDomain) : "";

  return (
    <AdminShell
      title={title}
      topbarRight={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/traffic-sources"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Traffic sources
          </Link>
          <Link
            href="/campaigns"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            All campaigns
          </Link>
        </div>
      }
    >
      {pageBusy ? (
        <p className="text-sm text-slate-600">
          {refsLoading ? "Loading domains, landers, offers, and traffic sources…" : "Loading campaign…"}
        </p>
      ) : (
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Campaign details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Name</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                  value={name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setName(v);
                    if (!slugTouched) {
                      setSlug(slugify(v));
                    }
                  }}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Slug</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Status</span>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Traffic source</span>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-500"
                  disabled={refsLoading}
                  value={trafficSourceId}
                  onChange={(e) =>
                    setTrafficSourceId(e.target.value ? Number(e.target.value) : "")
                  }
                >
                  <option value="">
                    {refsLoading ? "Loading…" : "Select…"}
                  </option>
                  {trafficSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {!refsLoading && trafficSources.length === 0 ? (
                  <span className="mt-1 block text-xs text-amber-800">
                    No traffic sources available. Open{" "}
                    <Link href="/traffic-sources" className="font-medium underline">
                      Traffic sources
                    </Link>{" "}
                    or seed the database before saving a campaign.
                  </span>
                ) : null}
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Destination URL (fallback)</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Domain</span>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                  value={domainId}
                  onChange={(e) =>
                    setDomainId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                >
                  <option value="">Default (public origin)</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-500">
                  Used to preview tracking links with your tracking hostname.
                </span>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Timezone</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Daily budget</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Monthly budget</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={
                  saving ||
                  refsLoading ||
                  !landerSplitValid ||
                  !offerSplitValid ||
                  !trafficSourceId
                }
                onClick={() => void persist()}
              >
                {saving ? "Saving…" : "Save campaign"}
              </button>
            </div>
          </section>

          <WeightSplitEditor
            title="Landers"
            description="Weighted rotation for the first hop (/campaign/{slug}). Active weights must total 100% when any row exists."
            options={landerOptions}
            rows={landerRows}
            onChange={setLanderRows}
          />

          <WeightSplitEditor
            title="Offers"
            description="Default weighted offer split after targeting rules are evaluated on /click."
            options={offerOptions}
            rows={offerRows}
            onChange={setOfferRows}
          />

          <TargetingRulesSection campaignId={id} offers={offers.map((o) => ({ id: o.id, name: o.name }))} />

          {id ? (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Tracking URL and script</h2>
              <p className="mt-1 text-sm text-slate-600">
                Redirect entry (landers). Click URL is used from the lander toward offers.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Redirect URL
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap break-all rounded-md bg-slate-50 p-3 text-sm text-slate-900">
                    {redirect}
                  </pre>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                      onClick={() => void copy(redirect)}
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                      onClick={() => testOpen(redirect)}
                    >
                      Open test
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Click URL (example)
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap break-all rounded-md bg-slate-50 p-3 text-sm text-slate-900">
                    {click}
                  </pre>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                      onClick={() => void copy(click)}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tracker script snippet
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap break-all rounded-md bg-slate-50 p-3 text-sm text-slate-900">
                    {scriptTag}
                  </pre>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                      onClick={() => void copy(scriptTag)}
                    >
                      Copy snippet
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </AdminShell>
  );
}
