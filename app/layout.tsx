import type { Metadata, Viewport } from "next";
import { Newsreader, Outfit } from "next/font/google";
import { AppFrame } from "@/components/AppFrame";
import "./globals.css";

const orientSans = Outfit({
  subsets: ["latin"],
  variable: "--font-orient",
  display: "swap",
});

const orientSerif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-direction",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orient",
  description: "One field of time. Present, Day, Week, and Month are questions of that field.",
  appleWebApp: {
    capable: true,
    title: "Orient",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10141c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${orientSans.variable} ${orientSerif.variable}`}>
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
