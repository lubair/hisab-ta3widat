"use client";

import { Languages, Scale, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const other = locale === "ar" ? "fr" : "ar";
  const switchHref = pathname.replace(/^\/(ar|fr)/, `/${other}`) || `/${other}`;
  const onAdmin = pathname.includes("/admin");

  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 print:static print:border-b-2 print:border-primary">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Scale className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold leading-tight text-foreground sm:text-base">{t("app.title")}</span>
            <span className="hidden truncate text-xs text-muted-foreground md:block">{t("app.subtitle")}</span>
          </span>
        </Link>
        <nav className="ms-auto flex shrink-0 items-center gap-1 print:hidden" aria-label="Navigation">
          <Link
            href={onAdmin ? `/${locale}` : `/${locale}/admin`}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            )}
          >
            <Settings2 className="size-4" aria-hidden />
            <span className="hidden sm:inline">{onAdmin ? t("nav.calculator") : t("nav.admin")}</span>
          </Link>
          <Link
            href={switchHref}
            hrefLang={other}
            lang={other}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold text-primary transition-colors hover:bg-accent"
          >
            <Languages className="size-4" aria-hidden />
            {t("nav.language")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
