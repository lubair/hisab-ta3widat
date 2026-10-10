import type { AnyRuleEntry, LegalProvision, LegalRuleSet, MinimumWageEntry, NoticeTier, PaidHoliday, ScaleBracket } from "./schema";

/**
 * Baseline legal data. Every value cites its instrument and a source; the
 * verification status reflects what could be confirmed against official or
 * concordant sources (see docs/legal-verification.md). Values marked
 * "requires_legal_review" are applied but surfaced to the user as such.
 */

export const SOURCES = {
  laborCode: "https://www.sgg.gov.ma/Portals/0/lois/Code_du_travail.pdf",
  laborCodeBo: "BO n° 5210 du 6 mai 2004 (éd. française) — Dahir n° 1-03-194 du 11 septembre 2003",
  noticeDecree: "https://www.sgg.gov.ma/BulletinOfficiel.aspx",
  law1912: "https://www.sgg.gov.ma/BulletinOfficiel.aspx",
  bo: "https://www.sgg.gov.ma/BulletinOfficiel.aspx",
} as const;

const LC_FROM = "2004-06-08";
const DOMESTIC_FROM = "2018-10-02";

/* ------------------------------------------------------------------ SMIG / SMAG */

function smig(id: string, amount: string, validFrom: string, validTo: string | null, decree: string, extra: Partial<MinimumWageEntry> = {}): MinimumWageEntry {
  return { id, sector: "non_agricultural", unit: "hour", amount, validFrom, validTo, decree, officialUrl: SOURCES.bo, verification: "corroborated", ...extra };
}
function smag(id: string, amount: string, validFrom: string, validTo: string | null, decree: string, extra: Partial<MinimumWageEntry> = {}): MinimumWageEntry {
  return { id, sector: "agricultural", unit: "day", amount, validFrom, validTo, decree, officialUrl: SOURCES.bo, verification: "corroborated", ...extra };
}

export const MINIMUM_WAGES: MinimumWageEntry[] = [
  smig("smig-2014", "12.85", "2014-07-01", "2015-06-30", "Décret n° 2.14.343", { bulletinOfficiel: "BO n° 6272 du 10 juillet 2014" }),
  smig("smig-2015", "13.46", "2015-07-01", "2019-06-30", "Décret n° 2.14.343", { bulletinOfficiel: "BO n° 6272 du 10 juillet 2014" }),
  smig("smig-2019", "14.13", "2019-07-01", "2020-06-30", "Décret n° 2.19.424", { bulletinOfficiel: "BO du 27 juin 2019" }),
  smig("smig-2020", "14.81", "2020-07-01", "2022-08-31", "Décret n° 2.19.424", { bulletinOfficiel: "BO du 27 juin 2019" }),
  smig("smig-2022", "15.55", "2022-09-01", "2023-08-31", "Décret n° 2.22.692"),
  smig("smig-2023", "16.29", "2023-09-01", "2024-12-31", "Décret n° 2.22.692"),
  smig("smig-2025", "17.10", "2025-01-01", "2025-12-31", "Décret n° 2.24.1122"),
  smig("smig-2026", "17.92", "2026-01-01", null, "Décret n° 2.25.983 du 29 décembre 2025"),

  smag("smag-2014", "66.56", "2014-07-01", "2015-06-30", "Décret n° 2.14.343", { bulletinOfficiel: "BO n° 6272 du 10 juillet 2014" }),
  smag("smag-2015", "69.73", "2015-07-01", "2019-06-30", "Décret n° 2.14.343", { bulletinOfficiel: "BO n° 6272 du 10 juillet 2014" }),
  smag("smag-2019", "73.22", "2019-07-01", "2020-06-30", "Décret n° 2.19.424", { bulletinOfficiel: "BO du 27 juin 2019" }),
  smag("smag-2020", "76.70", "2020-07-01", "2022-08-31", "Décret n° 2.19.424", { bulletinOfficiel: "BO du 27 juin 2019" }),
  smag("smag-2022", "84.37", "2022-09-01", "2023-08-31", "Décret n° 2.22.692"),
  smag("smag-2023", "88.58", "2023-09-01", "2025-03-31", "Décret n° 2.22.692"),
  smag("smag-2025", "93.00", "2025-04-01", "2026-03-31", "Décret n° 2.24.1122"),
  smag("smag-2026", "97.44", "2026-04-01", null, "Décret n° 2.25.983 du 29 décembre 2025"),
];

/* ------------------------------------------------------------------ provisions */

function lc(article: string, fr: [string, string], ar: [string, string], verification: LegalProvision["verification"] = "corroborated", notes?: string): LegalProvision {
  return {
    id: `CT-${article}`,
    instrument: "law_65_99",
    article,
    title: { fr: fr[0], ar: ar[0] },
    summary: { fr: fr[1], ar: ar[1] },
    officialUrl: SOURCES.laborCode,
    bulletinOfficiel: SOURCES.laborCodeBo,
    validFrom: LC_FROM,
    validTo: null,
    verification,
    notes,
  };
}

export const PROVISIONS: LegalProvision[] = [
  lc("16", ["Cas de recours au CDD", "Le CDD n'est possible que dans les cas limitativement prévus ; à défaut il peut être requalifié en CDI."], ["حالات إبرام العقد محدد المدة", "لا يمكن إبرام عقد محدد المدة إلا في الحالات المحددة قانونا؛ وإلا أمكن اعتباره عقدا غير محدد المدة."]),
  lc("33", ["Rupture anticipée du CDD", "Hors faute grave ou force majeure, la rupture avant terme ouvre droit à des dommages-intérêts égaux aux salaires restant à courir jusqu'au terme."], ["الإنهاء المبتسر للعقد محدد المدة", "خارج حالتي الخطأ الجسيم والقوة القاهرة، يستحق الطرف المتضرر تعويضا يعادل مبلغ الأجور المستحقة إلى حين انتهاء مدة العقد."]),
  lc("39", ["Faute grave du salarié", "Liste des fautes graves pouvant justifier le licenciement sans préavis ni indemnité."], ["الخطأ الجسيم للأجير", "قائمة الأخطاء الجسيمة التي تبرر الفصل دون إخطار ولا تعويض."]),
  lc("40", ["Faute grave de l'employeur", "La démission provoquée par une faute grave de l'employeur est considérée comme un licenciement abusif."], ["الخطأ الجسيم للمشغل", "مغادرة الأجير لشغله بسبب خطأ جسيم للمشغل تعتبر فصلا تعسفيا."]),
  lc("41", ["Dommages-intérêts pour licenciement abusif", "Un mois et demi de salaire par année ou fraction d'année de travail, dans la limite de 36 mois, en plus du préavis et de l'indemnité de licenciement."], ["التعويض عن الضرر في حالة الفصل التعسفي", "أجر شهر ونصف عن كل سنة عمل أو جزء من السنة على ألا يتعدى سقف 36 شهرا، إضافة إلى التعويض عن الإخطار وعن الفصل."]),
  lc("43", ["Préavis", "La rupture du CDI par l'une des parties est subordonnée à un préavis, sauf faute grave ; durées fixées par voie réglementaire."], ["أجل الإخطار", "يتوقف إنهاء العقد غير محدد المدة على احترام أجل الإخطار ما لم يرتكب خطأ جسيم؛ وتحدد مدده بنص تنظيمي."]),
  lc("51", ["Indemnité compensatrice de préavis", "Sans préavis, la partie responsable verse l'indemnité égale à la rémunération qu'aurait perçue le salarié pendant le préavis."], ["التعويض عن عدم احترام أجل الإخطار", "يؤدي الطرف المسؤول تعويضا يعادل الأجر الذي كان سيتقاضاه الأجير لو استمر في شغله خلال أجل الإخطار."]),
  lc("52", ["Droit à l'indemnité de licenciement", "Salarié en CDI licencié après six mois de travail effectif dans la même entreprise, sauf faute grave."], ["الحق في التعويض عن الفصل", "الأجير المرتبط بعقد غير محدد المدة الذي يفصل بعد قضاء ستة أشهر من الشغل الفعلي داخل نفس المقاولة، ما لم يرتكب خطأ جسيما."]),
  lc("53", ["Barème de l'indemnité de licenciement", "Pour chaque année ou fraction d'année de travail effectif : 96 h (5 premières années), 144 h (6-10 ans), 192 h (11-15 ans), 240 h (au-delà de 15 ans)."], ["جدول التعويض عن الفصل", "عن كل سنة أو جزء من السنة من الشغل الفعلي: 96 ساعة (5 سنوات الأولى)، 144 ساعة (6-10)، 192 ساعة (11-15)، 240 ساعة (ما فوق 15 سنة)."]),
  lc("55", ["Salaire de base de l'indemnité", "Moyenne des salaires perçus pendant les 52 semaines précédant la rupture du contrat."], ["الأجر المعتمد في التعويض", "معدل الأجور المتقاضاة خلال الاثنين والخمسين أسبوعا السابقة لتاريخ إنهاء العقد."]),
  lc("57", ["Éléments du salaire pris en compte", "Salaire proprement dit, primes et indemnités inhérentes au travail (hors frais, responsabilité, pénibilité, zones dangereuses, remplacement temporaire), avantages en nature, commissions et pourboires."], ["عناصر الأجر المعتمدة", "الأجر الأساسي والمنح والتعويضات المرتبطة بالشغل (باستثناء المصاريف والمسؤولية والأشغال الشاقة والمناطق الخطرة والنيابة المؤقتة)، والامتيازات العينية، والعمولات والحلوان."]),
  lc("61", ["Licenciement sans préavis pour faute grave", "La faute grave autorise la rupture sans préavis ni indemnité, sous réserve de la procédure disciplinaire."], ["الفصل دون إخطار بسبب خطأ جسيم", "يبرر الخطأ الجسيم الفصل دون إخطار ولا تعويض مع احترام مسطرة الفصل."]),
  lc("184", ["Durée légale du travail", "Non agricole : 2288 heures par an (44 h/semaine). Agricole : 2496 heures par an."], ["المدة القانونية للشغل", "غير الفلاحي: 2288 ساعة في السنة (44 ساعة أسبوعيا). الفلاحي: 2496 ساعة في السنة."]),
  lc("201", ["Majoration des heures supplémentaires", "25 % (jour) ou 50 % (nuit) ; 50 % et 100 % le jour du repos hebdomadaire."], ["الزيادة عن الساعات الإضافية", "25% نهارا و50% ليلا؛ و50% و100% إذا أنجزت يوم الراحة الأسبوعية."]),
  lc("217", ["Jours fériés payés", "Les jours de fête payés et jours fériés fixés par voie réglementaire sont chômés et rémunérés."], ["أيام الأعياد المؤدى عنها", "أيام الأعياد المؤدى عنها والعطل المحددة بنص تنظيمي أيام راحة مؤدى عنها."]),
  lc("231", ["Durée du congé annuel payé", "Après six mois de service continu : 1,5 jour de travail effectif par mois de service (2 jours pour les moins de 18 ans)."], ["مدة العطلة السنوية المؤدى عنها", "بعد ستة أشهر من الشغل المتواصل: يوم ونصف من الشغل الفعلي عن كل شهر (يومان للأجراء دون 18 سنة)."]),
  lc("232", ["Majoration pour ancienneté", "1,5 jour par période entière de cinq ans de service, sans que la durée totale dépasse 30 jours."], ["الزيادة بحسب الأقدمية", "يوم ونصف عن كل فترة كاملة من خمس سنوات، على ألا تتعدى المدة الإجمالية 30 يوما."]),
  lc("240", ["Périodes assimilées pour le congé", "Le préavis, le congé de l'année précédente et certaines suspensions (art. 32) sont assimilés à du travail effectif."], ["الفترات المعتبرة في العطلة", "تعتبر فترات أجل الإخطار والعطلة السابقة وبعض حالات التوقف (المادة 32) فترات شغل فعلي."]),
  lc("251", ["Indemnité compensatrice de congé", "Le salarié dont le contrat est rompu avant d'avoir pris son congé perçoit une indemnité pour le congé acquis."], ["التعويض عن العطلة غير المستفاد منها", "يستحق الأجير الذي أنهي عقده قبل الاستفادة من عطلته تعويضا عن العطلة المكتسبة."], "requires_legal_review", "Numérotation exacte à confirmer sur le texte officiel."),
  lc("345", ["Salaire minimum légal", "Le salaire ne peut être inférieur au salaire minimum légal fixé par voie réglementaire après consultation."], ["الحد الأدنى القانوني للأجر", "لا يمكن أن يقل الأجر عن الحد الأدنى القانوني المحدد بنص تنظيمي."]),
  {
    id: "D-2-04-469",
    instrument: "decree_2_04_469",
    article: "—",
    title: { fr: "Durées du préavis (décret n° 2.04.469 du 29 décembre 2004)", ar: "مدد أجل الإخطار (المرسوم رقم 2.04.469 بتاريخ 29 دجنبر 2004)" },
    summary: {
      fr: "Cadres : 1 mois (< 1 an), 2 mois (1 à 5 ans), 3 mois (> 5 ans). Employés et ouvriers : 8 jours (< 1 an), 1 mois (1 à 5 ans), 2 mois (> 5 ans).",
      ar: "الأطر: شهر (أقل من سنة)، شهران (من سنة إلى 5 سنوات)، 3 أشهر (أكثر من 5 سنوات). المستخدمون والعمال: 8 أيام، شهر، شهران.",
    },
    officialUrl: SOURCES.noticeDecree,
    validFrom: "2004-12-29",
    validTo: null,
    verification: "corroborated",
  },
  {
    id: "L1912-21",
    instrument: "law_19_12",
    article: "21",
    title: { fr: "Indemnité de licenciement du travailleur domestique", ar: "التعويض عن الفصل للعامل المنزلي" },
    summary: {
      fr: "Après au moins un an de travail continu chez le même employeur, licenciement hors faute grave : barème 96/144/192/240 heures.",
      ar: "بعد سنة على الأقل من الشغل المتواصل لدى نفس المشغل وفي غير حالة الخطأ الجسيم: 96/144/192/240 ساعة.",
    },
    officialUrl: SOURCES.law1912,
    validFrom: DOMESTIC_FROM,
    validTo: null,
    verification: "requires_legal_review",
  },
  {
    id: "L1912-22",
    instrument: "law_19_12",
    article: "22",
    title: { fr: "Faute grave du travailleur domestique", ar: "الخطأ الجسيم للعامل المنزلي" },
    summary: { fr: "La faute grave prive le travailleur domestique de l'indemnité de licenciement.", ar: "الخطأ الجسيم يحرم العامل المنزلي من التعويض عن الفصل." },
    officialUrl: SOURCES.law1912,
    validFrom: DOMESTIC_FROM,
    validTo: null,
    verification: "requires_legal_review",
  },
  {
    id: "L1912-leave",
    instrument: "law_19_12",
    article: "10",
    title: { fr: "Congé annuel du travailleur domestique", ar: "العطلة السنوية للعامل المنزلي" },
    summary: { fr: "1,5 jour ouvrable par mois après six mois de travail continu.", ar: "يوم ونصف عن كل شهر بعد ستة أشهر من الشغل المتواصل." },
    officialUrl: SOURCES.law1912,
    validFrom: DOMESTIC_FROM,
    validTo: null,
    verification: "requires_legal_review",
  },
  {
    id: "L1912-notice",
    instrument: "law_19_12",
    article: "—",
    title: { fr: "Préavis du travailleur domestique", ar: "أجل الإخطار للعامل المنزلي" },
    summary: { fr: "Durée du préavis à vérifier dans la loi 19-12 et ses textes d'application.", ar: "مدة الإخطار يتعين التحقق منها في القانون 19.12 ونصوصه التطبيقية." },
    officialUrl: SOURCES.law1912,
    validFrom: DOMESTIC_FROM,
    validTo: null,
    verification: "requires_legal_review",
  },
];

/* ------------------------------------------------------------------ calculation rules */

const LABOR_BRACKETS: ScaleBracket[] = [
  { upToYears: 5, hoursPerYear: 96 },
  { upToYears: 10, hoursPerYear: 144 },
  { upToYears: 15, hoursPerYear: 192 },
  { upToYears: null, hoursPerYear: 240 },
];

const tiers = (a: [number, "days" | "months"], b: [number, "days" | "months"], c: [number, "days" | "months"]): NoticeTier[] => [
  { upToYears: 1, inclusive: false, value: a[0], unit: a[1] },
  { upToYears: 5, inclusive: true, value: b[0], unit: b[1] },
  { upToYears: null, inclusive: false, value: c[0], unit: c[1] },
];

export const RULES: AnyRuleEntry[] = [
  {
    id: "regime-availability",
    key: "regime.availability",
    value: { laborCodeFrom: LC_FROM, domesticFrom: DOMESTIC_FROM },
    validFrom: "1900-01-01",
    validTo: null,
    provisionIds: [],
    verification: "corroborated",
    description: { fr: "Entrée en vigueur du Code du travail (8 juin 2004) et de la loi 19-12 (2 octobre 2018).", ar: "دخول مدونة الشغل (8 يونيو 2004) والقانون 19.12 (2 أكتوبر 2018) حيز التنفيذ." },
  },
  {
    id: "wt-nonagri-2004",
    key: "working_time.non_agricultural",
    value: { weeklyHours: 44, annualHours: 2288, conventionalMonthlyHours: 191 },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-184"],
    verification: "corroborated",
    description: { fr: "2288 h/an = 44 h/semaine ; 2288/12 = 190,67 h arrondi par convention à 191 h/mois.", ar: "2288 ساعة سنويا = 44 ساعة أسبوعيا؛ 190.67 ساعة شهريا تقرب عرفا إلى 191." },
  },
  {
    id: "wt-agri-2004",
    key: "working_time.agricultural",
    value: { weeklyHours: 48, annualHours: 2496, conventionalMonthlyHours: 208 },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-184"],
    verification: "corroborated",
    description: { fr: "2496 h/an, soit 208 h/mois (48 h/semaine en moyenne).", ar: "2496 ساعة سنويا، أي 208 ساعة شهريا." },
  },
  {
    id: "wt-domestic-2018",
    key: "working_time.domestic",
    value: { weeklyHours: 48, minorWeeklyHours: 40, conventionalMonthlyHours: 208 },
    validFrom: DOMESTIC_FROM,
    validTo: null,
    provisionIds: ["L1912-21"],
    verification: "requires_legal_review",
    description: { fr: "Durée maximale hebdomadaire des travailleurs domestiques (48 h ; 40 h pour les 16-18 ans).", ar: "المدة القصوى الأسبوعية للعمال المنزليين (48 ساعة؛ 40 ساعة لمن هم بين 16 و18 سنة)." },
  },
  {
    id: "dismissal-lc-2004",
    key: "dismissal.labor_code",
    value: { minEffectiveMonths: 6, brackets: LABOR_BRACKETS, defaultPartialYear: "prorata" },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-52", "CT-53"],
    verification: "corroborated",
    description: { fr: "Barème progressif de l'art. 53 ; condition de six mois de travail effectif (art. 52).", ar: "الجدول التصاعدي للمادة 53؛ شرط ستة أشهر من الشغل الفعلي (المادة 52)." },
  },
  {
    id: "dismissal-domestic-2018",
    key: "dismissal.domestic",
    value: { minEffectiveMonths: 12, brackets: LABOR_BRACKETS, defaultPartialYear: "prorata" },
    validFrom: DOMESTIC_FROM,
    validTo: null,
    provisionIds: ["L1912-21"],
    verification: "requires_legal_review",
    description: { fr: "Loi 19-12 : un an de travail continu minimum ; barème horaire identique.", ar: "القانون 19.12: سنة شغل متواصل على الأقل؛ نفس الجدول بالساعات." },
  },
  {
    id: "damages-lc-2004",
    key: "damages.labor_code",
    value: { monthsPerYear: "1.5", capMonths: 36, defaultPartialYear: "prorata" },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-41"],
    verification: "corroborated",
    description: { fr: "1,5 mois par année ou fraction d'année, plafond 36 mois.", ar: "شهر ونصف عن كل سنة أو جزء منها، بسقف 36 شهرا." },
  },
  {
    id: "notice-lc-2004",
    key: "notice.labor_code",
    value: {
      executive: tiers([1, "months"], [2, "months"], [3, "months"]),
      employee: tiers([8, "days"], [1, "months"], [2, "months"]),
      worker: tiers([8, "days"], [1, "months"], [2, "months"]),
    },
    validFrom: "2004-12-29",
    validTo: null,
    provisionIds: ["CT-43", "D-2-04-469"],
    verification: "corroborated",
    description: { fr: "Décret 2.04.469 : seuils « moins d'un an », « de 1 à 5 ans », « plus de 5 ans ».", ar: "المرسوم 2.04.469: «أقل من سنة»، «من سنة إلى 5 سنوات»، «أكثر من 5 سنوات»." },
  },
  {
    id: "notice-domestic-2018",
    key: "notice.domestic",
    value: null,
    validFrom: DOMESTIC_FROM,
    validTo: null,
    provisionIds: ["L1912-notice"],
    verification: "requires_legal_review",
    description: { fr: "Aucune durée de préavis vérifiée pour les travailleurs domestiques.", ar: "لا توجد مدة إخطار متحقق منها للعمال المنزليين." },
  },
  {
    id: "leave-lc-2004",
    key: "paid_leave.labor_code",
    value: { daysPerMonth: "1.5", minorDaysPerMonth: "2", seniorityBonusDays: "1.5", seniorityBonusEveryYears: 5, maxDays: 30, minServiceMonths: 6 },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-231", "CT-232"],
    verification: "corroborated",
    description: { fr: "1,5 j/mois (2 j < 18 ans), +1,5 j par 5 ans, plafond 30 jours.", ar: "يوم ونصف شهريا (يومان دون 18 سنة)، +1.5 يوم عن كل 5 سنوات، بسقف 30 يوما." },
  },
  {
    id: "leave-domestic-2018",
    key: "paid_leave.domestic",
    value: { daysPerMonth: "1.5", minServiceMonths: 6 },
    validFrom: DOMESTIC_FROM,
    validTo: null,
    provisionIds: ["L1912-leave"],
    verification: "requires_legal_review",
    description: { fr: "1,5 jour par mois après six mois de service continu.", ar: "يوم ونصف عن كل شهر بعد ستة أشهر من الشغل المتواصل." },
  },
  {
    id: "overtime-2004",
    key: "overtime.rates",
    value: { rate25: "25", rate50: "50", rate100: "100" },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-201"],
    verification: "corroborated",
    description: { fr: "Majorations des heures supplémentaires.", ar: "نسب الزيادة عن الساعات الإضافية." },
  },
  {
    id: "minwage-domestic-2018",
    key: "minimum_wage.domestic",
    value: { ratioOfSmig: "0.60" },
    validFrom: DOMESTIC_FROM,
    validTo: null,
    provisionIds: ["L1912-21"],
    verification: "requires_legal_review",
    description: { fr: "Salaire minimum des travailleurs domestiques : 60 % du SMIG.", ar: "الحد الأدنى لأجر العمال المنزليين: 60% من الحد الأدنى للأجر." },
  },
  {
    id: "suspension-2004",
    key: "seniority.suspension_assimilation",
    value: {
      illness: true,
      work_accident: true,
      maternity: true,
      military_service: true,
      strike: false,
      temporary_closure: true,
      unpaid_leave: false,
      disciplinary_suspension: false,
      other: false,
    },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: [],
    verification: "requires_legal_review",
    description: {
      fr: "Traitement par défaut des suspensions (art. 32) pour l'ancienneté ; modifiable période par période.",
      ar: "المعالجة الافتراضية لفترات التوقف (المادة 32) في الأقدمية؛ قابلة للتعديل لكل فترة.",
    },
  },
];

/* ------------------------------------------------------------------ paid holidays */

function holiday(id: string, fr: string, ar: string, kind: "civil" | "religious", fixedDate?: string, validFrom = LC_FROM): PaidHoliday {
  return { id, name: { fr, ar }, kind, fixedDate, validFrom, validTo: null, source: "Décret relatif aux jours de fête payés", verification: "corroborated" };
}

export const PAID_HOLIDAYS: PaidHoliday[] = [
  holiday("new-year", "Nouvel an", "فاتح السنة الميلادية", "civil", "01-01"),
  holiday("independence-manifesto", "Manifeste de l'indépendance", "ذكرى تقديم وثيقة الاستقلال", "civil", "01-11"),
  holiday("labour-day", "Fête du travail", "عيد الشغل", "civil", "05-01"),
  holiday("throne", "Fête du Trône", "عيد العرش", "civil", "07-30"),
  holiday("oued-eddahab", "Allégeance de Oued Eddahab", "ذكرى استرجاع إقليم وادي الذهب", "civil", "08-14"),
  holiday("revolution", "Révolution du Roi et du Peuple", "ذكرى ثورة الملك والشعب", "civil", "08-20"),
  holiday("youth", "Fête de la Jeunesse", "عيد الشباب", "civil", "08-21"),
  holiday("green-march", "Marche Verte", "ذكرى المسيرة الخضراء", "civil", "11-06"),
  holiday("independence", "Fête de l'Indépendance", "عيد الاستقلال", "civil", "11-18"),
  holiday("eid-fitr", "Aïd Al Fitr", "عيد الفطر", "religious"),
  holiday("eid-adha", "Aïd Al Adha", "عيد الأضحى", "religious"),
  holiday("muharram", "1er Moharrem", "فاتح محرم", "religious"),
  holiday("mawlid", "Aïd Al Mawlid", "عيد المولد النبوي", "religious"),
];

export const SEED_RULESET: LegalRuleSet = {
  schemaVersion: 1,
  version: "MA-2026.10-1",
  publishedAt: "2026-10-10T00:00:00.000Z",
  minimumWages: MINIMUM_WAGES,
  provisions: PROVISIONS,
  rules: RULES,
  paidHolidays: PAID_HOLIDAYS,
};
