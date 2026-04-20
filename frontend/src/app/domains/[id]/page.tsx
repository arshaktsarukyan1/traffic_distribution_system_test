import { DomainDetailClient } from "@/components/domains";

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return <p className="p-6 text-sm text-red-800">Invalid domain id.</p>;
  }
  return <DomainDetailClient domainId={numericId} />;
}
