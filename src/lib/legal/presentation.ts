import type { Locale } from "../i18n";
import type { InstrumentId, LegalProvision } from "./rules/schema";

export const INSTRUMENT_NAMES: Record<InstrumentId, { ar: string; fr: string }> = {
  law_65_99: { ar: "مدونة الشغل", fr: "Code du travail" },
  decree_2_04_469: { ar: "المرسوم 2.04.469", fr: "Décret 2.04.469" },
  law_19_12: { ar: "القانون 19.12", fr: "Loi 19-12" },
  decree_2_17_355: { ar: "المرسوم 2.17.355", fr: "Décret 2.17.355" },
  decree_2_17_356: { ar: "المرسوم 2.17.356", fr: "Décret 2.17.356" },
  minimum_wage_decree: { ar: "مرسوم الحد الأدنى للأجر", fr: "Décret SMIG/SMAG" },
  decree_paid_holidays: { ar: "مرسوم الأعياد المؤدى عنها", fr: "Décret jours fériés" },
};

export function provisionLabel(p: LegalProvision, locale: Locale): string {
  const instrument = INSTRUMENT_NAMES[p.instrument][locale];
  if (!p.article || p.article === "—") return instrument;
  return locale === "ar" ? `المادة ${p.article} — ${instrument}` : `Art. ${p.article} — ${instrument}`;
}
