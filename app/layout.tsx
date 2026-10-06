import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "WebP Forge — Local image conversion", description: "Fast batch image conversion for the web. Convert JPG and PNG to WebP on your own machine.", icons: { icon: "/favicon.svg" } };
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#171c18" },
  ],
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
