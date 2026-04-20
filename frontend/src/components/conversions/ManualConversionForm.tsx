"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { fetchAllPages } from "@/lib/paginate";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { reportApiError } from "@/lib/reportApiError";

type CampaignRow = { id: number; name: string; slug: string };
type Lander = { id: number; name: string };
type Offer = { id: number; name: string };

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ManualConversionForm() {
  const sp = useSearchParams();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [landers, setLanders] = useState<Lander[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingRefs, setLoadingRef] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [campaignId, setCampaignId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [convertedAt, setConvertedAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [clickUuid, setClickUuid] = useState("");
  const [offerId, setOfferId] = useState<number | "">("");
  const [landerId, setLanderId] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState("manual");

  useEffect(() => {
    const pre = sp.get("campaign_id");
    if (pre) {
      const n = Number(pre);
      if (Number.isFinite(n) && n > 0) {
        setCampaignId(n);
      }
    }
  }, [sp]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, l, o] = await Promise.all([
          fetchAllPages<CampaignRow>((page) => api.get(`v1/campaigns?page=${page}`)),
          fetchAllPages<Lander>((page) => api.get(`v1/landers?page=${page}`)),
          fetchAllPages<Offer>((page) => api.get(`v1/offers?page=${page}`)),
        ]);
        if (!cancelled) {
          setCampaigns(c);
          setLanders(l);
          setOffers(o);
        }
      } catch (e) {
        if (!cancelled) {
          reportApiError(e);
          setError(ApiError.isApiError(e) ? e.message : "Failed to load form data");
        }
      } finally {
        if (!cancelled) setLoadingRef(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    if (!campaignId) {
      setError("Select a campaign.");
      setSubmitting(false);
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      setError("Enter a valid amount (0 or greater).");
      setSubmitting(false);
      return;
    }
    const iso = new Date(convertedAt).toISOString();
    const body: Record<string, unknown> = {
      campaign_id: campaignId,
      amount: amt,
      converted_at: iso,
    };
    if (clickUuid.trim()) body.click_uuid = clickUuid.trim();
    if (offerId !== "") body.offer_id = offerId;
    if (landerId !== "") body.lander_id = landerId;
    if (note.trim()) body.note = note.trim();
    if (source.trim()) body.source = source.trim();

    try {
      const res = await api.post<{ data: { id: number } }>("v1/conversions/manual", body);
      setMessage(`Conversion #${res.data.id} recorded. KPI aggregates update after the next aggregation run.`);
      setAmount("");
      setClickUuid("");
      setOfferId("");
      setLanderId("");
      setNote("");
      setConvertedAt(toDatetimeLocalValue(new Date()));
    } catch (e) {
      reportApiError(e);
      setError(ApiError.isApiError(e) ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminShell
      title="Manual conversion"
      topbarRight={
        <Link
          href={`/dashboard`}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Dashboard
        </Link>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Record revenue for orders that did not post through an integration. Submissions use the
          internal API proxy (credentials stay on the server). Restrict access to this screen in
          production.
        </p>

        {loadingRefs ? <p className="text-sm text-slate-600">Loading…</p> : null}
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
            {message}{" "}
            {campaignId ? (
              <Link
                href={`/campaigns/${campaignId}`}
                className="font-medium text-emerald-950 underline-offset-2 hover:underline"
              >
                View campaign analytics
              </Link>
            ) : null}
          </p>
        ) : null}

        <form
          className="space-y-4 rounded-lg border border-slate-300 bg-white p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="form-field">
            <span className="form-label">Campaign</span>
            <select
              required
              className="form-control"
              value={campaignId}
              onChange={(e) =>
                setCampaignId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Select…</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span className="form-label">Amount</span>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              className="form-control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Converted at</span>
            <input
              required
              type="datetime-local"
              className="form-control"
              value={convertedAt}
              onChange={(e) => setConvertedAt(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Click UUID (optional)</span>
            <input
              className="form-control form-control--mono"
              value={clickUuid}
              onChange={(e) => setClickUuid(e.target.value)}
              placeholder="00000000-0000-4000-8000-000000000000"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="form-field">
              <span className="form-label">Offer (optional)</span>
              <select
                className="form-control"
                value={offerId}
                onChange={(e) =>
                  setOfferId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">—</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-label">Lander (optional)</span>
              <select
                className="form-control"
                value={landerId}
                onChange={(e) =>
                  setLanderId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">—</option>
                {landers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field">
            <span className="form-label">Note (optional)</span>
            <textarea
              className="form-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Source label (optional)</span>
            <input
              className="form-control"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="manual"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || loadingRefs}
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Record conversion"}
          </button>
        </form>
      </div>
    </AdminShell>
  );
}
