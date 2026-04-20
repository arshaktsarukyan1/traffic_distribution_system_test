import "./globals.css";
import type { ReactNode } from "react";
import { GlobalAppWrapper } from "@/components/layout/GlobalAppWrapper";

export const metadata = {
  title: "TDS Dashboard",
  description: "Traffic Distribution System internal dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GlobalAppWrapper>{children}</GlobalAppWrapper>
      </body>
    </html>
  );
}
