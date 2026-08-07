import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SmoothScroll from "@/components/SmoothScroll";

/* Fonts are self-hosted: @font-face in globals.css + /public/fonts.
   No next/font/google — builds must not depend on Google availability. */

export const metadata: Metadata = {
  title: "FORMA VISUAL — косметика и одежда",
  description:
    "FORMA — уход за кожей. VISUAL — одежда в спокойных оттенках. Два дома — одна форма.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <LanguageProvider>
          <CartProvider>
            <SmoothScroll />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <CartDrawer />
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
