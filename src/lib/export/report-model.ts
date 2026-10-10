import { dir, formatDate, formatMAD, formatUnitValue, tm, translate, type Locale } from "../i18n";
import { provisionLabel } from "../legal/presentation";
import { findProvision } from "../legal/rules/resolve";
import type { LegalRuleSet } from "../legal/rules/schema";
import type { CalculationInput, CalculationResult } from "../legal/types";

export interface ReportRow {
  label: string;
  value: string;
}

export interface ReportEntitlement {
  id: string;
  title: string;
  nature: string;
  method: string;
  formula: string;
  computed: string;
  computedRaw: string;
  paid: string;
  paidRaw: string;
  amount: string;
  amountRaw: string;
  references: string;
  steps: { label: string; formula: string; result: string }[];
  inputs: ReportRow[];
  caps: string[];
  notes: string[];
  flags: string[];
}

export interface ReportModel {
  locale: Locale;
  dir: "rtl" | "ltr";
  title: string;
  subtitle: string;
  generatedAt: string;
  legalDate: string;
  rulesVersion: string;
  employment: ReportRow[];
  seniority: ReportRow[];
  salary: ReportRow[];
  entitlements: ReportEntitlement[];
  ineligible: { title: string; reasons: string[] }[];
  warnings: string[];
  provisions: { label: string; title: string; summary: string; url: string; status: string }[];
  totals: ReportRow[];
  grandTotal: string;
  grandTotalRaw: string;
  disclaimer: string;
  privacy: string;
}

const REPORT_TITLE: Record<Locale, string> = {
  ar: "تقرير احتساب التعويضات القانونية المترتبة عن إنهاء عقد الشغل",
  fr: "Rapport de calcul des indemnités légales de rupture du contrat de travail",
};

const LABELS: Record<Locale, Record<string, string>> = {
  ar: {
    employment: "معطيات علاقة الشغل",
    contract: "نوع العقد وسبب الإنهاء",
    seniority: "الأقدمية المعتمدة",
    salary: "الأجر المرجعي",
    table: "الجدول التفصيلي للتعويضات",
    formulas: "صيغ الحساب",
    legal: "المراجع القانونية المطبقة",
    total: "المجموع النهائي",
    ineligible: "تعويضات غير مستحقة",
    warnings: "ملاحظات",
    generated: "تاريخ إنشاء التقرير",
    page: "صفحة",
    verification: "حالة التحقق",
  },
  fr: {
    employment: "Informations sur la relation de travail",
    contract: "Type de contrat et motif de rupture",
    seniority: "Ancienneté reconnue",
    salary: "Salaire de référence",
    table: "Tableau détaillé des indemnités",
    formulas: "Formules de calcul",
    legal: "Références légales appliquées",
    total: "Total final",
    ineligible: "Indemnités non applicables",
    warnings: "Points d'attention",
    generated: "Date de génération du rapport",
    page: "Page",
    verification: "Statut de vérification",
  },
};

export function reportLabel(locale: Locale, key: string): string {
  return LABELS[locale][key] ?? key;
}

export function buildReportModel(
  result: CalculationResult,
  input: CalculationInput,
  ruleSet: LegalRuleSet,
  locale: Locale,
  now = new Date(),
): ReportModel {
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
  const mad = (v: string) => formatMAD(v, locale);
  const date = (v: string) => formatDate(v, locale);
  const ymd = (y: { years: number; months: number; days: number }) => t("results.seniority.ymd", { ...y });

  const employment: ReportRow[] = [
    { label: t("form.regime"), value: t(`form.regime.${input.regime}`) },
    ...(input.regime === "labor_code"
      ? [
          { label: t("form.sector"), value: t(`form.sector.${input.sector}`) },
          { label: t("form.category"), value: t(`form.category.${input.category}`) },
        ]
      : []),
    { label: t("form.contract"), value: t(`form.contract.${input.contractType}`) },
    { label: t("form.reason"), value: t(`form.reason.${input.terminationReason}`) },
    ...(input.contractType === "CDD" && input.cddPlannedEndDate ? [{ label: t("form.cddPlannedEnd"), value: date(input.cddPlannedEndDate) }] : []),
    { label: t("form.startDate"), value: date(input.startDate) },
    { label: t("form.endDate"), value: date(input.endDate) },
    { label: t("form.legalDate"), value: date(result.legalDate) },
    { label: t("form.weeklyHours"), value: formatUnitValue(input.weeklyHours || "0", "hours", locale) },
    { label: t("form.dailyHours"), value: formatUnitValue(input.dailyHours || "0", "hours", locale) },
    { label: t("form.grossMonthly"), value: mad(input.grossMonthly || "0") },
    { label: t("form.notice.status"), value: t(`form.notice.${input.noticeStatus}`) },
  ];

  const s = result.seniority;
  const seniority: ReportRow[] = s
    ? [
        { label: t("results.seniority.actual"), value: ymd(s.actual) },
        { label: t("results.seniority.excluded"), value: String(s.excludedSuspensionDays) },
        { label: t("results.seniority.effective"), value: ymd(s.effective) },
      ]
    : [];

  const r = result.referenceSalary;
  const salary: ReportRow[] = r
    ? [
        { label: t("results.salary.art57Average"), value: mad(r.art57Average) },
        { label: t("results.salary.regularMonthly"), value: mad(r.regularMonthly) },
        { label: t("results.salary.monthlyHours"), value: formatUnitValue(r.monthlyHours, "hours", locale) },
        { label: t("results.salary.hourly"), value: formatUnitValue(r.hourlyReference, "MAD/h", locale) },
        { label: t("results.salary.daysPerMonth"), value: formatUnitValue(r.workingDaysPerMonth, "days", locale) },
        { label: t("results.salary.daily"), value: formatUnitValue(r.dailyReference, "MAD/day", locale) },
      ]
    : [];

  const refs = (ids: string[]) =>
    ids
      .map((id) => findProvision(ruleSet, id))
      .filter(Boolean)
      .map((p) => provisionLabel(p!, locale))
      .join(" · ");

  const entitlements: ReportEntitlement[] = result.entitlements
    .filter((e) => e.status !== "not_applicable")
    .map((e) => ({
      id: e.id,
      title: t(`results.card.${e.id}`),
      nature: t(`results.nature.${e.nature}`),
      method: tm(locale, e.method),
      formula: e.formula,
      computed: mad(e.computed),
      computedRaw: e.computed,
      paid: mad(e.alreadyPaid),
      paidRaw: e.alreadyPaid,
      amount: mad(e.amount),
      amountRaw: e.amount,
      references: refs(e.provisionIds),
      steps: e.steps.map((st) => ({ label: tm(locale, st.label), formula: st.formula, result: formatUnitValue(st.result, st.unit, locale) })),
      inputs: e.inputs.map((i) => ({ label: tm(locale, i.label), value: formatUnitValue(i.value, i.unit, locale) })),
      caps: e.caps.map((c) => tm(locale, c)),
      notes: e.notes.map((c) => tm(locale, c)),
      flags: e.reviewFlags.map((c) => tm(locale, c)),
    }));

  const ineligible = result.entitlements
    .filter((e) => e.status === "not_applicable" && (e.id !== "cdd_damages" || input.contractType === "CDD"))
    .map((e) => ({ title: t(`results.card.${e.id}`), reasons: e.reasonsNotApplicable.map((m) => tm(locale, m)) }));

  const provisionIds = Array.from(new Set(result.entitlements.flatMap((e) => e.provisionIds)));
  const provisions = provisionIds
    .map((id) => findProvision(ruleSet, id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      label: provisionLabel(p, locale),
      title: p.title[locale],
      summary: p.summary[locale],
      url: p.officialUrl,
      status: t(`results.verification.${p.verification}`),
    }));
  const mw = result.minimumWage;
  if (mw?.entryId) {
    const entry = ruleSet.minimumWages.find((w) => w.id === mw.entryId);
    if (entry) {
      provisions.push({
        label: entry.decree,
        title: t("results.minwage"),
        summary: `${formatUnitValue(entry.amount, entry.unit === "day" ? "MAD/day" : "MAD/h", locale)} · ${date(entry.validFrom)} → ${entry.validTo ? date(entry.validTo) : "…"}`,
        url: entry.officialUrl,
        status: t(`results.verification.${entry.verification}`),
      });
    }
  }

  return {
    locale,
    dir: dir(locale),
    title: REPORT_TITLE[locale],
    subtitle: t("app.title"),
    generatedAt: `${formatDate(now.toISOString().slice(0, 10), locale)} ${now.toISOString().slice(11, 16)} UTC`,
    legalDate: date(result.legalDate),
    rulesVersion: result.rulesVersion,
    employment,
    seniority,
    salary,
    entitlements,
    ineligible,
    warnings: result.warnings.map((w) => tm(locale, w)),
    provisions,
    totals: [
      { label: t("results.statutoryTotal"), value: mad(result.totals.statutory) },
      { label: t("results.judicialTotal"), value: mad(result.totals.judicialEstimate) },
      ...(result.totals.advancesDeducted !== "0.00"
        ? [
            { label: t("form.other.advances"), value: `− ${mad(result.totals.advancesDeducted)}` },
            { label: t("results.netPayable"), value: mad(result.totals.netPayable) },
          ]
        : []),
    ],
    grandTotal: mad(result.totals.grandTotal),
    grandTotalRaw: result.totals.grandTotal,
    disclaimer: t("app.disclaimer"),
    privacy: t("app.privacy"),
  };
}
