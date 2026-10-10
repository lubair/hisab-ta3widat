"use client";

import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function StaticAdminNotice({ rulesVersion, publishedAt }: { rulesVersion: string; publishedAt: string }) {
  const { t, locale, date, dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("admin.title")}</h1>
      <Alert className="mt-4">
        <Info aria-hidden />
        <AlertTitle>{t("admin.static.title")}</AlertTitle>
        <AlertDescription>{t("admin.static.desc")}</AlertDescription>
      </Alert>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("admin.activeVersion")}: <code dir="ltr">{rulesVersion}</code> · {date(publishedAt.slice(0, 10))}
      </p>
      <Link
        href={`/${locale}`}
        className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold text-primary transition-colors hover:bg-accent"
      >
        <Arrow className="size-4" aria-hidden />
        {t("admin.back")}
      </Link>
    </main>
  );
}
