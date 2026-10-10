import { DEFAULT_LOCALE, dir } from "@/lib/i18n";
import "../globals.css";

export default function RootRedirectLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={DEFAULT_LOCALE} dir={dir(DEFAULT_LOCALE)} className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
