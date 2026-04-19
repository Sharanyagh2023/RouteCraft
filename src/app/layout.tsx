import type { Metadata } from "next";
import "./globals.css";
import { FloatingChat } from "@/components/chat/floating-chat";

export const metadata: Metadata = {
  title: "RouteCraft",
  description: "AI-powered smart commute optimization for Bengaluru.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-gradient-to-b from-routeBgStart to-routeBgEnd text-white">
        <main className="mx-auto min-h-screen w-full max-w-md px-3 py-3">{children}</main>
        <FloatingChat />
      </body>
    </html>
  );
}
