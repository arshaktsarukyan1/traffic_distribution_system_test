import { CampaignBuilderForm } from "@/components/campaign";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return (
      <div className="p-6 text-sm text-red-800">
        Invalid campaign id.
      </div>
    );
  }
  return <CampaignBuilderForm campaignId={numericId} />;
}
