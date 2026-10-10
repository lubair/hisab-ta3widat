"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { dir, formatDate, formatMAD, formatNumber, formatUnitValue, tm, translate, type Locale } from "@/lib/i18n";
import type { Message } from "@/lib/legal/types";

interface I18nValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: (key: string, params?: Record<string, string | number>) => string;
  tm: (message: Message) => string;
  mad: (value: string) => string;
  num: (value: string, min?: number, max?: number) => string;
  date: (iso: string) => string;
  unitValue: (value: string, unit?: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = useCallback((key: string, params?: Record<string, string | number>) => translate(locale, key, params), [locale]);
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      dir: dir(locale),
      t,
      tm: (m) => tm(locale, m),
      mad: (v) => formatMAD(v, locale),
      num: (v, min = 0, max = 4) => formatNumber(v, locale, min, max),
      date: (iso) => formatDate(iso, locale),
      unitValue: (v, unit) => formatUnitValue(v, unit, locale),
    }),
    [locale, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
