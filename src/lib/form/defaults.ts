import { addMonths } from "../legal/dates";
import type { CalculationInput, SalaryHistoryRow } from "../legal/types";

export function emptyInput(): CalculationInput {
  return {
    regime: "labor_code",
    sector: "non_agricultural",
    category: "employee",
    contractType: "CDI",
    terminationReason: "unfair_dismissal",
    cddPlannedEndDate: "",
    cddRequalifiedAsCdi: false,
    startDate: "",
    endDate: "",
    legalDate: "",
    weeklyHours: "44",
    dailyHours: "8",
    employeeUnder18: false,
    grossMonthly: "",
    netMonthly: "",
    baseSalary: "",
    components: [],
    useSalaryHistory: false,
    salaryHistory: [],
    suspensions: [],
    noticeStatus: "none",
    noticeDaysServed: "",
    leave: { referencePeriodStart: "", carriedOverDays: "", daysTaken: "" },
    other: {
      unpaidWages: "",
      unpaidOvertimeHours: { rate25: "", rate50: "", rate100: "" },
      unpaidOvertimeAmount: "",
      unpaidPublicHolidayDays: "",
      outstandingBonuses: "",
      otherEntitlements: "",
      salaryAdvances: "",
    },
    alreadyPaid: { dismissalIndemnity: "", unfairDismissalDamages: "", notice: "", paidLeave: "", cddDamages: "", other: "" },
    options: { dismissalPartialYear: undefined, damagesPartialYear: undefined, damagesSalaryBasis: "last_salary" },
  };
}

/** Realistic scenario used by the "Load an example" button and the README. */
export function exampleInput(): CalculationInput {
  return {
    ...emptyInput(),
    category: "employee",
    terminationReason: "unfair_dismissal",
    startDate: "2017-03-15",
    endDate: "2026-06-30",
    weeklyHours: "44",
    dailyHours: "8",
    grossMonthly: "6500",
    netMonthly: "5720",
    baseSalary: "",
    components: [
      { id: "c1", type: "seniority_bonus", monthlyAmount: "500" },
      { id: "c2", type: "transport_allowance", monthlyAmount: "300" },
      { id: "c3", type: "overtime", monthlyAmount: "200" },
    ],
    noticeStatus: "none",
    leave: { referencePeriodStart: "", carriedOverDays: "0", daysTaken: "4" },
    other: { ...emptyInput().other, unpaidWages: "6500" },
  };
}

/** Twelve monthly rows preceding the termination month, pre-filled with the current salary. */
export function buildHistoryRows(endDate: string, gross: string, excluded: string): SalaryHistoryRow[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return [];
  const rows: SalaryHistoryRow[] = [];
  for (let i = 11; i >= 0; i--) {
    const month = addMonths(`${endDate.slice(0, 7)}-01`, -i).slice(0, 7);
    rows.push({ month, gross, excluded });
  }
  return rows;
}

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
