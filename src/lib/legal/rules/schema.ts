import type { ISODate } from "../dates";
import type { SuspensionType } from "../types";

export type VerificationStatus = "verified" | "corroborated" | "requires_legal_review";

export interface LocalizedText {
  ar: string;
  fr: string;
}

export type InstrumentId =
  | "law_65_99"
  | "decree_2_04_469"
  | "law_19_12"
  | "decree_2_17_355"
  | "decree_2_17_356"
  | "minimum_wage_decree"
  | "decree_paid_holidays";

export interface LegalProvision {
  id: string;
  instrument: InstrumentId;
  article: string;
  title: LocalizedText;
  summary: LocalizedText;
  officialUrl: string;
  bulletinOfficiel?: string;
  validFrom: ISODate;
  validTo?: ISODate | null;
  verification: VerificationStatus;
  notes?: string;
}

export type MinimumWageSector = "non_agricultural" | "agricultural";

export interface MinimumWageEntry {
  id: string;
  sector: MinimumWageSector;
  unit: "hour" | "day";
  /** Decimal string, MAD. */
  amount: string;
  validFrom: ISODate;
  validTo?: ISODate | null;
  decree: string;
  decreeDate?: ISODate;
  bulletinOfficiel?: string;
  officialUrl: string;
  verification: VerificationStatus;
  notes?: string;
}

export interface ScaleBracket {
  /** Upper bound in years of seniority (exclusive of the next bracket); null = open-ended. */
  upToYears: number | null;
  hoursPerYear: number;
}

export interface NoticeTier {
  /** Upper bound of the tier in years; null = no bound. */
  upToYears: number | null;
  /** Whether a seniority exactly equal to `upToYears` still belongs to this tier. */
  inclusive: boolean;
  value: number;
  unit: "days" | "months";
}

export interface RuleValueMap {
  "working_time.non_agricultural": { weeklyHours: number; annualHours: number; conventionalMonthlyHours: number };
  "working_time.agricultural": { weeklyHours: number; annualHours: number; conventionalMonthlyHours: number };
  "working_time.domestic": { weeklyHours: number; minorWeeklyHours: number; conventionalMonthlyHours: number };
  "dismissal.labor_code": { minEffectiveMonths: number; brackets: ScaleBracket[]; defaultPartialYear: "prorata" | "full_year" };
  "dismissal.domestic": { minEffectiveMonths: number; brackets: ScaleBracket[]; defaultPartialYear: "prorata" | "full_year" };
  "damages.labor_code": { monthsPerYear: string; capMonths: number; defaultPartialYear: "prorata" | "full_year" };
  "notice.labor_code": { executive: NoticeTier[]; employee: NoticeTier[]; worker: NoticeTier[] };
  "notice.domestic": { tiers: NoticeTier[] } | null;
  "paid_leave.labor_code": {
    daysPerMonth: string;
    minorDaysPerMonth: string;
    seniorityBonusDays: string;
    seniorityBonusEveryYears: number;
    maxDays: number;
    minServiceMonths: number;
  };
  "paid_leave.domestic": { daysPerMonth: string; minServiceMonths: number };
  "overtime.rates": { rate25: string; rate50: string; rate100: string };
  "minimum_wage.domestic": { ratioOfSmig: string };
  "regime.availability": { laborCodeFrom: ISODate; domesticFrom: ISODate };
  /** Default treatment of suspension periods for seniority (true = counted as effective work). */
  "seniority.suspension_assimilation": Record<SuspensionType, boolean>;
}

export type RuleKey = keyof RuleValueMap;

export interface RuleEntry<K extends RuleKey = RuleKey> {
  id: string;
  key: K;
  value: RuleValueMap[K];
  validFrom: ISODate;
  validTo?: ISODate | null;
  provisionIds: string[];
  verification: VerificationStatus;
  description: LocalizedText;
  notes?: string;
}

export type AnyRuleEntry = { [K in RuleKey]: RuleEntry<K> }[RuleKey];

export interface PaidHoliday {
  id: string;
  name: LocalizedText;
  kind: "civil" | "religious";
  /** MM-DD for fixed civil holidays. */
  fixedDate?: string;
  validFrom: ISODate;
  validTo?: ISODate | null;
  source: string;
  verification: VerificationStatus;
}

export interface LegalRuleSet {
  schemaVersion: 1;
  /** Human-readable version of the legal rules data. */
  version: string;
  publishedAt: string;
  minimumWages: MinimumWageEntry[];
  provisions: LegalProvision[];
  rules: AnyRuleEntry[];
  paidHolidays: PaidHoliday[];
}
