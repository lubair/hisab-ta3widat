"use client";

import { Calculator as CalculatorIcon, ClipboardList, Lock, Sparkles } from "lucide-react";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { emptyInput, exampleInput } from "@/lib/form/defaults";
import { calculateCompensation } from "@/lib/legal/engine/calculate";
import { resolveRule } from "@/lib/legal/rules/resolve";
import type { LegalRuleSet } from "@/lib/legal/rules/schema";
import type { CalculationInput } from "@/lib/legal/types";
import { CalculatorForm } from "./calculator-form";
import { ExportActions } from "./export-actions";
import { ResultsDashboard } from "./results-dashboard";

/** Converts form strings to the engine contract (empty optional fields become undefined). */
export function normalizeInput(input: CalculationInput): CalculationInput {
  return {
    ...input,
    legalDate: input.legalDate || undefined,
    cddPlannedEndDate: input.contractType === "CDD" ? input.cddPlannedEndDate || undefined : undefined,
    cddRequalifiedAsCdi: input.contractType === "CDD" ? input.cddRequalifiedAsCdi : false,
    leave: { ...input.leave, referencePeriodStart: input.leave.referencePeriodStart || undefined },
    noticeDaysServed: input.noticeStatus === "partial" ? input.noticeDaysServed : "",
  };
}

export function Calculator({ ruleSet }: { ruleSet: LegalRuleSet }) {
  const { t } = useI18n();
  const [input, setInput] = useState<CalculationInput>(emptyInput);
  const [submitted, setSubmitted] = useState(false);
  const deferred = useDeferredValue(input);
  const resultsRef = useRef<HTMLDivElement>(null);

  const normalized = useMemo(() => normalizeInput(deferred), [deferred]);
  const result = useMemo(() => (submitted ? calculateCompensation(normalized, ruleSet) : null), [submitted, normalized, ruleSet]);

  const legalDate = input.legalDate || input.endDate;
  const suspensionDefaults = useMemo(
    () => (legalDate ? resolveRule(ruleSet, "seniority.suspension_assimilation", legalDate)?.value ?? null : null),
    [ruleSet, legalDate],
  );

  function calculate() {
    setSubmitted(true);
    requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 1023px)").matches) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function reset() {
    setInput(emptyInput());
    setSubmitted(false);
  }

  function loadExample() {
    setInput(exampleInput());
    setSubmitted(true);
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-6 sm:px-6">
      <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between print:hidden">
        <p className="flex items-center gap-2">
          <Lock className="size-3.5 shrink-0 text-primary" aria-hidden />
          {t("app.privacy")}
        </p>
        <Button variant="outline" size="sm" onClick={loadExample} className="w-fit">
          <Sparkles className="size-4" aria-hidden />
          {t("form.example")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section aria-label={t("form.section.framework")} className="flex flex-col gap-4 print:hidden">
          <CalculatorForm value={input} onChange={setInput} suspensionDefaults={suspensionDefaults} />
          <div className="sticky bottom-3 z-30 flex gap-2 rounded-xl border bg-card/95 p-2 shadow-lg backdrop-blur">
            <Button size="lg" className="h-11 flex-1 text-[15px]" onClick={calculate}>
              <CalculatorIcon className="size-4.5" aria-hidden />
              {t("form.calculate")}
            </Button>
          </div>
        </section>

        <section ref={resultsRef} aria-live="polite" aria-label={t("results.title")} className="flex min-w-0 scroll-mt-20 flex-col gap-4 print:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-lg font-bold">
              <ClipboardList className="size-5 text-primary" aria-hidden />
              {t("results.title")}
            </h1>
            <ExportActions result={result} input={normalized} ruleSet={ruleSet} onReset={reset} />
          </div>
          {result ? (
            <ResultsDashboard result={result} ruleSet={ruleSet} input={normalized} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                <CalculatorIcon className="size-7" aria-hidden />
              </span>
              <h2 className="text-base font-semibold">{t("results.empty.title")}</h2>
              <p className="max-w-sm text-sm text-muted-foreground">{t("results.empty.desc")}</p>
            </div>
          )}
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t("app.disclaimer")}</p>
        </section>
      </div>
    </main>
  );
}
