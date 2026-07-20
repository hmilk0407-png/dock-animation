import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BUHI WORKS｜AI専門家オフィス",
  description:
    "フレンチブルドッグのAI専門家チームが働く、顔の見えるオフィス。受付のミルクが依頼を読み、最適な専門家へおつなぎします。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F4F2EB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
