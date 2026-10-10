"use client";

import {
  Briefcase,
  CalendarClock,
  CalendarOff,
  Coins,
  HandCoins,
  History,
  Plus,
  Receipt,
  Scale,
  SlidersHorizontal,
  Trash2,
  Umbrella,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/components/i18n-provider";
import { buildHistoryRows, uid } from "@/lib/form/defaults";
import { dec, sum } from "@/lib/legal/decimal";
import { COMPONENT_TREATMENT, COMPONENT_TYPES } from "@/lib/legal/engine/salary-components";
import type {
  CalculationInput,
  ContractType,
  NoticeStatus,
  ProfessionalCategory,
  Regime,
  SalaryComponentType,
  Sector,
  SuspensionType,
  TerminationReason,
} from "@/lib/legal/types";
import { cn } from "@/lib/utils";
import { DateField, MoneyField, NumberField, SectionTitle, SelectField } from "./fields";

const REASONS: TerminationReason[] = [
  "unfair_dismissal",
  "justified_dismissal",
  "gross_misconduct",
  "resignation",
  "cdd_early_termination",
  "mutual_agreement",
];
const SUSPENSION_TYPES: SuspensionType[] = [
  "illness",
  "work_accident",
  "maternity",
  "military_service",
  "strike",
  "temporary_closure",
  "unpaid_leave",
  "disciplinary_suspension",
  "other",
];

interface Props {
  value: CalculationInput;
  onChange: (next: CalculationInput) => void;
  suspensionDefaults: Record<SuspensionType, boolean> | null;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-foreground/90">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-input bg-card text-foreground hover:border-primary/40 hover:bg-accent",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalculatorForm({ value: v, onChange, suspensionDefaults }: Props) {
  const { t } = useI18n();
  const set = <K extends keyof CalculationInput>(key: K, val: CalculationInput[K]) => onChange({ ...v, [key]: val });
  const setOther = <K extends keyof CalculationInput["other"]>(key: K, val: CalculationInput["other"][K]) =>
    onChange({ ...v, other: { ...v.other, [key]: val } });
  const setPaid = (key: keyof CalculationInput["alreadyPaid"], val: string) =>
    onChange({ ...v, alreadyPaid: { ...v.alreadyPaid, [key]: val } });
  const setLeave = (key: keyof CalculationInput["leave"], val: string) => onChange({ ...v, leave: { ...v.leave, [key]: val } });

  const domestic = v.regime === "domestic";
  const reasons = REASONS.filter((r) => (v.contractType === "CDI" ? r !== "cdd_early_termination" : true));
  const datesInvalid = Boolean(v.startDate && v.endDate && v.endDate < v.startDate);

  const excludedMonthly = sum(
    v.components.filter((c) => !COMPONENT_TREATMENT[c.type].inArt57).map((c) => dec(c.monthlyAmount)),
  ).toFixed(2);

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------ legal framework */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <SectionTitle icon={Scale} title={t("form.section.framework")} description={t("form.section.framework.desc")} />
        </CardHeader>
        <CardContent className="grid gap-4 py-5">
          <Segmented<Regime>
            label={t("form.regime")}
            value={v.regime}
            onChange={(regime) => onChange({ ...v, regime, weeklyHours: regime === "domestic" ? "48" : v.sector === "agricultural" ? "48" : "44" })}
            options={[
              { value: "labor_code", label: t("form.regime.labor_code") },
              { value: "domestic", label: t("form.regime.domestic") },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {!domestic ? (
              <SelectField<Sector>
                label={t("form.sector")}
                value={v.sector}
                onChange={(sector) => onChange({ ...v, sector, weeklyHours: sector === "agricultural" ? "48" : "44" })}
                options={[
                  { value: "non_agricultural", label: t("form.sector.non_agricultural") },
                  { value: "agricultural", label: t("form.sector.agricultural") },
                ]}
              />
            ) : null}
            {!domestic ? (
              <SelectField<ProfessionalCategory>
                label={t("form.category")}
                value={v.category}
                onChange={(c) => set("category", c)}
                options={(["executive", "employee", "worker"] as const).map((c) => ({ value: c, label: t(`form.category.${c}`) }))}
              />
            ) : null}
            <SelectField<ContractType>
              label={t("form.contract")}
              value={v.contractType}
              onChange={(contractType) =>
                onChange({
                  ...v,
                  contractType,
                  terminationReason:
                    contractType === "CDI" && v.terminationReason === "cdd_early_termination" ? "unfair_dismissal" : contractType === "CDD" && v.terminationReason === "unfair_dismissal" ? "cdd_early_termination" : v.terminationReason,
                })
              }
              options={(["CDI", "CDD"] as const).map((c) => ({ value: c, label: t(`form.contract.${c}`) }))}
            />
            <SelectField<TerminationReason>
              label={t("form.reason")}
              value={v.terminationReason}
              onChange={(r) => set("terminationReason", r)}
              help={
                v.terminationReason === "unfair_dismissal" || v.terminationReason === "cdd_early_termination"
                  ? t(`form.reason.help.${v.terminationReason}`)
                  : undefined
              }
              options={reasons.map((r) => ({ value: r, label: t(`form.reason.${r}`) }))}
            />
          </div>
          {v.contractType === "CDD" ? (
            <div className="grid gap-4 rounded-lg border border-dashed bg-muted/40 p-4 sm:grid-cols-2">
              <DateField label={t("form.cddPlannedEnd")} value={v.cddPlannedEndDate ?? ""} onChange={(d) => set("cddPlannedEndDate", d)} min={v.startDate || undefined} />
              <div className="flex items-start gap-3 pt-1 sm:pt-6">
                <Switch
                  id="requalify"
                  checked={Boolean(v.cddRequalifiedAsCdi)}
                  onCheckedChange={(c) => set("cddRequalifiedAsCdi", Boolean(c))}
                />
                <div className="grid gap-1">
                  <Label htmlFor="requalify" className="text-[13px] leading-snug">
                    {t("form.cddRequalified")}
                  </Label>
                  <p className="text-xs text-muted-foreground">{t("form.cddRequalified.help")}</p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ employment */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <SectionTitle icon={Briefcase} title={t("form.section.employment")} />
        </CardHeader>
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
          <DateField label={t("form.startDate")} value={v.startDate} onChange={(d) => set("startDate", d)} max={v.endDate || undefined} />
          <DateField label={t("form.endDate")} value={v.endDate} onChange={(d) => set("endDate", d)} min={v.startDate || undefined} invalid={datesInvalid} />
          <div className="sm:col-span-2 rounded-lg border bg-accent/40 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <DateField
                label={t("form.legalDate")}
                value={v.legalDate || v.endDate}
                onChange={(d) => set("legalDate", d === v.endDate ? "" : d)}
                help={t("form.legalDate.help")}
              />
              {v.legalDate ? (
                <Button type="button" variant="outline" size="sm" className="mb-6 h-10" onClick={() => set("legalDate", "")}>
                  {t("form.legalDate.useEnd")}
                </Button>
              ) : null}
            </div>
          </div>
          <NumberField label={t("form.weeklyHours")} value={v.weeklyHours} onChange={(x) => set("weeklyHours", x)} suffix={t("unit.hours")} />
          <NumberField label={t("form.dailyHours")} value={v.dailyHours} onChange={(x) => set("dailyHours", x)} suffix={t("unit.hours")} />
          <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
            <Checkbox checked={Boolean(v.employeeUnder18)} onCheckedChange={(c) => set("employeeUnder18", Boolean(c))} />
            {t("form.under18")}
          </label>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ salary */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <SectionTitle icon={Coins} title={t("form.section.salary")} description={t("form.section.salary.desc")} />
        </CardHeader>
        <CardContent className="grid gap-5 py-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <MoneyField label={t("form.grossMonthly")} value={v.grossMonthly} onChange={(x) => set("grossMonthly", x)} />
            <MoneyField label={t("form.baseSalary")} value={v.baseSalary ?? ""} onChange={(x) => set("baseSalary", x)} help={t("form.baseSalary.help")} />
            <MoneyField label={t("form.netMonthly")} value={v.netMonthly ?? ""} onChange={(x) => set("netMonthly", x)} help={t("form.netMonthly.help")} />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{t("form.components")}</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set("components", [...v.components, { id: uid("c"), type: "work_bonus", monthlyAmount: "" }])}
              >
                <Plus className="size-4" aria-hidden />
                {t("form.components.add")}
              </Button>
            </div>
            {v.components.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground">{t("form.components.empty")}</p>
            ) : (
              <ul className="grid gap-3">
                {v.components.map((c, i) => {
                  const treatment = COMPONENT_TREATMENT[c.type];
                  const update = (patch: Partial<typeof c>) =>
                    set("components", v.components.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  return (
                    <li key={c.id} className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] sm:items-end">
                      <SelectField<SalaryComponentType>
                        label={t("form.component.type")}
                        value={c.type}
                        onChange={(type) => update({ type })}
                        options={COMPONENT_TYPES.map((type) => ({ value: type, label: t(`component.${type}`) }))}
                      />
                      <MoneyField label={t("form.component.amount")} value={c.monthlyAmount} onChange={(x) => update({ monthlyAmount: x })} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-destructive"
                        aria-label={t("form.remove")}
                        onClick={() => set("components", v.components.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <div className="flex flex-wrap gap-1.5 sm:col-span-3">
                        <Badge variant={treatment.inArt57 ? "default" : "outline"} className={cn(!treatment.inArt57 && "text-muted-foreground line-through decoration-1")}>
                          {t("form.component.inArt57")}
                        </Badge>
                        <Badge variant={treatment.inRegular ? "secondary" : "outline"} className={cn(!treatment.inRegular && "text-muted-foreground line-through decoration-1")}>
                          {t("form.component.inRegular")}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ notice + leave */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <SectionTitle icon={CalendarClock} title={t("form.section.notice")} />
          </CardHeader>
          <CardContent className="grid gap-4 py-5">
            <div role="radiogroup" aria-label={t("form.notice.status")} className="grid gap-2">
              {(["none", "partial", "respected"] as NoticeStatus[]).map((s) => (
                <label
                  key={s}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    v.noticeStatus === s ? "border-primary bg-primary/5" : "hover:bg-accent/60",
                  )}
                >
                  <input
                    type="radio"
                    name="notice"
                    className="size-4 accent-[var(--primary)]"
                    checked={v.noticeStatus === s}
                    onChange={() => set("noticeStatus", s)}
                  />
                  {t(`form.notice.${s}`)}
                </label>
              ))}
            </div>
            {v.noticeStatus === "partial" ? (
              <NumberField label={t("form.notice.daysServed")} value={v.noticeDaysServed ?? ""} onChange={(x) => set("noticeDaysServed", x)} suffix={t("unit.days")} />
            ) : null}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <SectionTitle icon={Umbrella} title={t("form.section.leave")} />
          </CardHeader>
          <CardContent className="grid gap-4 py-5">
            <DateField label={t("form.leave.refStart")} value={v.leave.referencePeriodStart ?? ""} onChange={(d) => setLeave("referencePeriodStart", d)} help={t("form.leave.refStart.help")} />
            <div className="grid grid-cols-2 gap-4">
              <NumberField label={t("form.leave.carried")} value={v.leave.carriedOverDays} onChange={(x) => setLeave("carriedOverDays", x)} suffix={t("unit.days")} />
              <NumberField label={t("form.leave.taken")} value={v.leave.daysTaken} onChange={(x) => setLeave("daysTaken", x)} suffix={t("unit.days")} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------ optional details */}
      <Card className="gap-0 py-0">
        <Accordion multiple className="px-4">
          <AccordionItem value="history">
            <AccordionTrigger className="py-4 hover:no-underline">
              <SectionTitle icon={History} title={t("form.section.history")} />
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 text-sm">
                    <Switch
                      checked={v.useSalaryHistory}
                      onCheckedChange={(c) => {
                        const on = Boolean(c);
                        onChange({
                          ...v,
                          useSalaryHistory: on,
                          salaryHistory: on && v.salaryHistory.length === 0 ? buildHistoryRows(v.endDate, v.grossMonthly, excludedMonthly) : v.salaryHistory,
                        });
                      }}
                    />
                    {t("form.history.use")}
                  </label>
                  {v.useSalaryHistory ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => set("salaryHistory", buildHistoryRows(v.endDate, v.grossMonthly, excludedMonthly))}>
                      {t("form.history.fill")}
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{t("form.history.help")}</p>
                {v.useSalaryHistory ? (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead className="bg-muted/60 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-start font-medium">{t("form.history.month")}</th>
                          <th className="px-3 py-2 text-start font-medium">{t("form.history.gross")}</th>
                          <th className="px-3 py-2 text-start font-medium">{t("form.history.excluded")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.salaryHistory.map((row, i) => (
                          <tr key={row.month + i} className="border-t">
                            <td className="px-3 py-1.5 tabular text-muted-foreground" dir="ltr">
                              {row.month}
                            </td>
                            {(["gross", "excluded"] as const).map((k) => (
                              <td key={k} className="px-2 py-1.5">
                                <Input
                                  dir="ltr"
                                  inputMode="decimal"
                                  aria-label={`${t(`form.history.${k}`)} ${row.month}`}
                                  className="h-8 tabular"
                                  value={row[k]}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(",", ".");
                                    if (val !== "" && !/^\d*(\.\d{0,2})?$/.test(val)) return;
                                    set("salaryHistory", v.salaryHistory.map((r, j) => (j === i ? { ...r, [k]: val } : r)));
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="suspensions">
            <AccordionTrigger className="py-4 hover:no-underline">
              <SectionTitle icon={CalendarOff} title={t("form.section.suspensions")} />
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 pb-4">
                {v.suspensions.length === 0 ? <p className="text-xs text-muted-foreground">{t("form.suspensions.empty")}</p> : null}
                {v.suspensions.map((s, i) => {
                  const update = (patch: Partial<typeof s>) => set("suspensions", v.suspensions.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  const counts = s.countsAsEffectiveWork ?? suspensionDefaults?.[s.type] ?? false;
                  return (
                    <div key={s.id} className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1.4fr)_1fr_1fr_auto] sm:items-end">
                      <SelectField<SuspensionType>
                        label={t("form.suspension.type")}
                        value={s.type}
                        onChange={(type) => update({ type, countsAsEffectiveWork: undefined })}
                        options={SUSPENSION_TYPES.map((x) => ({ value: x, label: t(`suspension.${x}`) }))}
                      />
                      <DateField label={t("form.suspension.from")} value={s.from} onChange={(d) => update({ from: d })} />
                      <DateField label={t("form.suspension.to")} value={s.to} onChange={(d) => update({ to: d })} min={s.from || undefined} />
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive" aria-label={t("form.remove")} onClick={() => set("suspensions", v.suspensions.filter((_, j) => j !== i))}>
                        <Trash2 className="size-4" />
                      </Button>
                      <label className="flex items-center gap-2.5 text-sm sm:col-span-4">
                        <Switch checked={counts} onCheckedChange={(c) => update({ countsAsEffectiveWork: Boolean(c) })} />
                        {t("form.suspension.counts")}
                      </label>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => set("suspensions", [...v.suspensions, { id: uid("s"), type: "illness", from: "", to: "" }])}
                >
                  <Plus className="size-4" aria-hidden />
                  {t("form.suspensions.add")}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="other">
            <AccordionTrigger className="py-4 hover:no-underline">
              <SectionTitle icon={HandCoins} title={t("form.section.other")} />
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 pb-4 sm:grid-cols-2">
                <MoneyField label={t("form.other.unpaidWages")} value={v.other.unpaidWages} onChange={(x) => setOther("unpaidWages", x)} />
                <MoneyField label={t("form.other.bonuses")} value={v.other.outstandingBonuses} onChange={(x) => setOther("outstandingBonuses", x)} />
                {(["rate25", "rate50", "rate100"] as const).map((k) => (
                  <NumberField
                    key={k}
                    label={t(`form.other.ot${k.replace("rate", "")}`)}
                    value={v.other.unpaidOvertimeHours[k]}
                    onChange={(x) => setOther("unpaidOvertimeHours", { ...v.other.unpaidOvertimeHours, [k]: x })}
                    suffix={t("unit.hours")}
                  />
                ))}
                <MoneyField label={t("form.other.otAmount")} value={v.other.unpaidOvertimeAmount} onChange={(x) => setOther("unpaidOvertimeAmount", x)} />
                <NumberField label={t("form.other.holidays")} value={v.other.unpaidPublicHolidayDays} onChange={(x) => setOther("unpaidPublicHolidayDays", x)} suffix={t("unit.days")} />
                <MoneyField label={t("form.other.misc")} value={v.other.otherEntitlements} onChange={(x) => setOther("otherEntitlements", x)} />
                <MoneyField label={t("form.other.advances")} value={v.other.salaryAdvances} onChange={(x) => setOther("salaryAdvances", x)} help={t("form.other.advances.help")} className="sm:col-span-2" />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="paid">
            <AccordionTrigger className="py-4 hover:no-underline">
              <SectionTitle icon={Receipt} title={t("form.section.paid")} />
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 pb-4 sm:grid-cols-2">
                {(Object.keys(v.alreadyPaid) as (keyof CalculationInput["alreadyPaid"])[]).map((k) => (
                  <MoneyField key={k} label={t(`form.paid.${k}`)} value={v.alreadyPaid[k]} onChange={(x) => setPaid(k, x)} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="options">
            <AccordionTrigger className="py-4 hover:no-underline">
              <SectionTitle icon={SlidersHorizontal} title={t("form.section.options")} />
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 pb-4 sm:grid-cols-2">
                <SelectField
                  label={t("form.option.dismissalPartialYear")}
                  value={v.options.dismissalPartialYear ?? "prorata"}
                  onChange={(x) => set("options", { ...v.options, dismissalPartialYear: x })}
                  options={(["prorata", "full_year"] as const).map((x) => ({ value: x, label: t(`form.option.partial.${x}`) }))}
                />
                {!domestic ? (
                  <SelectField
                    label={t("form.option.damagesPartialYear")}
                    value={v.options.damagesPartialYear ?? "prorata"}
                    onChange={(x) => set("options", { ...v.options, damagesPartialYear: x })}
                    options={(["prorata", "full_year"] as const).map((x) => ({ value: x, label: t(`form.option.partial.${x}`) }))}
                  />
                ) : null}
                {!domestic ? (
                  <SelectField
                    label={t("form.option.damagesSalaryBasis")}
                    value={v.options.damagesSalaryBasis ?? "last_salary"}
                    onChange={(x) => set("options", { ...v.options, damagesSalaryBasis: x })}
                    options={(["last_salary", "average_52_weeks"] as const).map((x) => ({ value: x, label: t(`form.option.salary.${x}`) }))}
                    className="sm:col-span-2"
                  />
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}
