import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-primary",
});

export const metadata: Metadata = {
  title: "Dashboard - น้องลัดดา ICP Ladda",
  description: "ระบบจัดการ Chatbot น้องลัดดา",
  icons: { icon: "/logos/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={`${notoSansThai.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
