"use client";

import { Info } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/components/i18n-provider";

interface FieldProps {
  label: string;
  help?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, help, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground/90">
        {label}
      </Label>
      {children}
      {help ? (
        <p className="flex items-start gap-1 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
          <span>{help}</span>
        </p>
      ) : null}
    </div>
  );
}

const DECIMAL_INPUT = /^\d*([.,]\d{0,4})?$/;

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
}

/** Decimal text input: keeps the raw string (no float conversion) and accepts "," or ".". */
export function NumberField({ label, value, onChange, help, suffix, placeholder, className, invalid }: NumberFieldProps) {
  const id = useId();
  return (
    <Field label={label} help={help} htmlFor={id} className={className}>
      <div className="relative" dir="ltr">
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          value={value}
          placeholder={placeholder ?? "0"}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const v = e.target.value.replace(/\s/g, "");
            if (v === "" || DECIMAL_INPUT.test(v)) onChange(v.replace(",", "."));
          }}
          className={cn("h-10 tabular text-start", suffix && "pe-14")}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-medium text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </Field>
  );
}

export function MoneyField(props: Omit<NumberFieldProps, "suffix">) {
  const { t } = useI18n();
  return <NumberField {...props} suffix={t("form.mad")} placeholder="0,00" />;
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  className?: string;
  min?: string;
  max?: string;
  invalid?: boolean;
}

export function DateField({ label, value, onChange, help, className, min, max, invalid }: DateFieldProps) {
  const id = useId();
  return (
    <Field label={label} help={help} htmlFor={id} className={className}>
      <Input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 tabular"
      />
    </Field>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  help?: string;
  className?: string;
}

export function SelectField<T extends string>({ label, value, options, onChange, help, className }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <Field label={label} help={help} htmlFor={id} className={className}>
      <Select items={options} value={value} onValueChange={(v) => v !== null && onChange(v as T)}>
        <SelectTrigger id={id} className="h-10 w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function SectionTitle({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-tight text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}
