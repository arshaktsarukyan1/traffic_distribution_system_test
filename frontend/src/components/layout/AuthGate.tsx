"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getApiAuthToken } from "@/lib/apiClient";
import type { ReactNode } from "react";

const PUBLIC_PATHS = new Set(["/auth"]);

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) {
      return;
    }

    const token = getApiAuthToken();
    if (token === "") {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/auth?next=${next}`);
    }
  }, [pathname, router]);

  return <>{children}</>;
}
