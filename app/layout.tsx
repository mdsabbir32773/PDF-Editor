import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF A2Z — All Your PDF Tools in One Place",
  description: "Free online PDF tools: merge, split, compress, JPG to PDF and PDF to JPG.",
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}