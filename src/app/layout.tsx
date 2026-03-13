import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/Toast";
import { FirestoreErrorHandler } from "@/components/shared/FirestoreErrorHandler";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Booking Platform",
  description: "Multi-tenant booking platform for salons and service businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${kanit.className} antialiased`}>
        <FirestoreErrorHandler />
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
