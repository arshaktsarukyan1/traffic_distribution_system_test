import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";

type DomainRow = { id: number; name: string; status: string; is_active: boolean };

/** Example: GET paginated list (first page). */
export async function exampleFetchDomainPage(): Promise<DomainRow[]> {
  const res = await api.get<{ data: DomainRow[]; last_page: number }>("v1/domains?page=1");
  return res.data;
}

/** Example: POST create resource. */
export async function exampleCreateDomain(name: string): Promise<void> {
  await api.post("v1/domains", {
    name: name.toLowerCase(),
    status: "pending",
    is_active: true,
  });
}

/** Example: map status-specific UX without try/catch in every caller. */
export function exampleDescribeApiFailure(e: unknown): { userMessage: string; isNotFound: boolean } {
  if (!ApiError.isApiError(e)) {
    return { userMessage: "Something went wrong.", isNotFound: false };
  }
  if (e.status === 404 || e.code === "not_found") {
    return { userMessage: e.message || "Not found.", isNotFound: true };
  }
  if (e.status >= 500) {
    return { userMessage: "Server error — try again later.", isNotFound: false };
  }
  return { userMessage: e.message, isNotFound: false };
}
