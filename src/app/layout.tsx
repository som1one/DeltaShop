import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import { ProductsProvider } from "@/lib/products-context";
import { listProducts } from "@/lib/products-store";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SmoothScroll from "@/components/SmoothScroll";

/* Fonts are self-hosted: @font-face in globals.css + /public/fonts.
   No next/font/google — builds must not depend on Google availability. */

const DESCRIPTION =
  "FORMA — уход за кожей. VISUAL — одежда в спокойных оттенках. Два дома — одна форма.";

export const metadata: Metadata = {
  /* Absolute base for OG/canonical URLs — required once the site lives on
     a real domain, otherwise Next emits relative (broken) social links. */
  metadataBase: new URL("https://forma-visual.com"),
  title: "FORMA VISUAL — косметика и одежда",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "FORMA VISUAL",
    locale: "ru_RU",
    url: "/",
    title: "FORMA VISUAL — косметика и одежда",
    description: DESCRIPTION,
  },
};

/* Каталог читается из Postgres на каждый запрос, поэтому пререндер на этапе
   сборки невозможен: образ собирается без доступа к базе. */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const products = await listProducts();

  return (
    <html lang="ru" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ProductsProvider products={products}>
          <LanguageProvider>
            <CartProvider>
              <SmoothScroll />
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <CartDrawer />
            </CartProvider>
          </LanguageProvider>
        </ProductsProvider>
      </body>
    </html>
  );
}
