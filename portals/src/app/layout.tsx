import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwasthyaSetu - Enterprise Platform",
  description: "Enterprise Health Information System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#f4f7f9' }}>
        {children}
      </body>
    </html>
  );
}
