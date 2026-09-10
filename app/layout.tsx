import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { Footer } from "@/components/Footer";
import { ModalProvider } from "@/components/ModalProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnyHVAC | Free HVAC Calculators & Tools",
  description:
    "Free calculators and practical tools for HVAC professionals and designers.",
  icons: {
    icon: "/Favicon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ModalProvider>
          {children}
          <Footer />
        </ModalProvider>
        <Script
          id="cloudflare-web-analytics"
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "4a02b1c1a4c44c62a82304f2a96c7da2"}'
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
