import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMI Training for STEM Teachers in Vietnam",
  description:
    "Practical EMI training, lesson-planning resources, and classroom support for STEM teachers in Vietnam.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
