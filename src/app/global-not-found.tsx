import type { Metadata } from "next";
import { BASE_PATH } from "@/lib/deployment";
import { translate } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: `404 · ${translate("ar", "app.title")}`,
  icons: { icon: `${BASE_PATH}/favicon.ico` },
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="flex min-h-full items-center justify-center bg-background p-6 text-foreground">
        <main className="flex max-w-md flex-col items-center gap-4 text-center">
          <p className="text-5xl font-bold text-primary tabular">404</p>
          <h1 className="text-lg font-semibold">الصفحة المطلوبة غير موجودة</h1>
          <p lang="fr" dir="ltr" className="text-sm text-muted-foreground">
            La page demandée est introuvable.
          </p>
          <nav className="flex gap-2">
            <a href={`${BASE_PATH}/ar/`} className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
              {translate("ar", "nav.calculator")}
            </a>
            <a href={`${BASE_PATH}/fr/`} lang="fr" className="inline-flex h-9 items-center rounded-lg border px-4 text-sm font-semibold text-primary">
              {translate("fr", "nav.calculator")}
            </a>
          </nav>
        </main>
      </body>
    </html>
  );
}
