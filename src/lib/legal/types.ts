import type { ISODate, YMD } from "./dates";

export type Regime = "labor_code" | "domestic";
export type Sector = "non_agricultural" | "agricultural";
export type ProfessionalCategory = "executive" | "employee" | "worker";
export type ContractType = "CDI" | "CDD";
export type TerminationReason =
  | "unfair_dismissal"
  | "justified_dismissal"
  | "gross_misconduct"
  | "resignation"
  | "cdd_early_termination"
  | "mutual_agreement";
export type NoticeStatus = "respected" | "partial" | "none";
export type PartialYearMethod = "prorata" | "full_year";
export type DamagesSalaryBasis = "last_salary" | "average_52_weeks";

/**
 * Salary component classification. The flags attached to each type in
 * `salary-components.ts` decide whether it enters the Article 57 base
 * (dismissal indemnity) and/or the "remuneration the employee would have
 * received" base (notice, paid leave, damages, CDD damages).
 */
export type SalaryComponentType =
  | "seniority_bonus"
  | "function_allowance"
  | "work_bonus"
  | "overtime"
  | "commission"
  | "tips"
  | "benefit_in_kind"
  | "variable_pay"
  | "responsibility_allowance"
  | "hardship_allowance"
  | "danger_zone_allowance"
  | "temporary_replacement"
  | "expense_reimbursement"
  | "transport_allowance"
  | "family_allowance"
  | "gratuity";

export interface SalaryComponentInput {
  id: string;
  type: SalaryComponentType;
  label?: string;
  monthlyAmount: string;
}

export interface SalaryHistoryRow {
  /** YYYY-MM */
  month: string;
  /** Total gross remuneration paid for that month. */
  gross: string;
  /** Part of that gross that is excluded from the Article 57 base (reimbursements, hardship...). */
  excluded: string;
}

export type SuspensionType =
  | "illness"
  | "work_accident"
  | "maternity"
  | "military_service"
  | "strike"
  | "temporary_closure"
  | "unpaid_leave"
  | "disciplinary_suspension"
  | "other";

export interface SuspensionPeriod {
  id: string;
  type: SuspensionType;
  from: ISODate;
  to: ISODate;
  /** User override of whether the period counts as effective work for seniority. */
  countsAsEffectiveWork?: boolean;
}

export interface OvertimeHoursInput {
  rate25: string;
  rate50: string;
  rate100: string;
}

export interface AlreadyPaidInput {
  dismissalIndemnity: string;
  unfairDismissalDamages: string;
  notice: string;
  paidLeave: string;
  cddDamages: string;
  other: string;
}

export interface CalculationInput {
  regime: Regime;
  sector: Sector;
  category: ProfessionalCategory;
  contractType: ContractType;
  terminationReason: TerminationReason;
  /** CDD only: planned end date of the fixed-term contract. */
  cddPlannedEndDate?: ISODate;
  /** CDD only: user asserts a court would requalify the contract as a CDI (Art. 16-17). */
  cddRequalifiedAsCdi?: boolean;

  startDate: ISODate;
  /** Last day of the employment relationship (inclusive). */
  endDate: ISODate;
  /** Applicable legal date; defaults to the termination date. */
  legalDate?: ISODate;

  weeklyHours: string;
  dailyHours: string;
  employeeUnder18?: boolean;

  grossMonthly: string;
  netMonthly?: string;
  baseSalary?: string;
  components: SalaryComponentInput[];
  useSalaryHistory: boolean;
  salaryHistory: SalaryHistoryRow[];

  suspensions: SuspensionPeriod[];

  noticeStatus: NoticeStatus;
  /** Days of notice actually worked or paid when noticeStatus = partial. */
  noticeDaysServed?: string;

  leave: {
    /** Start of the current leave reference period (defaults to the anniversary/1 Jan). */
    referencePeriodStart?: ISODate;
    carriedOverDays: string;
    daysTaken: string;
  };

  other: {
    unpaidWages: string;
    unpaidOvertimeHours: OvertimeHoursInput;
    unpaidOvertimeAmount: string;
    unpaidPublicHolidayDays: string;
    outstandingBonuses: string;
    otherEntitlements: string;
    salaryAdvances: string;
  };

  alreadyPaid: AlreadyPaidInput;

  options: {
    dismissalPartialYear?: PartialYearMethod;
    damagesPartialYear?: PartialYearMethod;
    damagesSalaryBasis?: DamagesSalaryBasis;
  };
}

/* ---------------------------------------------------------------- results */

export type MessageParams = Record<string, string | number>;
export interface Message {
  key: string;
  params?: MessageParams;
}

export type EntitlementId =
  | "dismissal_indemnity"
  | "unfair_dismissal_damages"
  | "notice_indemnity"
  | "paid_leave"
  | "cdd_damages"
  | "other_entitlements";

export type EntitlementStatus = "payable" | "not_applicable" | "zero";

/** statutory = fixed by law; judicial = awarded by a court, figure is an estimate. */
export type EntitlementNature = "statutory" | "judicial_estimate";

export interface CalcLine {
  label: Message;
  value: string;
  unit?: "MAD" | "hours" | "days" | "months" | "years" | "ratio" | "percent" | "MAD/h" | "MAD/day" | "text";
}

export interface CalcStep {
  label: Message;
  formula: string;
  result: string;
  unit?: CalcLine["unit"];
}

export interface Entitlement {
  id: EntitlementId;
  status: EntitlementStatus;
  nature: EntitlementNature;
  /** Gross computed amount before deducting amounts already paid. */
  computed: string;
  alreadyPaid: string;
  /** Outstanding amount = max(0, computed - alreadyPaid). */
  amount: string;
  method: Message;
  formula: string;
  inputs: CalcLine[];
  steps: CalcStep[];
  caps: Message[];
  notes: Message[];
  reasonsNotApplicable: Message[];
  provisionIds: string[];
  reviewFlags: Message[];
}

export interface SeniorityBreakdown {
  actual: YMD;
  actualDays: number;
  excludedSuspensionDays: number;
  effective: YMD;
  effectiveDecimalYears: string;
  actualDecimalYears: string;
}

export interface ReferenceSalary {
  /** Article 57 included elements, latest month. */
  art57Monthly: string;
  /** Average of Article 57 base over the 52 weeks (12 months) preceding termination. */
  art57Average: string;
  averageMonthsUsed: number;
  /** All regular remuneration the employee would have received (notice / leave base). */
  regularMonthly: string;
  monthlyHours: string;
  monthlyHoursMethod: Message;
  hourlyReference: string;
  workingDaysPerWeek: string;
  workingDaysPerMonth: string;
  dailyReference: string;
  componentBreakdown: {
    id: string;
    type: SalaryComponentType | "base_salary" | "unclassified";
    label?: string;
    amount: string;
    inArt57: boolean;
    inRegular: boolean;
  }[];
}

export interface MinimumWageCheck {
  sector: "non_agricultural" | "agricultural" | "domestic";
  entryId: string | null;
  unit: "hour" | "day" | "month";
  statutoryAmount: string | null;
  statutoryMonthlyEquivalent: string | null;
  employeeComparable: string | null;
  belowMinimum: boolean;
  decree: string | null;
  validFrom: ISODate | null;
  validTo: ISODate | null;
  historyMonthsBelow: string[];
  notes: Message[];
}

export interface CalculationResult {
  ok: boolean;
  errors: Message[];
  warnings: Message[];
  legalDate: ISODate;
  rulesVersion: string;
  seniority: SeniorityBreakdown | null;
  referenceSalary: ReferenceSalary | null;
  minimumWage: MinimumWageCheck | null;
  entitlements: Entitlement[];
  totals: {
    statutory: string;
    judicialEstimate: string;
    grandTotal: string;
    advancesDeducted: string;
    netPayable: string;
  };
  appliedRuleIds: string[];
}
