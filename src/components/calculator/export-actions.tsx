"use client";

import { ChevronDown, FileDown, FileSpreadsheet, Loader2, Printer, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n";
import { buildReportModel } from "@/lib/export/report-model";
import type { LegalRuleSet } from "@/lib/legal/rules/schema";
import type { CalculationInput, CalculationResult } from "@/lib/legal/types";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function fileStamp(result: CalculationResult) {
  return `${result.legalDate}-${new Date().toISOString().slice(0, 10)}`;
}

export function ExportActions({
  result,
  input,
  ruleSet,
  onReset,
}: {
  result: CalculationResult | null;
  input: CalculationInput;
  ruleSet: LegalRuleSet;
  onReset: () => void;
}) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState<null | "pdf" | "xlsx">(null);
  const disabled = !result?.ok || busy !== null;

  async function exportPdf(reportLocale: Locale) {
    if (!result?.ok) return;
    setBusy("pdf");
    try {
      const { generatePdfBlob } = await import("@/lib/export/pdf-report");
      const blob = await generatePdfBlob(buildReportModel(result, input, ruleSet, reportLocale), window.location.origin);
      download(blob, `${reportLocale === "ar" ? "taqrir-taawidat" : "rapport-indemnites"}-${fileStamp(result)}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error(t("actions.exportError"));
    } finally {
      setBusy(null);
    }
  }

  async function exportExcel() {
    if (!result?.ok) return;
    setBusy("xlsx");
    try {
      const { generateExcelBlob } = await import("@/lib/export/excel");
      const blob = await generateExcelBlob(buildReportModel(result, input, ruleSet, locale));
      download(blob, `${locale === "ar" ? "taawidat" : "indemnites"}-${fileStamp(result)}.xlsx`);
    } catch (e) {
      console.error(e);
      toast.error(t("actions.exportError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!result?.ok}>
        <Printer className="size-4" aria-hidden />
        {t("actions.print")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="default" size="sm" disabled={disabled} />}>
          {busy === "pdf" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileDown className="size-4" aria-hidden />}
          {busy === "pdf" ? t("actions.generating") : t("actions.pdf")}
          <ChevronDown className="size-3.5 opacity-70" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => exportPdf("ar")}>{t("actions.pdf.ar")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportPdf("fr")}>{t("actions.pdf.fr")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="sm" onClick={exportExcel} disabled={disabled}>
        {busy === "xlsx" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileSpreadsheet className="size-4" aria-hidden />}
        {t("actions.excel")}
      </Button>
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw className="size-4" aria-hidden />
        {t("form.reset")}
      </Button>
    </div>
  );
}
