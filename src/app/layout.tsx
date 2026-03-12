import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/Toast";
import { FirestoreErrorHandler } from "@/components/shared/FirestoreErrorHandler";

const prompt = Prompt({
  variable: "--font-sans",
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
    <html lang="th" className={prompt.variable}>
      <body className="font-sans antialiased">
        <FirestoreErrorHandler />
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
