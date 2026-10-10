import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/components/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BASE_PATH } from "@/lib/deployment";
import { dir, isLocale, LOCALES, translate } from "@/lib/i18n";
import "../globals.css";

const plex = IBM_Plex_Sans_Arabic({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : "ar";
  return {
    title: translate(l, "app.title"),
    description: translate(l, "app.subtitle"),
    icons: { icon: `${BASE_PATH}/favicon.ico` },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} dir={dir(locale)} className={`${plex.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <I18nProvider locale={locale}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position={locale === "ar" ? "bottom-left" : "bottom-right"} />
        </I18nProvider>
      </body>
    </html>
  );
}
