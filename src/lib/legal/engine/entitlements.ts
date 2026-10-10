import { addDays, compareDates, serviceYMD, type ISODate, type YMD } from "../dates";
import { D, dec, minDec, nonNegative, sum, type Dec } from "../decimal";
import type { LegalRuleSet, NoticeTier, ScaleBracket } from "../rules/schema";
import { requireRule, resolveMinimumWage, resolveRule } from "../rules/resolve";
import type { CalcStep, CalculationInput, Entitlement, Message, SeniorityBreakdown } from "../types";
import { finalize, notApplicable, statusFlag } from "./entitlement-builder";
import { decimalMonths, hasFraction, msg, n, scaleYears } from "./helpers";
import type { ReferenceSalaryValues } from "./reference-salary";
import { effectiveTotalMonths } from "./seniority";

export interface EngineContext {
  input: CalculationInput;
  ruleSet: LegalRuleSet;
  legalDate: ISODate;
  seniority: SeniorityBreakdown;
  salary: ReferenceSalaryValues;
  /** CDI, or CDD that the user asserts would be requalified as CDI. */
  treatAsCdi: boolean;
  appliedRuleIds: Set<string>;
}

function applyRule<K extends Parameters<typeof requireRule>[1]>(ctx: EngineContext, key: K) {
  const rule = requireRule(ctx.ruleSet, key, ctx.legalDate);
  ctx.appliedRuleIds.add(rule.id);
  return rule;
}

function requalificationFlag(ctx: EngineContext): Message[] {
  return ctx.input.contractType === "CDD" && ctx.treatAsCdi ? [msg("flag.cdd_requalification")] : [];
}

/** -1 if seniority < N years, 0 if exactly N years, 1 if more. */
export function compareSeniorityToYears(ymd: YMD, years: number): number {
  if (ymd.years < years) return -1;
  if (ymd.years > years) return 1;
  return hasFraction(ymd) ? 1 : 0;
}

/* ===================================================================
 * Statutory dismissal indemnity — Labor Code Art. 52-60 / Law 19.12
 * =================================================================== */

export interface BracketAllocation {
  fromYear: number;
  toYear: string;
  years: Dec;
  hoursPerYear: number;
  hours: Dec;
  amount: Dec;
}

export function allocateBrackets(years: Dec, brackets: ScaleBracket[], hourly: Dec): BracketAllocation[] {
  const result: BracketAllocation[] = [];
  let remaining = years;
  let lower = 0;
  for (const b of brackets) {
    if (remaining.lte(0)) break;
    const span = b.upToYears === null ? remaining : minDec(remaining, new D(b.upToYears - lower));
    if (span.gt(0)) {
      const hours = span.times(b.hoursPerYear);
      result.push({
        fromYear: lower,
        toYear: n(new D(lower).plus(span), 4),
        years: span,
        hoursPerYear: b.hoursPerYear,
        hours,
        amount: hours.times(hourly),
      });
      remaining = remaining.minus(span);
    }
    if (b.upToYears !== null) lower = b.upToYears;
  }
  return result;
}

export function dismissalIndemnity(ctx: EngineContext): Entitlement {
  const id = "dismissal_indemnity" as const;
  const { input } = ctx;
  const domestic = input.regime === "domestic";
  const rule = applyRule(ctx, domestic ? "dismissal.domestic" : "dismissal.labor_code");
  const provisionIds = domestic ? ["L1912-21"] : ["CT-52", "CT-53", "CT-54", "CT-55", "CT-56", "CT-57"];

  const reasons: Message[] = [];
  if (!ctx.treatAsCdi) reasons.push(msg("na.dismissal.cdd"));
  switch (input.terminationReason) {
    case "gross_misconduct":
      reasons.push(msg(domestic ? "na.dismissal.gross_misconduct_domestic" : "na.dismissal.gross_misconduct"));
      break;
    case "resignation":
      reasons.push(msg("na.dismissal.resignation"));
      break;
    case "mutual_agreement":
      reasons.push(msg("na.dismissal.mutual"));
      break;
  }
  const effMonths = effectiveTotalMonths(ctx.seniority);
  if (effMonths.lt(rule.value.minEffectiveMonths)) {
    reasons.push(
      msg("na.dismissal.min_seniority", { min: rule.value.minEffectiveMonths, actual: n(effMonths, 2) }),
    );
  }
  if (reasons.length > 0) return notApplicable(id, reasons, provisionIds);

  const method = input.options.dismissalPartialYear ?? rule.value.defaultPartialYear;
  const years = scaleYears(ctx.seniority.effective, method);

  // Art. 56: the reference salary cannot fall below the statutory minimum wage in force.
  let floorHourly: Dec | null = null;
  if (rule.value.minimumWageFloor) {
    const mw = resolveMinimumWage(ctx.ruleSet, input.sector, ctx.legalDate);
    if (mw) floorHourly = mw.unit === "day" ? dec(mw.amount).div(8) : dec(mw.amount);
  }
  const floorApplied = floorHourly !== null && floorHourly.gt(ctx.salary.hourlyArt57);
  const hourly = floorApplied && floorHourly ? floorHourly : ctx.salary.hourlyArt57;

  const alloc = allocateBrackets(years, rule.value.brackets, hourly);
  const totalHours = sum(alloc.map((a) => a.hours));
  const scaleTotal = sum(alloc.map((a) => a.amount));
  const multiplier = input.employeeRepresentative && !domestic ? dec(rule.value.representativeMultiplier) : new D(1);
  const total = scaleTotal.times(multiplier);

  const steps: CalcStep[] = [
    {
      label: msg("step.reference_average"),
      formula: ctx.salary.historyIncluded.length
        ? `Σ / ${ctx.salary.historyIncluded.length}`
        : `${n(ctx.salary.art57Monthly)}`,
      result: n(ctx.salary.art57Average),
      unit: "MAD",
    },
    {
      label: msg("step.hourly_reference"),
      formula: `${n(ctx.salary.art57Average)} / ${n(ctx.salary.monthlyHours)}`,
      result: n(ctx.salary.hourlyArt57, 4),
      unit: "MAD/h",
    },
    ...(floorHourly
      ? [
          {
            label: msg("step.art56_floor"),
            formula: `max(${n(ctx.salary.hourlyArt57, 4)} ; ${n(floorHourly, 4)})`,
            result: n(hourly, 4),
            unit: "MAD/h" as const,
          },
        ]
      : []),
    {
      label: msg(method === "prorata" ? "step.years_prorata" : "step.years_full"),
      formula:
        method === "prorata"
          ? `${ctx.seniority.effective.years} + (${ctx.seniority.effective.months} + ${ctx.seniority.effective.days}/30) / 12`
          : `${ctx.seniority.effective.years}${hasFraction(ctx.seniority.effective) ? " + 1" : ""}`,
      result: n(years, 4),
      unit: "years",
    },
    ...alloc.map((a) => ({
      label: msg("step.bracket", { from: a.fromYear, to: a.toYear, rate: a.hoursPerYear }),
      formula: `${n(a.years, 4)} × ${a.hoursPerYear} h × ${n(hourly, 4)}`,
      result: n(a.amount),
      unit: "MAD" as const,
    })),
    ...(multiplier.gt(1)
      ? [{ label: msg("step.representative"), formula: `${n(scaleTotal)} × ${n(multiplier)}`, result: n(total), unit: "MAD" as const }]
      : []),
  ];

  const reviewFlags: Message[] = [...statusFlag(rule.verification, rule.id), ...requalificationFlag(ctx)];
  if (method === "prorata") reviewFlags.push(msg("flag.prorata_interpretation"));
  if (domestic && input.employeeRepresentative) reviewFlags.push(msg("flag.representative_domestic"));
  if (!input.useSalaryHistory || ctx.salary.historyIncluded.length === 0) reviewFlags.push(msg("flag.no_history"));

  return finalize(
    {
      id,
      nature: "statutory",
      method: msg("method.dismissal_indemnity"),
      formula:
        alloc.map((a) => `${n(a.years, 4)}×${a.hoursPerYear}h`).join(" + ") +
        ` = ${n(totalHours, 2)} h × ${n(hourly, 4)} MAD/h` +
        (multiplier.gt(1) ? ` × ${n(multiplier)}` : ""),
      inputs: [
        { label: msg("input.effective_seniority"), value: `${ctx.seniority.effective.years}/${ctx.seniority.effective.months}/${ctx.seniority.effective.days}`, unit: "text" },
        { label: msg("input.years_applied"), value: n(years, 4), unit: "years" },
        { label: msg("input.reference_monthly_art57"), value: n(ctx.salary.art57Average), unit: "MAD" },
        { label: msg("input.monthly_hours"), value: n(ctx.salary.monthlyHours), unit: "hours" },
        { label: msg("input.hourly_reference"), value: n(hourly, 4), unit: "MAD/h" },
        { label: msg("input.total_hours"), value: n(totalHours, 2), unit: "hours" },
      ],
      steps,
      caps: [],
      notes: [
        msg(method === "prorata" ? "note.prorata" : "note.full_year"),
        ...(floorApplied ? [msg("note.art56_floor_applied")] : []),
        ...(multiplier.gt(1) ? [msg("note.representative", { multiplier: n(multiplier) })] : []),
        ...(domestic ? [msg("note.domestic_seniority_scope")] : []),
      ],
      reasonsNotApplicable: [],
      provisionIds: multiplier.gt(1) ? [...provisionIds, "CT-58"] : provisionIds,
      reviewFlags,
    },
    total,
    input.alreadyPaid.dismissalIndemnity,
  );
}

/* ===================================================================
 * Damages for unfair dismissal — Labor Code Art. 41
 * =================================================================== */

export function unfairDismissalDamages(ctx: EngineContext): Entitlement {
  const id = "unfair_dismissal_damages" as const;
  const { input } = ctx;
  const provisionIds = ["CT-41", "CT-40", "CT-59"];

  if (input.regime === "domestic") {
    return notApplicable(id, [msg("na.damages.domestic")], ["L1912-21"], "judicial_estimate");
  }
  const reasons: Message[] = [];
  if (!ctx.treatAsCdi) reasons.push(msg("na.damages.cdd"));
  switch (input.terminationReason) {
    case "justified_dismissal":
      reasons.push(msg("na.damages.justified"));
      break;
    case "gross_misconduct":
      reasons.push(msg("na.damages.gross_misconduct"));
      break;
    case "resignation":
      reasons.push(msg("na.damages.resignation"));
      break;
    case "mutual_agreement":
      reasons.push(msg("na.damages.mutual"));
      break;
  }
  if (reasons.length > 0) return notApplicable(id, reasons, provisionIds, "judicial_estimate");

  const rule = applyRule(ctx, "damages.labor_code");
  const method = input.options.damagesPartialYear ?? rule.value.defaultPartialYear;
  const years = scaleYears(ctx.seniority.effective, method);
  const perYear = dec(rule.value.monthsPerYear);
  const rawMonths = years.times(perYear);
  const cap = new D(rule.value.capMonths);
  const months = minDec(rawMonths, cap);
  const capped = rawMonths.gt(cap);
  const basis = input.options.damagesSalaryBasis ?? "last_salary";
  const salary = basis === "last_salary" ? ctx.salary.regularMonthly : ctx.salary.art57Average;
  const total = months.times(salary);

  const reviewFlags: Message[] = [msg("flag.judicial_assessment"), ...statusFlag(rule.verification, rule.id), ...requalificationFlag(ctx)];
  if (method === "prorata") reviewFlags.push(msg("flag.prorata_interpretation"));

  return finalize(
    {
      id,
      nature: "judicial_estimate",
      method: msg("method.unfair_dismissal_damages"),
      formula: `min(${n(years, 4)} × ${n(perYear)} ; ${rule.value.capMonths}) = ${n(months, 4)} × ${n(salary)} MAD`,
      inputs: [
        { label: msg("input.years_applied"), value: n(years, 4), unit: "years" },
        { label: msg("input.months_per_year"), value: n(perYear), unit: "months" },
        { label: msg("input.months_before_cap"), value: n(rawMonths, 4), unit: "months" },
        { label: msg("input.cap_months"), value: String(rule.value.capMonths), unit: "months" },
        { label: msg("input.months_awarded"), value: n(months, 4), unit: "months" },
        { label: msg(basis === "last_salary" ? "input.salary_last" : "input.salary_average"), value: n(salary), unit: "MAD" },
      ],
      steps: [
        { label: msg("step.damages_months"), formula: `${n(years, 4)} × ${n(perYear)}`, result: n(rawMonths, 4), unit: "months" },
        { label: msg("step.damages_cap"), formula: `min(${n(rawMonths, 4)} ; ${rule.value.capMonths})`, result: n(months, 4), unit: "months" },
        { label: msg("step.damages_amount"), formula: `${n(months, 4)} × ${n(salary)}`, result: n(total), unit: "MAD" },
      ],
      caps: [capped ? msg("cap.damages_applied", { cap: rule.value.capMonths }) : msg("cap.damages_not_reached", { cap: rule.value.capMonths })],
      notes: [msg("note.damages_distinct")],
      reasonsNotApplicable: [],
      provisionIds,
      reviewFlags,
    },
    total,
    input.alreadyPaid.unfairDismissalDamages,
  );
}

/* ===================================================================
 * Notice indemnity — Labor Code Art. 43, 51 + Decree 2.04.469
 * =================================================================== */

export function selectNoticeTier(ymd: YMD, tiers: NoticeTier[]): NoticeTier {
  for (const tier of tiers) {
    if (tier.upToYears === null) return tier;
    const cmp = compareSeniorityToYears(ymd, tier.upToYears);
    if (cmp < 0 || (cmp === 0 && tier.inclusive)) return tier;
  }
  return tiers[tiers.length - 1];
}

export interface NoticeDuration {
  tier: NoticeTier;
  /** Duration expressed in working days of the employee's schedule. */
  workingDays: Dec;
  /** Duration expressed in months (used for leave accrual during notice). */
  monthsEquivalent: Dec;
  fullAmount: Dec;
}

export function noticeDuration(ctx: EngineContext): NoticeDuration | null {
  const { input } = ctx;
  let tiers: NoticeTier[] | null = null;
  if (input.regime === "domestic") {
    const rule = resolveRule(ctx.ruleSet, "notice.domestic", ctx.legalDate);
    if (rule) ctx.appliedRuleIds.add(rule.id);
    tiers = rule?.value?.tiers ?? null;
  } else {
    const rule = applyRule(ctx, "notice.labor_code");
    tiers = rule.value[input.category];
  }
  if (!tiers || tiers.length === 0) return null;
  const tier = selectNoticeTier(ctx.seniority.effective, tiers);
  const s = ctx.salary;
  if (tier.unit === "months") {
    return {
      tier,
      workingDays: s.workingDaysPerMonth.times(tier.value),
      monthsEquivalent: new D(tier.value),
      fullAmount: s.regularMonthly.times(tier.value),
    };
  }
  return {
    tier,
    workingDays: new D(tier.value),
    monthsEquivalent: new D(tier.value).div(s.workingDaysPerMonth),
    fullAmount: s.dailyRegular.times(tier.value),
  };
}

export function noticeIndemnity(ctx: EngineContext): { entitlement: Entitlement; unservedMonths: Dec } {
  const id = "notice_indemnity" as const;
  const { input } = ctx;
  const domestic = input.regime === "domestic";
  const provisionIds = domestic ? ["L1912-notice"] : ["CT-43", "CT-51", "D-2-04-469"];
  const zero = new D(0);

  const reasons: Message[] = [];
  if (!ctx.treatAsCdi) reasons.push(msg("na.notice.cdd"));
  if (input.terminationReason === "gross_misconduct") reasons.push(msg("na.notice.gross_misconduct"));
  if (input.terminationReason === "resignation") reasons.push(msg("na.notice.resignation"));
  if (input.terminationReason === "mutual_agreement") reasons.push(msg("na.notice.mutual"));
  if (reasons.length > 0) return { entitlement: notApplicable(id, reasons, provisionIds), unservedMonths: zero };

  const duration = noticeDuration(ctx);
  if (!duration) {
    return { entitlement: notApplicable(id, [msg("na.notice.no_rule_domestic")], provisionIds), unservedMonths: zero };
  }

  const s = ctx.salary;
  const { tier, workingDays, fullAmount } = duration;
  let servedDays = new D(0);
  if (input.noticeStatus === "respected") servedDays = workingDays;
  else if (input.noticeStatus === "partial") servedDays = minDec(nonNegative(dec(input.noticeDaysServed)), workingDays);
  const servedValue = s.dailyRegular.times(servedDays);
  const outstanding = nonNegative(fullAmount.minus(servedValue));
  const unservedDays = nonNegative(workingDays.minus(servedDays));
  const unservedMonths = unservedDays.div(s.workingDaysPerMonth);

  const rule = domestic ? resolveRule(ctx.ruleSet, "notice.domestic", ctx.legalDate) : resolveRule(ctx.ruleSet, "notice.labor_code", ctx.legalDate);
  const reviewFlags: Message[] = [...(rule ? statusFlag(rule.verification, rule.id) : []), ...requalificationFlag(ctx)];
  if (tier.unit === "days") reviewFlags.push(msg("flag.notice_days_working_days"));
  if (!domestic && input.category !== "executive" && compareSeniorityToYears(ctx.seniority.effective, 5) === 0) {
    reviewFlags.push(msg("flag.notice_5y_boundary", { category: input.category }));
  }

  const steps: CalcStep[] = [
    {
      label: msg("step.notice_period", { category: input.category }),
      formula: `${tier.value} ${tier.unit === "months" ? "× " + n(s.workingDaysPerMonth, 4) : ""}`.trim(),
      result: n(workingDays, 2),
      unit: "days",
    },
    {
      label: msg("step.notice_full"),
      formula: tier.unit === "months" ? `${tier.value} × ${n(s.regularMonthly)}` : `${tier.value} × ${n(s.dailyRegular, 4)}`,
      result: n(fullAmount),
      unit: "MAD",
    },
  ];
  if (servedDays.gt(0)) {
    steps.push({
      label: msg("step.notice_served"),
      formula: `${n(servedDays, 2)} × ${n(s.dailyRegular, 4)}`,
      result: n(servedValue),
      unit: "MAD",
    });
  }
  steps.push({ label: msg("step.notice_outstanding"), formula: `max(0, ${n(fullAmount)} − ${n(servedValue)})`, result: n(outstanding), unit: "MAD" });

  const notes: Message[] = [];
  if (input.noticeStatus === "respected") notes.push(msg("note.notice_respected"));
  if (input.noticeStatus === "partial") notes.push(msg("note.notice_partial", { days: n(servedDays, 2) }));

  return {
    entitlement: finalize(
      {
        id,
        nature: "statutory",
        method: msg("method.notice_indemnity"),
        formula:
          (tier.unit === "months" ? `${tier.value} × ${n(s.regularMonthly)}` : `${tier.value} × ${n(s.dailyRegular, 4)}`) +
          (servedDays.gt(0) ? ` − ${n(servedDays, 2)} × ${n(s.dailyRegular, 4)}` : ""),
        inputs: [
          { label: msg("input.category"), value: input.category, unit: "text" },
          { label: msg("input.effective_seniority"), value: `${ctx.seniority.effective.years}/${ctx.seniority.effective.months}/${ctx.seniority.effective.days}`, unit: "text" },
          { label: msg("input.notice_duration"), value: String(tier.value), unit: tier.unit },
          { label: msg("input.regular_monthly"), value: n(s.regularMonthly), unit: "MAD" },
          { label: msg("input.daily_reference"), value: n(s.dailyRegular, 4), unit: "MAD/day" },
          { label: msg("input.notice_days_served"), value: n(servedDays, 2), unit: "days" },
        ],
        steps,
        caps: [],
        notes,
        reasonsNotApplicable: [],
        provisionIds,
        reviewFlags,
      },
      outstanding,
      input.alreadyPaid.notice,
    ),
    unservedMonths,
  };
}

/* ===================================================================
 * Paid annual leave — Labor Code Art. 231 et seq. / Law 19.12
 * =================================================================== */

export function defaultLeaveReferenceStart(startDate: ISODate, endDate: ISODate): ISODate {
  const janFirst = `${endDate.slice(0, 4)}-01-01`;
  return compareDates(startDate, janFirst) > 0 ? startDate : janFirst;
}

export function paidLeave(ctx: EngineContext, noticeUnservedMonths: Dec): Entitlement {
  const id = "paid_leave" as const;
  const { input } = ctx;
  const domestic = input.regime === "domestic";
  const provisionIds = domestic ? ["L1912-16"] : ["CT-231", "CT-232", "CT-238", "CT-239", "CT-251", "CT-252", "CT-254"];
  const s = ctx.salary;

  let daysPerMonth: Dec;
  let bonusDays = new D(0);
  let maxDays: Dec | null = null;
  let minServiceMonths: number;
  let ruleId: string;
  let verification: "verified" | "corroborated" | "requires_legal_review";
  let bonusSteps: CalcStep[] = [];

  const refStart = input.leave.referencePeriodStart && compareDates(input.leave.referencePeriodStart, input.startDate) >= 0
    ? input.leave.referencePeriodStart
    : defaultLeaveReferenceStart(input.startDate, input.endDate);
  const periodYmd = compareDates(input.endDate, refStart) >= 0 ? serviceYMD(refStart, input.endDate) : { years: 0, months: 0, days: 0 };
  const rawPeriodMonths = decimalMonths(periodYmd).plus(noticeUnservedMonths);
  const totalServiceMonths = effectiveTotalMonths(ctx.seniority);
  let periodMonths = rawPeriodMonths;
  let monthRounding: Message | null = null;

  if (domestic) {
    const rule = applyRule(ctx, "paid_leave.domestic");
    daysPerMonth = dec(rule.value.daysPerMonth);
    minServiceMonths = rule.value.minServiceMonths;
    ruleId = rule.id;
    verification = rule.verification;
  } else {
    const rule = applyRule(ctx, "paid_leave.labor_code");
    daysPerMonth = dec(input.employeeUnder18 ? rule.value.minorDaysPerMonth : rule.value.daysPerMonth);
    minServiceMonths = rule.value.minServiceMonths;
    ruleId = rule.id;
    verification = rule.verification;
    if (rule.value.startedMonthCountsAsFull) {
      // Art. 251: after the minimum service, every started month counts in full.
      // Art. 252: below it, only complete months count.
      if (totalServiceMonths.gte(minServiceMonths)) {
        periodMonths = rawPeriodMonths.ceil();
        monthRounding = msg("note.leave_started_month", { raw: n(rawPeriodMonths, 4), months: n(periodMonths) });
      } else {
        periodMonths = rawPeriodMonths.floor();
        monthRounding = msg("note.leave_full_months_only", { raw: n(rawPeriodMonths, 4), months: n(periodMonths), min: minServiceMonths });
      }
    }
    const fullPeriods = Math.floor(ctx.seniority.effective.years / rule.value.seniorityBonusEveryYears);
    const annualBonus = dec(rule.value.seniorityBonusDays).times(fullPeriods);
    const annualBase = daysPerMonth.times(12);
    const annualCapped = minDec(annualBase.plus(annualBonus), new D(rule.value.maxDays));
    bonusDays = annualCapped.minus(annualBase).times(periodMonths).div(12);
    if (bonusDays.isNegative()) bonusDays = new D(0);
    maxDays = new D(rule.value.maxDays).times(periodMonths).div(12);
    bonusSteps = [
      {
        label: msg("step.leave_bonus", { periods: fullPeriods, every: rule.value.seniorityBonusEveryYears }),
        formula: `min(${n(annualBase)} + ${fullPeriods} × ${rule.value.seniorityBonusDays} ; ${rule.value.maxDays}) − ${n(annualBase)} = ${n(annualCapped.minus(annualBase))} × ${n(periodMonths, 4)}/12`,
        result: n(bonusDays, 2),
        unit: "days",
      },
    ];
  }

  const baseAccrued = daysPerMonth.times(periodMonths);
  let accrued = baseAccrued.plus(bonusDays);
  if (maxDays && accrued.gt(maxDays)) accrued = maxDays;
  const carried = nonNegative(dec(input.leave.carriedOverDays));
  const taken = nonNegative(dec(input.leave.daysTaken));
  const remaining = nonNegative(accrued.plus(carried).minus(taken));
  const total = remaining.times(s.dailyRegular);

  const notes: Message[] = [msg("note.leave_daily_divisor", { days: n(s.workingDaysPerMonth, 2) })];
  if (noticeUnservedMonths.gt(0)) notes.push(msg("note.leave_notice_period", { months: n(noticeUnservedMonths, 4) }));
  if (monthRounding) notes.push(monthRounding);
  const reviewFlags: Message[] = [...statusFlag(verification, ruleId)];
  if (domestic && totalServiceMonths.lt(minServiceMonths)) reviewFlags.push(msg("flag.leave_under_min_service", { months: minServiceMonths }));
  if (input.terminationReason === "gross_misconduct") notes.push(msg("note.leave_gross_misconduct"));

  return finalize(
    {
      id,
      nature: "statutory",
      method: msg("method.paid_leave"),
      formula: `(${n(accrued, 2)} + ${n(carried, 2)} − ${n(taken, 2)}) × ${n(s.dailyRegular, 4)}`,
      inputs: [
        { label: msg("input.leave_reference_start"), value: refStart, unit: "text" },
        { label: msg("input.leave_period_months"), value: n(periodMonths, 4), unit: "months" },
        { label: msg("input.leave_days_per_month"), value: n(daysPerMonth), unit: "days" },
        { label: msg("input.leave_accrued"), value: n(accrued, 2), unit: "days" },
        { label: msg("input.leave_carried"), value: n(carried, 2), unit: "days" },
        { label: msg("input.leave_taken"), value: n(taken, 2), unit: "days" },
        { label: msg("input.leave_remaining"), value: n(remaining, 2), unit: "days" },
        { label: msg("input.daily_reference"), value: n(s.dailyRegular, 4), unit: "MAD/day" },
      ],
      steps: [
        { label: msg("step.leave_base"), formula: `${n(periodMonths, 4)} × ${n(daysPerMonth)}`, result: n(baseAccrued, 2), unit: "days" },
        ...bonusSteps,
        { label: msg("step.leave_remaining"), formula: `${n(accrued, 2)} + ${n(carried, 2)} − ${n(taken, 2)}`, result: n(remaining, 2), unit: "days" },
        { label: msg("step.daily_reference"), formula: `${n(s.regularMonthly)} / ${n(s.workingDaysPerMonth, 4)}`, result: n(s.dailyRegular, 4), unit: "MAD/day" },
        { label: msg("step.leave_amount"), formula: `${n(remaining, 2)} × ${n(s.dailyRegular, 4)}`, result: n(total), unit: "MAD" },
      ],
      caps: maxDays ? [msg("cap.leave_max", { max: n(maxDays, 2) })] : [],
      notes,
      reasonsNotApplicable: [],
      provisionIds,
      reviewFlags,
    },
    total,
    input.alreadyPaid.paidLeave,
  );
}

/* ===================================================================
 * Early termination of a fixed-term contract — Labor Code Art. 33
 * =================================================================== */

export function cddDamages(ctx: EngineContext): Entitlement {
  const id = "cdd_damages" as const;
  const { input } = ctx;
  const provisionIds = ["CT-33", "CT-16"];

  if (input.contractType !== "CDD") return notApplicable(id, [msg("na.cdd.not_cdd")], provisionIds);
  if (ctx.treatAsCdi) return notApplicable(id, [msg("na.cdd.requalified")], provisionIds);
  if (input.regime === "domestic") return notApplicable(id, [msg("na.cdd.domestic")], ["L1912-21"]);

  const reasons: Message[] = [];
  if (input.terminationReason === "gross_misconduct") reasons.push(msg("na.cdd.gross_misconduct"));
  if (input.terminationReason === "resignation") reasons.push(msg("na.cdd.resignation"));
  if (input.terminationReason === "mutual_agreement") reasons.push(msg("na.cdd.mutual"));
  const planned = input.cddPlannedEndDate;
  if (!planned) reasons.push(msg("na.cdd.no_planned_end"));
  else if (compareDates(planned, input.endDate) <= 0) reasons.push(msg("na.cdd.term_reached"));
  if (reasons.length > 0 || !planned) return notApplicable(id, reasons, provisionIds);

  const remaining = serviceYMD(addDays(input.endDate, 1), planned);
  const months = decimalMonths(remaining);
  const salary = ctx.salary.regularMonthly;
  const total = months.times(salary);
  const notes: Message[] = [];
  if (input.terminationReason === "justified_dismissal") notes.push(msg("note.cdd_justified_reason"));

  return finalize(
    {
      id,
      nature: "statutory",
      method: msg("method.cdd_damages"),
      formula: `(${remaining.years * 12 + remaining.months} + ${remaining.days}/30) × ${n(salary)}`,
      inputs: [
        { label: msg("input.cdd_planned_end"), value: planned, unit: "text" },
        { label: msg("input.cdd_remaining"), value: `${remaining.years}/${remaining.months}/${remaining.days}`, unit: "text" },
        { label: msg("input.cdd_remaining_months"), value: n(months, 4), unit: "months" },
        { label: msg("input.regular_monthly"), value: n(salary), unit: "MAD" },
      ],
      steps: [
        { label: msg("step.cdd_remaining"), formula: `${addDays(input.endDate, 1)} → ${planned}`, result: n(months, 4), unit: "months" },
        { label: msg("step.cdd_amount"), formula: `${n(months, 4)} × ${n(salary)}`, result: n(total), unit: "MAD" },
      ],
      caps: [],
      notes,
      reasonsNotApplicable: [],
      provisionIds,
      reviewFlags: [],
    },
    total,
    input.alreadyPaid.cddDamages,
  );
}

/* ===================================================================
 * Other outstanding entitlements (wages, overtime, holidays, bonuses)
 * =================================================================== */

export function otherEntitlements(ctx: EngineContext): Entitlement {
  const id = "other_entitlements" as const;
  const { input } = ctx;
  const o = input.other;
  const s = ctx.salary;
  const rates = applyRule(ctx, "overtime.rates").value;

  const wages = nonNegative(dec(o.unpaidWages));
  const h25 = nonNegative(dec(o.unpaidOvertimeHours.rate25));
  const h50 = nonNegative(dec(o.unpaidOvertimeHours.rate50));
  const h100 = nonNegative(dec(o.unpaidOvertimeHours.rate100));
  const hourly = s.hourlyRegular;
  const ot25 = h25.times(hourly).times(new D(1).plus(dec(rates.rate25).div(100)));
  const ot50 = h50.times(hourly).times(new D(1).plus(dec(rates.rate50).div(100)));
  const ot100 = h100.times(hourly).times(new D(1).plus(dec(rates.rate100).div(100)));
  const otAmount = nonNegative(dec(o.unpaidOvertimeAmount));
  const holidays = nonNegative(dec(o.unpaidPublicHolidayDays)).times(s.dailyRegular);
  const bonuses = nonNegative(dec(o.outstandingBonuses));
  const others = nonNegative(dec(o.otherEntitlements));
  const total = sum([wages, ot25, ot50, ot100, otAmount, holidays, bonuses, others]);

  const steps: CalcStep[] = [];
  if (wages.gt(0)) steps.push({ label: msg("step.other_wages"), formula: n(wages), result: n(wages), unit: "MAD" });
  if (h25.gt(0)) steps.push({ label: msg("step.other_ot", { rate: rates.rate25 }), formula: `${n(h25)} × ${n(hourly, 4)} × ${n(new D(1).plus(dec(rates.rate25).div(100)))}`, result: n(ot25), unit: "MAD" });
  if (h50.gt(0)) steps.push({ label: msg("step.other_ot", { rate: rates.rate50 }), formula: `${n(h50)} × ${n(hourly, 4)} × ${n(new D(1).plus(dec(rates.rate50).div(100)))}`, result: n(ot50), unit: "MAD" });
  if (h100.gt(0)) steps.push({ label: msg("step.other_ot", { rate: rates.rate100 }), formula: `${n(h100)} × ${n(hourly, 4)} × ${n(new D(1).plus(dec(rates.rate100).div(100)))}`, result: n(ot100), unit: "MAD" });
  if (otAmount.gt(0)) steps.push({ label: msg("step.other_ot_amount"), formula: n(otAmount), result: n(otAmount), unit: "MAD" });
  if (holidays.gt(0)) steps.push({ label: msg("step.other_holidays"), formula: `${n(dec(o.unpaidPublicHolidayDays))} × ${n(s.dailyRegular, 4)}`, result: n(holidays), unit: "MAD" });
  if (bonuses.gt(0)) steps.push({ label: msg("step.other_bonuses"), formula: n(bonuses), result: n(bonuses), unit: "MAD" });
  if (others.gt(0)) steps.push({ label: msg("step.other_misc"), formula: n(others), result: n(others), unit: "MAD" });

  const notes: Message[] = [msg("note.other_separate")];
  const reviewFlags: Message[] = [];
  if (h25.plus(h50).plus(h100).gt(0) && input.components.some((c) => c.type === "overtime" && dec(c.monthlyAmount).gt(0))) {
    notes.push(msg("note.overtime_no_double"));
  }
  if (bonuses.gt(0) && input.components.some((c) => c.type === "work_bonus" && dec(c.monthlyAmount).gt(0))) {
    reviewFlags.push(msg("flag.bonus_double_count"));
  }

  return finalize(
    {
      id,
      nature: "statutory",
      method: msg("method.other_entitlements"),
      formula: steps.length ? steps.map((st) => st.result).join(" + ") : "0",
      inputs: [
        { label: msg("input.hourly_regular"), value: n(hourly, 4), unit: "MAD/h" },
        { label: msg("input.daily_reference"), value: n(s.dailyRegular, 4), unit: "MAD/day" },
      ],
      steps,
      caps: [],
      notes,
      reasonsNotApplicable: [],
      provisionIds: ["CT-201", "CT-217", "CT-356"],
      reviewFlags,
    },
    total,
    input.alreadyPaid.other,
  );
}

