import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ConvexClientProvider from "@/components/convex-client-provider";
import EnvironmentBanner from "@/components/environment-banner";
import Footer from "@/components/footer";
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
  title: "Bingo Musical",
  description: "Bingo musical móvil con cartones digitales y partidas compartidas.",
};

export const viewport: Viewport = {
  themeColor: "#14141f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <EnvironmentBanner />
        <ConvexClientProvider>
          {children}
          <Footer />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
