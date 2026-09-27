import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./renewal.css";
import "./community.css";
import { Provider } from "@/components/provider";
import { Shell } from "@/components/shell";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#141f28" },
  ],
};
export const metadata: Metadata = {
  title: "곡반정와드 복음교리반 전용 학습 사이트",
  description:
    "2026 구약전서 · 말씀을 읽고, 생각을 나누고, 삶에서 실천하는 곡반정와드 복음교리반 학습 공간",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Provider>
          <Shell>{children}</Shell>
        </Provider>
      </body>
    </html>
  );
}
