import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SiftAI",
  description: "Search everything, find anything.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        storageKey="tuna-theme"
      >
        <body className={`${inter.className} transition-all duration-300`}>
          {children}
        </body>
      </ThemeProvider>
    </html>
  );
}
