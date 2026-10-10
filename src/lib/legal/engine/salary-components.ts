import type { SalaryComponentType } from "../types";

export interface ComponentTreatment {
  /** Enters the Article 57 base used for the dismissal indemnity. */
  inArt57: boolean;
  /**
   * Part of the remuneration the employee "would have received had they
   * remained at work" (Art. 51 notice, paid-leave pay, damages, CDD damages).
   * Reimbursements of expenses and family allowances (paid by CNSS) are never
   * remuneration.
   */
  inRegular: boolean;
  /** Article 57 paragraph justifying the treatment. */
  art57Ref: string;
}

/**
 * Article 57 of Law 65-99: the dismissal-indemnity base includes the salary
 * proper, and
 *  1) bonuses and allowances inherent to the work, EXCLUDING
 *     a) reimbursements of costs/expenses,
 *     b) responsibility allowances (except function allowances such as team leader),
 *     c) allowances for arduous or dangerous work,
 *     d) allowances for work in dangerous zones,
 *     e) allowances for temporary replacement / temporary or exceptional work,
 *        except overtime pay;
 *  2) benefits in kind;
 *  3) commissions and tips.
 */
export const COMPONENT_TREATMENT: Record<SalaryComponentType, ComponentTreatment> = {
  seniority_bonus: { inArt57: true, inRegular: true, art57Ref: "57-1" },
  function_allowance: { inArt57: true, inRegular: true, art57Ref: "57-1-b" },
  work_bonus: { inArt57: true, inRegular: true, art57Ref: "57-1" },
  overtime: { inArt57: true, inRegular: true, art57Ref: "57-1-e" },
  commission: { inArt57: true, inRegular: true, art57Ref: "57-3" },
  tips: { inArt57: true, inRegular: true, art57Ref: "57-3" },
  benefit_in_kind: { inArt57: true, inRegular: true, art57Ref: "57-2" },
  variable_pay: { inArt57: true, inRegular: true, art57Ref: "57-1" },
  responsibility_allowance: { inArt57: false, inRegular: true, art57Ref: "57-1-b" },
  hardship_allowance: { inArt57: false, inRegular: true, art57Ref: "57-1-c" },
  danger_zone_allowance: { inArt57: false, inRegular: true, art57Ref: "57-1-d" },
  temporary_replacement: { inArt57: false, inRegular: true, art57Ref: "57-1-e" },
  expense_reimbursement: { inArt57: false, inRegular: false, art57Ref: "57-1-a" },
  transport_allowance: { inArt57: false, inRegular: false, art57Ref: "57-1-a" },
  family_allowance: { inArt57: false, inRegular: false, art57Ref: "family" },
  gratuity: { inArt57: false, inRegular: false, art57Ref: "gratuity" },
};

export const COMPONENT_TYPES = Object.keys(COMPONENT_TREATMENT) as SalaryComponentType[];
