import type { ReactNode } from "react";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { ApiErrorReportingProvider } from "@/contexts/ApiErrorReportingProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ApiErrorReportingProvider>
      <AdminChrome>{children}</AdminChrome>
    </ApiErrorReportingProvider>
  );
}
