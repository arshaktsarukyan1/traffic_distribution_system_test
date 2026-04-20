import { CampaignDetailsView } from "@/components/dashboard";

export default async function CampaignDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return <div className="p-6 text-sm text-red-800">Invalid campaign id.</div>;
  }
  return <CampaignDetailsView campaignId={numericId} />;
}

