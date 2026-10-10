import ExcelJS from "exceljs";
import { reportLabel, type ReportModel } from "./report-model";

const NAVY = "FF1D3557";
const LIGHT = "FFEEF2F8";

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  row.height = 22;
}

function sectionTitle(ws: ExcelJS.Worksheet, text: string) {
  const row = ws.addRow([text]);
  row.font = { bold: true, size: 12, color: { argb: NAVY } };
  row.height = 20;
  return row;
}

/** Numeric cells keep full precision for auditing; display uses a 2-decimal MAD format. */
const MAD_FORMAT = '#,##0.00 "MAD"';

export async function generateExcelBlob(model: ReportModel): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Calculateur des indemnités — Maroc";
  wb.created = new Date();
  const rtl = model.dir === "rtl";
  const L = (k: string) => reportLabel(model.locale, k);
  const ar = model.locale === "ar";

  /* ------------------------------------------------------------ summary */
  const ws = wb.addWorksheet(ar ? "الملخص" : "Synthèse", { views: [{ rightToLeft: rtl, showGridLines: false }] });
  ws.columns = [{ width: 42 }, { width: 46 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 40 }];
  const title = ws.addRow([model.title]);
  title.font = { bold: true, size: 15, color: { argb: NAVY } };
  ws.mergeCells(`A${title.number}:F${title.number}`);
  ws.addRow([model.subtitle]).font = { italic: true, color: { argb: "FF5B6472" } };
  ws.addRow([ar ? "التاريخ القانوني المطبق" : "Date juridique appliquée", model.legalDate]);
  ws.addRow([ar ? "إصدار القواعد" : "Version des règles", model.rulesVersion]);
  ws.addRow([L("generated"), model.generatedAt]);
  ws.addRow([]);

  sectionTitle(ws, L("employment"));
  model.employment.forEach((r) => ws.addRow([r.label, r.value]));
  ws.addRow([]);
  sectionTitle(ws, L("seniority"));
  model.seniority.forEach((r) => ws.addRow([r.label, r.value]));
  ws.addRow([]);
  sectionTitle(ws, L("salary"));
  model.salary.forEach((r) => ws.addRow([r.label, r.value]));
  ws.addRow([]);

  sectionTitle(ws, L("table"));
  styleHeader(
    ws.addRow(
      ar
        ? ["نوع التعويض", "طريقة الحساب", "المحتسب", "المؤدى", "الباقي المستحق", "المرجع القانوني"]
        : ["Indemnité", "Méthode de calcul", "Calculé", "Déjà versé", "Reste dû", "Référence légale"],
    ),
  );
  const firstDataRow = ws.rowCount + 1;
  for (const e of model.entitlements) {
    const row = ws.addRow([`${e.title} (${e.nature})`, `${e.method}\n${e.formula}`, Number(e.computedRaw), Number(e.paidRaw), Number(e.amountRaw), e.references]);
    row.alignment = { vertical: "top", wrapText: true };
    [3, 4, 5].forEach((c) => (row.getCell(c).numFmt = MAD_FORMAT));
  }
  const lastDataRow = ws.rowCount;
  const total = ws.addRow([L("total"), "", null, null, model.entitlements.length ? { formula: `SUM(E${firstDataRow}:E${lastDataRow})`, result: Number(model.grandTotalRaw) } : 0, ""]);
  total.font = { bold: true };
  total.getCell(5).numFmt = MAD_FORMAT;
  total.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } }));
  model.totals.forEach((r) => ws.addRow([r.label, r.value]));
  ws.addRow([]);

  if (model.ineligible.length) {
    sectionTitle(ws, L("ineligible"));
    model.ineligible.forEach((x) => {
      const row = ws.addRow([x.title, x.reasons.join("\n")]);
      row.alignment = { vertical: "top", wrapText: true };
    });
    ws.addRow([]);
  }
  if (model.warnings.length) {
    sectionTitle(ws, L("warnings"));
    model.warnings.forEach((w) => {
      const row = ws.addRow([w]);
      ws.mergeCells(`A${row.number}:F${row.number}`);
      row.alignment = { wrapText: true };
    });
  }
  ws.addRow([]);
  const disc = ws.addRow([model.disclaimer]);
  ws.mergeCells(`A${disc.number}:F${disc.number}`);
  disc.alignment = { wrapText: true };
  disc.height = 32;

  /* ------------------------------------------------------------ formulas */
  const wf = wb.addWorksheet(ar ? "صيغ الحساب" : "Formules", { views: [{ rightToLeft: rtl, showGridLines: false }] });
  wf.columns = [{ width: 52 }, { width: 58 }, { width: 24 }];
  for (const e of model.entitlements) {
    sectionTitle(wf, `${e.title} — ${e.amount}`);
    wf.addRow([ar ? "الصيغة" : "Formule", e.formula]).font = { bold: true };
    styleHeader(wf.addRow(ar ? ["المرحلة", "العملية", "النتيجة"] : ["Étape", "Opération", "Résultat"]));
    e.steps.forEach((st) => wf.addRow([st.label, st.formula, st.result]));
    e.inputs.forEach((i) => wf.addRow([i.label, "", i.value]).font = { color: { argb: "FF5B6472" } });
    [...e.caps, ...e.notes].forEach((n) => (wf.addRow([n]).alignment = { wrapText: true }));
    e.flags.forEach((n) => (wf.addRow([`⚠ ${n}`]).font = { color: { argb: "FF7A5300" } }));
    wf.addRow([]);
  }

  /* ------------------------------------------------------------ legal basis */
  const wl = wb.addWorksheet(ar ? "الأساس القانوني" : "Base légale", { views: [{ rightToLeft: rtl, showGridLines: false }] });
  wl.columns = [{ width: 34 }, { width: 36 }, { width: 70 }, { width: 30 }, { width: 50 }];
  styleHeader(wl.addRow(ar ? ["المرجع", "العنوان", "الملخص", "حالة التحقق", "المصدر الرسمي"] : ["Référence", "Titre", "Résumé", "Vérification", "Source officielle"]));
  model.provisions.forEach((p) => {
    const row = wl.addRow([p.label, p.title, p.summary, p.status, { text: p.url, hyperlink: p.url }]);
    row.alignment = { vertical: "top", wrapText: true };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
