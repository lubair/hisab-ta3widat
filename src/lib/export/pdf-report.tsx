import { Document, Font, Page, pdf, StyleSheet, Text, View } from "@react-pdf/renderer";
import { reportLabel, type ReportModel, type ReportRow } from "./report-model";

let fontsRegistered = false;

function registerFonts(origin: string) {
  if (fontsRegistered) return;
  Font.register({
    family: "Plex",
    fonts: [
      { src: `${origin}/fonts/IBMPlexSansArabic-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/IBMPlexSansArabic-SemiBold.ttf`, fontWeight: 600 },
      { src: `${origin}/fonts/IBMPlexSansArabic-Bold.ttf`, fontWeight: 700 },
    ],
  });
  // Arabic words must never be hyphenated.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

const NAVY = "#1d3557";
const GRAY = "#5b6472";
const LINE = "#d9dee7";

function makeStyles(rtl: boolean) {
  const align = rtl ? "right" : "left";
  const row = rtl ? "row-reverse" : "row";
  return StyleSheet.create({
    page: { fontFamily: "Plex", fontSize: 9, color: "#1b2433", paddingTop: 36, paddingBottom: 48, paddingHorizontal: 36, lineHeight: 1.45 },
    text: { textAlign: align, direction: rtl ? "rtl" : "ltr" },
    ltr: { direction: "ltr", textAlign: align },
    header: { borderBottomWidth: 2, borderBottomColor: NAVY, paddingBottom: 10, marginBottom: 14 },
    title: { fontSize: 15, fontWeight: 700, color: NAVY, textAlign: align, direction: rtl ? "rtl" : "ltr" },
    subtitle: { fontSize: 9, color: GRAY, marginTop: 3, textAlign: align, direction: rtl ? "rtl" : "ltr" },
    metaRow: { flexDirection: row, justifyContent: "space-between", marginTop: 8 },
    metaBox: { backgroundColor: "#eef2f8", borderRadius: 4, paddingVertical: 5, paddingHorizontal: 8 },
    metaLabel: { fontSize: 7.5, color: GRAY, textAlign: align, direction: rtl ? "rtl" : "ltr" },
    metaValue: { fontSize: 9.5, fontWeight: 600, textAlign: align, direction: rtl ? "rtl" : "ltr" },
    section: { marginBottom: 12 },
    h2: { fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 6, textAlign: align, direction: rtl ? "rtl" : "ltr" },
    grid: { flexDirection: row, flexWrap: "wrap" },
    kv: { width: "50%", flexDirection: row, justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: LINE },
    kvLabel: { color: GRAY, textAlign: align, direction: rtl ? "rtl" : "ltr", maxWidth: "55%" },
    kvValue: { fontWeight: 600, textAlign: rtl ? "left" : "right", direction: rtl ? "rtl" : "ltr", maxWidth: "45%" },
    table: { borderWidth: 0.75, borderColor: LINE, borderRadius: 3 },
    th: { flexDirection: row, backgroundColor: NAVY, color: "white", fontWeight: 600 },
    tr: { flexDirection: row, borderTopWidth: 0.5, borderTopColor: LINE },
    td: { padding: 4, textAlign: align, direction: rtl ? "rtl" : "ltr" },
    tdNum: { padding: 4, textAlign: rtl ? "left" : "right", direction: rtl ? "rtl" : "ltr" },
    small: { fontSize: 7.5, color: GRAY },
    totalBox: { marginTop: 8, flexDirection: row, justifyContent: "space-between", alignItems: "center", backgroundColor: NAVY, color: "white", borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 },
    totalLabel: { fontSize: 11, fontWeight: 700, color: "white", direction: rtl ? "rtl" : "ltr" },
    totalValue: { fontSize: 14, fontWeight: 700, color: "white", direction: rtl ? "rtl" : "ltr" },
    card: { borderWidth: 0.75, borderColor: LINE, borderRadius: 4, padding: 7, marginBottom: 6 },
    cardTitle: { fontSize: 9.5, fontWeight: 700, textAlign: align, direction: rtl ? "rtl" : "ltr" },
    step: { flexDirection: row, justifyContent: "space-between", paddingVertical: 2, borderBottomWidth: 0.4, borderBottomColor: LINE },
    formula: { fontSize: 8, color: "#25324a", backgroundColor: "#f3f5f9", padding: 4, borderRadius: 3, marginVertical: 3, direction: "ltr", textAlign: "left" },
    flag: { fontSize: 8, color: "#7a5300", textAlign: align, direction: rtl ? "rtl" : "ltr" },
    footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: row, justifyContent: "space-between", fontSize: 7, color: GRAY, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 5 },
  });
}

function KV({ rows, s }: { rows: ReportRow[]; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.grid}>
      {rows.map((r, i) => (
        <View key={i} style={s.kv} wrap={false}>
          <Text style={s.kvLabel}>{r.label}</Text>
          <Text style={s.kvValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ReportDocument({ model }: { model: ReportModel }) {
  const rtl = model.dir === "rtl";
  const s = makeStyles(rtl);
  const L = (k: string) => reportLabel(model.locale, k);
  const cols = [
    { key: "title", w: "24%" },
    { key: "method", w: "30%" },
    { key: "computed", w: "15%", num: true },
    { key: "amount", w: "15%", num: true },
    { key: "references", w: "16%" },
  ] as const;
  const colTitle = (k: string) =>
    ({
      title: model.locale === "ar" ? "نوع التعويض" : "Indemnité",
      method: model.locale === "ar" ? "طريقة الحساب" : "Méthode de calcul",
      computed: model.locale === "ar" ? "المحتسب" : "Calculé",
      amount: model.locale === "ar" ? "الباقي المستحق" : "Reste dû",
      references: model.locale === "ar" ? "المرجع القانوني" : "Référence légale",
    })[k] ?? k;

  return (
    <Document title={model.title} author="Calculateur des indemnités — Maroc" language={model.locale}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed={false}>
          <Text style={s.title}>{model.title}</Text>
          <Text style={s.subtitle}>{model.subtitle}</Text>
          <View style={s.metaRow}>
            <View style={s.metaBox}>
              <Text style={s.metaLabel}>{model.locale === "ar" ? "التاريخ القانوني المطبق" : "Date juridique appliquée"}</Text>
              <Text style={s.metaValue}>{model.legalDate}</Text>
            </View>
            <View style={s.metaBox}>
              <Text style={s.metaLabel}>{model.locale === "ar" ? "إصدار القواعد" : "Version des règles"}</Text>
              <Text style={[s.metaValue, { direction: "ltr" }]}>{model.rulesVersion}</Text>
            </View>
            <View style={s.metaBox}>
              <Text style={s.metaLabel}>{L("generated")}</Text>
              <Text style={s.metaValue}>{model.generatedAt}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>1. {L("employment")}</Text>
          <KV rows={model.employment} s={s} />
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>2. {L("seniority")}</Text>
          <KV rows={model.seniority} s={s} />
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>3. {L("salary")}</Text>
          <KV rows={model.salary} s={s} />
        </View>

        <View style={s.section}>
          <Text style={s.h2}>4. {L("table")}</Text>
          <View style={s.table}>
            <View style={s.th} fixed>
              {cols.map((c) => (
                <Text key={c.key} style={["num" in c ? s.tdNum : s.td, { width: c.w, color: "white" }]}>
                  {colTitle(c.key)}
                </Text>
              ))}
            </View>
            {model.entitlements.map((e) => (
              <View key={e.id} style={s.tr} wrap={false}>
                <Text style={[s.td, { width: "24%", fontWeight: 600 }]}>
                  {e.title}
                  {"\n"}
                  <Text style={s.small}>{e.nature}</Text>
                </Text>
                <View style={{ width: "30%", padding: 4 }}>
                  <Text style={s.text}>{e.method}</Text>
                  <Text style={[s.small, { direction: "ltr", textAlign: rtl ? "right" : "left" }]}>{e.formula}</Text>
                </View>
                <Text style={[s.tdNum, { width: "15%" }]}>{e.computed}</Text>
                <Text style={[s.tdNum, { width: "15%", fontWeight: 700 }]}>{e.amount}</Text>
                <Text style={[s.td, { width: "16%", fontSize: 7.5, color: GRAY }]}>{e.references}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 6 }}>
            {model.totals.map((r, i) => (
              <View key={i} style={s.step}>
                <Text style={s.text}>{r.label}</Text>
                <Text style={[s.text, { fontWeight: 600 }]}>{r.value}</Text>
              </View>
            ))}
          </View>
          <View style={s.totalBox} wrap={false}>
            <Text style={s.totalLabel}>{L("total")}</Text>
            <Text style={s.totalValue}>{model.grandTotal}</Text>
          </View>
        </View>

        {model.ineligible.length ? (
          <View style={s.section}>
            <Text style={s.h2}>{L("ineligible")}</Text>
            {model.ineligible.map((x, i) => (
              <View key={i} style={s.card} wrap={false}>
                <Text style={s.cardTitle}>{x.title}</Text>
                {x.reasons.map((r, j) => (
                  <Text key={j} style={[s.text, s.small]}>
                    • {r}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.section} break>
          <Text style={s.h2}>5. {L("formulas")}</Text>
          {model.entitlements.map((e) => (
            <View key={e.id} style={s.card} wrap={false}>
              <Text style={s.cardTitle}>
                {e.title} — {e.amount}
              </Text>
              <Text style={s.formula}>{e.formula}</Text>
              {e.steps.map((st, i) => (
                <View key={i} style={s.step}>
                  <View style={{ maxWidth: "70%" }}>
                    <Text style={[s.text, s.small]}>{st.label}</Text>
                    <Text style={[s.small, { direction: "ltr", textAlign: rtl ? "right" : "left" }]}>{st.formula}</Text>
                  </View>
                  <Text style={[s.text, { fontWeight: 600 }]}>{st.result}</Text>
                </View>
              ))}
              {[...e.caps, ...e.notes].map((n, i) => (
                <Text key={i} style={[s.text, s.small, { marginTop: 2 }]}>
                  • {n}
                </Text>
              ))}
              {e.flags.map((n, i) => (
                <Text key={i} style={[s.flag, { marginTop: 2 }]}>
                  ⚠ {n}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {model.warnings.length ? (
          <View style={s.section}>
            <Text style={s.h2}>{L("warnings")}</Text>
            {model.warnings.map((w, i) => (
              <Text key={i} style={[s.text, { fontSize: 8, marginBottom: 2 }]}>
                • {w}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.h2}>6. {L("legal")}</Text>
          {model.provisions.map((p, i) => (
            <View key={i} style={s.card} wrap={false}>
              <Text style={s.cardTitle}>
                {p.label} — {p.title}
              </Text>
              <Text style={[s.text, s.small]}>{p.summary}</Text>
              <Text style={[s.small, { direction: "ltr", textAlign: rtl ? "right" : "left", color: NAVY }]}>{p.url}</Text>
              <Text style={[s.text, s.small]}>
                {L("verification")}: {p.status}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.section} wrap={false}>
          <Text style={[s.text, s.small]}>{model.disclaimer}</Text>
          <Text style={[s.text, s.small, { marginTop: 2 }]}>{model.privacy}</Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.text}>{model.subtitle}</Text>
          <Text
            style={{ direction: "ltr" }}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePdfBlob(model: ReportModel, origin: string): Promise<Blob> {
  registerFonts(origin);
  return pdf(<ReportDocument model={model} />).toBlob();
}
