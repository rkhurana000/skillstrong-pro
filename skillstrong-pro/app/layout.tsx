// /app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// Make sure to import your new chat styles here
import "@/app/chat/chat.css"; // <-- CORRECTED PATH
import SiteHeader from "@/app/components/SiteHeader";
import { LocationProvider } from "@/app/contexts/LocationContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SkillStrong | Build Your Manufacturing Career",
  description: "Explore careers in modern manufacturing with an AI-powered coach.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LocationProvider>
          <SiteHeader />
          <main>{children}</main>
        </LocationProvider>
      </body>
    </html>
  );
}
