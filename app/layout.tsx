import type { Metadata } from "next";
import "./globals.css";
import { AuthShell } from "@/app/auth-shell";

export const metadata: Metadata = {
  title: "Monthly Expenses",
  description: "Personal monthly budget tracker"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthShell>{children}</AuthShell>
      </body>
    </html>
  );
}
