"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  BookOpenText,
  CalendarRange,
  Calculator as CalculatorIcon,
  CircleAlert,
  ExternalLink,
  Gavel,
  Landmark,
  Scale,
  ShieldAlert,
  Sigma,
  Timer,
  Umbrella,
  Wallet,
  FileSignature,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/components/i18n-provider";
import { provisionLabel } from "@/lib/legal/presentation";
import { findProvision, paidHolidaysInForce } from "@/lib/legal/rules/resolve";
import type { LegalRuleSet, VerificationStatus } from "@/lib/legal/rules/schema";
import type { CalculationInput, CalculationResult, Entitlement, EntitlementId } from "@/lib/legal/types";
import { cn } from "@/lib/utils";

const ICONS: Record<EntitlementId, React.ElementType> = {
  dismissal_indemnity: Scale,
  unfair_dismissal_damages: Gavel,
  notice_indemnity: Timer,
  paid_leave: Umbrella,
  cdd_damages: FileSignature,
  other_entitlements: Wallet,
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const { t } = useI18n();
  const styles: Record<VerificationStatus, string> = {
    verified: "border-success/30 bg-success/10 text-success",
    corroborated: "border-primary/25 bg-primary/8 text-primary",
    requires_legal_review: "border-warning/40 bg-warning/15 text-[oklch(0.45_0.12_70)]",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", styles[status])}>
      {status === "requires_legal_review" ? <ShieldAlert className="size-3" /> : <BadgeCheck className="size-3" />}
      {t(`results.verification.${status}`)}
    </span>
  );
}

function SummaryCard({ e }: { e: Entitlement }) {
  const { t, mad } = useI18n();
  const Icon = ICONS[e.id];
  const na = e.status === "not_applicable";
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors",
        na && "bg-muted/40 shadow-none",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("flex size-9 items-center justify-center rounded-lg", na ? "bg-muted text-muted-foreground" : "bg-primary/8 text-primary")}>
          <Icon className="size-4.5" aria-hidden />
        </span>
        <Badge variant={na ? "outline" : e.status === "zero" ? "secondary" : "default"} className="shrink-0">
          {t(`results.status.${e.status}`)}
        </Badge>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium leading-snug text-muted-foreground">{t(`results.card.${e.id}`)}</p>
        <p className={cn("mt-1 truncate text-xl font-semibold tabular", na ? "text-muted-foreground" : "text-foreground")} dir="auto">
          {na ? "—" : mad(e.amount)}
        </p>
      </div>
      {e.nature === "judicial_estimate" && !na ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-[oklch(0.45_0.12_70)]">
          <Gavel className="size-3" aria-hidden />
          {t("results.nature.judicial_estimate")}
        </p>
      ) : null}
    </div>
  );
}

function ymdText(t: ReturnType<typeof useI18n>["t"], ymd: { years: number; months: number; days: number }) {
  return t("results.seniority.ymd", { years: ymd.years, months: ymd.months, days: ymd.days });
}

function KeyValue({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed py-2 last:border-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className={cn("text-end text-sm tabular", strong && "font-semibold text-foreground")} dir="auto">
        {value}
      </dd>
    </div>
  );
}

export function ResultsDashboard({
  result,
  ruleSet,
  input,
}: {
  result: CalculationResult;
  ruleSet: LegalRuleSet;
  input: CalculationInput;
}) {
  const { t, tm, mad, date, num, unitValue, locale } = useI18n();

  if (!result.ok) {
    return (
      <Alert variant="destructive" role="alert">
        <CircleAlert className="size-4" />
        <AlertTitle>{t("results.errors")}</AlertTitle>
        <AlertDescription>
          <ul className="mt-1 list-disc space-y-1 ps-4">
            {result.errors.map((e, i) => (
              <li key={i}>{tm(e)}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  const shown = result.entitlements.filter((e) => e.id !== "cdd_damages" || input.contractType === "CDD");
  const eligible = result.entitlements.filter((e) => e.status !== "not_applicable");
  const ineligible = result.entitlements.filter((e) => e.status === "not_applicable" && (e.id !== "cdd_damages" || input.contractType === "CDD"));
  const s = result.seniority!;
  const rs = result.referenceSalary!;
  const mw = result.minimumWage;

  const provisionIds = Array.from(new Set(result.entitlements.flatMap((e) => e.provisionIds)));
  const provisions = provisionIds.map((id) => findProvision(ruleSet, id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const mwEntry = mw?.entryId ? ruleSet.minimumWages.find((w) => w.id === mw.entryId) : null;
  const holidays = paidHolidaysInForce(ruleSet, result.legalDate);
  const refList = (e: Entitlement) =>
    e.provisionIds
      .map((id) => findProvision(ruleSet, id))
      .filter(Boolean)
      .map((p) => provisionLabel(p!, locale))
      .join(" · ");

  return (
    <div className="flex flex-col gap-5">
      {/* --------------------------------------------- headline */}
      <section aria-labelledby="total-heading" className="overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-md">
        <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-6">
          <div>
            <p id="total-heading" className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
              <Sigma className="size-4" aria-hidden />
              {t("results.grandTotal")}
            </p>
            <p className="mt-1 text-3xl font-bold tabular sm:text-4xl" dir="auto">
              {mad(result.totals.grandTotal)}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-primary-foreground/80">
              <span>
                {t("results.statutoryTotal")}: <strong className="tabular text-primary-foreground">{mad(result.totals.statutory)}</strong>
              </span>
              <span>
                {t("results.judicialTotal")}: <strong className="tabular text-primary-foreground">{mad(result.totals.judicialEstimate)}</strong>
              </span>
              {result.totals.advancesDeducted !== "0.00" ? (
                <span>
                  {t("results.netPayable")}: <strong className="tabular text-primary-foreground">{mad(result.totals.netPayable)}</strong>
                </span>
              ) : null}
            </div>
          </div>
          <dl className="grid gap-1 rounded-xl bg-white/10 px-4 py-3 text-xs">
            <div className="flex items-center justify-between gap-6">
              <dt className="flex items-center gap-1.5 text-primary-foreground/75">
                <CalendarRange className="size-3.5" aria-hidden />
                {t("results.legalDate")}
              </dt>
              <dd className="font-semibold tabular">{date(result.legalDate)}</dd>
            </div>
            <div className="flex items-center justify-between gap-6">
              <dt className="flex items-center gap-1.5 text-primary-foreground/75">
                <BookOpenText className="size-3.5" aria-hidden />
                {t("results.rulesVersion")}
              </dt>
              <dd className="font-semibold tabular" dir="ltr">
                {result.rulesVersion}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {result.warnings.length ? (
        <Alert className="border-warning/40 bg-warning/8">
          <AlertTriangle className="size-4 text-[oklch(0.5_0.13_70)]" />
          <AlertTitle>{t("results.warnings")}</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 ps-4 text-[13px]">
              {result.warnings.map((w, i) => (
                <li key={i}>{tm(w)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* --------------------------------------------- summary cards */}
      <section aria-label={t("results.title")} className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {shown.map((e) => (
          <SummaryCard key={e.id} e={e} />
        ))}
      </section>

      {/* --------------------------------------------- seniority / salary / minimum wage */}
      <div className="grid gap-4 2xl:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarRange className="size-4 text-primary" aria-hidden />
              {t("results.seniority")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <KeyValue label={t("results.seniority.actual")} value={ymdText(t, s.actual)} />
              <KeyValue label={t("results.seniority.excluded")} value={num(String(s.excludedSuspensionDays))} />
              <KeyValue label={t("results.seniority.effective")} value={ymdText(t, s.effective)} strong />
              <KeyValue label={t("unit.years")} value={num(s.effectiveDecimalYears, 0, 4)} />
            </dl>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Landmark className="size-4 text-primary" aria-hidden />
              {t("results.salary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <KeyValue label={t("results.salary.art57Average")} value={mad(rs.art57Average)} strong />
              {rs.averageMonthsUsed ? <KeyValue label={t("results.salary.averageMonths")} value={num(String(rs.averageMonthsUsed))} /> : null}
              <KeyValue label={t("results.salary.regularMonthly")} value={mad(rs.regularMonthly)} />
              <KeyValue label={t("results.salary.monthlyHours")} value={num(rs.monthlyHours, 0, 2)} />
              <KeyValue label={t("results.salary.hourly")} value={unitValue(rs.hourlyReference, "MAD/h")} strong />
              <KeyValue label={t("results.salary.daysPerMonth")} value={num(rs.workingDaysPerMonth, 0, 2)} />
              <KeyValue label={t("results.salary.daily")} value={unitValue(rs.dailyReference, "MAD/day")} />
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{tm(rs.monthlyHoursMethod)}</p>
          </CardContent>
        </Card>
        <Card size="sm" className={cn(mw?.belowMinimum && "ring-destructive/40")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className={cn("size-4", mw?.belowMinimum ? "text-destructive" : "text-primary")} aria-hidden />
              {t("results.minwage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mw && mw.statutoryAmount ? (
              <>
                <Badge variant={mw.belowMinimum ? "destructive" : "secondary"} className="mb-2">
                  {mw.belowMinimum ? t("results.minwage.below") : t("results.minwage.ok")}
                </Badge>
                <dl>
                  <KeyValue label={t("results.minwage.applicable")} value={unitValue(mw.statutoryAmount, mw.unit === "day" ? "MAD/day" : "MAD/h")} strong />
                  <KeyValue label={t("results.minwage.employee")} value={unitValue(mw.employeeComparable ?? "0", mw.unit === "day" ? "MAD/day" : "MAD/h")} />
                  <KeyValue label={t("results.minwage.monthlyEq")} value={mad(mw.statutoryMonthlyEquivalent ?? "0")} />
                  <KeyValue label={t("results.minwage.decree")} value={mw.decree} />
                  <KeyValue label={t("results.minwage.period")} value={`${date(mw.validFrom ?? "")} → ${mw.validTo ? date(mw.validTo) : "…"}`} />
                </dl>
              </>
            ) : null}
            {mw?.notes.map((n, i) => (
              <p key={i} className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {tm(n)}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* --------------------------------------------- detailed table */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <CalculatorIcon className="size-4 text-primary" aria-hidden />
            {t("results.table.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="ps-4 text-start">{t("results.table.type")}</TableHead>
                  <TableHead className="text-start">{t("results.table.method")}</TableHead>
                  <TableHead className="text-end">{t("results.table.computed")}</TableHead>
                  <TableHead className="text-end">{t("results.table.paid")}</TableHead>
                  <TableHead className="text-end">{t("results.table.outstanding")}</TableHead>
                  <TableHead className="pe-4 text-start">{t("results.table.reference")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eligible.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="ps-4 align-top font-medium whitespace-normal">
                      {t(`results.card.${e.id}`)}
                      {e.nature === "judicial_estimate" ? (
                        <span className="mt-0.5 block text-[11px] font-normal text-[oklch(0.45_0.12_70)]">{t("results.nature.judicial_estimate")}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[260px] align-top whitespace-normal">
                      <span className="block text-[13px]">{tm(e.method)}</span>
                      <code className="mt-1 block text-[11px] break-words text-muted-foreground" dir="ltr">
                        {e.formula}
                      </code>
                    </TableCell>
                    <TableCell className="text-end align-top tabular whitespace-nowrap">{mad(e.computed)}</TableCell>
                    <TableCell className="text-end align-top tabular whitespace-nowrap text-muted-foreground">{mad(e.alreadyPaid)}</TableCell>
                    <TableCell className="text-end align-top font-semibold tabular whitespace-nowrap">{mad(e.amount)}</TableCell>
                    <TableCell className="pe-4 align-top text-[12px] whitespace-normal text-muted-foreground">{refList(e)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="ps-4 font-semibold">
                    {t("results.grandTotal")}
                  </TableCell>
                  <TableCell className="text-end font-bold tabular whitespace-nowrap">{mad(result.totals.grandTotal)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --------------------------------------------- ineligible */}
      {ineligible.length ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Ban className="size-4 text-muted-foreground" aria-hidden />
              {t("results.ineligible")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("results.ineligible.desc")}</p>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {ineligible.map((e) => (
                <li key={e.id} className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium">{t(`results.card.${e.id}`)}</p>
                  <ul className="mt-1 list-disc space-y-0.5 ps-4 text-[13px] text-muted-foreground">
                    {e.reasonsNotApplicable.map((r, i) => (
                      <li key={i}>{tm(r)}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* --------------------------------------------- how calculated */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Sigma className="size-4 text-primary" aria-hidden />
            {t("results.how")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <Accordion multiple defaultValue={eligible.slice(0, 1).map((e) => e.id)}>
            {eligible.map((e) => (
              <AccordionItem key={e.id} value={e.id}>
                <AccordionTrigger className="py-3.5 hover:no-underline">
                  <span className="flex flex-1 flex-wrap items-center justify-between gap-2 pe-2">
                    <span className="font-semibold">{t(`results.card.${e.id}`)}</span>
                    <span className="tabular text-primary">{mad(e.amount)}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <EntitlementDetail e={e} refs={refList(e)} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* --------------------------------------------- legal basis */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <BookOpenText className="size-4 text-primary" aria-hidden />
            {t("results.legalBasis")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("results.legalBasis.desc")}</p>
        </CardHeader>
        <CardContent className="grid gap-3 py-4">
          {provisions.map((p) => (
            <article key={p.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {provisionLabel(p, locale)} — {p.title[locale]}
                </h3>
                <VerificationBadge status={p.verification} />
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{p.summary[locale]}</p>
              <a href={p.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <ExternalLink className="size-3" aria-hidden />
                {t("results.source")}
                {p.bulletinOfficiel ? ` · ${p.bulletinOfficiel}` : ""}
              </a>
            </article>
          ))}
          {mwEntry ? (
            <article className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {t("results.minwage")} — {mwEntry.decree}
                </h3>
                <VerificationBadge status={mwEntry.verification} />
              </div>
              <p className="mt-1.5 text-[13px] text-muted-foreground tabular">
                {unitValue(mwEntry.amount, mwEntry.unit === "day" ? "MAD/day" : "MAD/h")} · {date(mwEntry.validFrom)} → {mwEntry.validTo ? date(mwEntry.validTo) : "…"}
              </p>
              <a href={mwEntry.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <ExternalLink className="size-3" aria-hidden />
                {t("results.source")}
              </a>
            </article>
          ) : null}
          {holidays.length ? (
            <article className="rounded-lg border p-3">
              <h3 className="text-sm font-semibold">{t("results.holidays")}</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {holidays.map((h) => (
                  <li key={h.id}>
                    <Badge variant="outline" className="font-normal">
                      {h.name[locale]}
                      {h.fixedDate ? <span className="ms-1 text-muted-foreground tabular" dir="ltr">{h.fixedDate.split("-").reverse().join("/")}</span> : null}
                    </Badge>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function EntitlementDetail({ e, refs }: { e: Entitlement; refs: string }) {
  const { t, tm, unitValue } = useI18n();
  return (
    <div className="grid gap-4 pb-2">
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("results.how.formula")}</p>
        <code className="mt-1 block rounded-md bg-muted px-3 py-2 text-[12px] break-words" dir="ltr">
          {e.formula}
        </code>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("results.how.inputs")}</p>
          <dl className="mt-1">
            {e.inputs.map((i, k) => (
              <KeyValue key={k} label={tm(i.label)} value={unitValue(i.value, i.unit)} />
            ))}
          </dl>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("results.how.steps")}</p>
          <ol className="mt-1 grid gap-1.5">
            {e.steps.map((s, k) => (
              <li key={k} className="rounded-md border px-3 py-2">
                <p className="text-[12px] text-muted-foreground">{tm(s.label)}</p>
                <p className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2 text-[12px]">
                  <code dir="ltr" className="break-words">
                    {s.formula}
                  </code>
                  <strong className="tabular">{unitValue(s.result, s.unit)}</strong>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {e.caps.length ? (
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("results.how.caps")}</p>
          <ul className="mt-1 list-disc ps-4 text-[13px]">
            {e.caps.map((c, k) => (
              <li key={k}>{tm(c)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {e.notes.length ? (
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("results.how.notes")}</p>
          <ul className="mt-1 list-disc ps-4 text-[13px] text-muted-foreground">
            {e.notes.map((c, k) => (
              <li key={k}>{tm(c)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {e.reviewFlags.length ? (
        <div className="rounded-lg border border-warning/40 bg-warning/8 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[oklch(0.45_0.12_70)]">
            <ShieldAlert className="size-3.5" aria-hidden />
            {t("results.how.flags")}
          </p>
          <ul className="mt-1 list-disc ps-4 text-[13px]">
            {e.reviewFlags.map((c, k) => (
              <li key={k}>{tm(c)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-[12px] text-muted-foreground">
        <span className="font-semibold">{t("results.table.reference")}:</span> {refs}
      </p>
    </div>
  );
}
