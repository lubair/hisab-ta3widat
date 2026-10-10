import type { AnyRuleEntry, LegalProvision, LegalRuleSet, MinimumWageEntry, NoticeTier, PaidHoliday, ScaleBracket } from "./schema";

/**
 * Baseline legal data. Every value cites its instrument and a source; the
 * verification status reflects what could be confirmed against official or
 * concordant sources (see docs/legal-verification.md). Values marked
 * "requires_legal_review" are applied but surfaced to the user as such.
 */

export const SOURCES = {
  /** ILO reproduction of the French text of Law 65-99 (BO n° 5210 du 6 mai 2004). */
  laborCode: "https://webapps.ilo.org/static/english/inwork/cb-policy-guide/moroccolabourcode2004.pdf",
  laborCodeBo: "BO n° 5210 du 6 mai 2004 (éd. française) — Dahir n° 1-03-194 du 11 septembre 2003",
  noticeDecree: "https://www.sgg.gov.ma/BulletinOfficiel.aspx",
  law1912: "https://www.sgg.gov.ma/BulletinOfficiel.aspx",
  law1912Bo: "Dahir n° 1-16-121 du 10 août 2016 — BO n° 6493 du 22 août 2016 (éd. arabe), BO n° 6610 du 5 octobre 2017 (éd. française)",
  bo: "https://www.sgg.gov.ma/BulletinOfficiel.aspx",
  /** ILO NATLEX copy of the French BO text of Décret n° 2-23-799. */
  decree2023: "https://natlex.ilo.org/dyn/natlex2/natlex2/files/download/117681/MAR-117681.pdf",
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

const D2004 = { decree: "Décret n° 2-04-421 du 4 juin 2004", bo: { bulletinOfficiel: "BO n° 5219 (éd. arabe)" } };
const D2008 = { decree: "Décret n° 2-08-292", bo: { bulletinOfficiel: "BO n° 5649 du 21 juillet 2008 (éd. arabe)" } };
const D2011 = { decree: "Décret n° 2-11-247 du 1er juillet 2011", bo: { bulletinOfficiel: "BO n° 5959 du 11 juillet 2011" } };
const D2014 = { decree: "Décret n° 2-14-343", bo: { bulletinOfficiel: "BO n° 6272 du 10 juillet 2014" } };
const D2019 = { decree: "Décret n° 2-19-424 du 26 juin 2019", bo: { bulletinOfficiel: "BO n° 6790 du 27 juin 2019" } };
const D2022 = {
  decree: "Décret n° 2-22-606 du 7 septembre 2022",
  bo: { bulletinOfficiel: "BO n° 7125 du 12 septembre 2022", notes: "Secteur touristique : application reportée au 1er janvier 2023." },
};
const D2023 = {
  decree: "Décret n° 2-23-799 du 13 octobre 2023",
  bo: { bulletinOfficiel: "BO n° 7240 du 19 octobre 2023 (éd. arabe)", officialUrl: SOURCES.decree2023, verification: "verified" as const },
};
const D2025 = { decree: "Décret n° 2-24-1122 du 3 janvier 2025", bo: { bulletinOfficiel: "BO n° 7367 du 6 janvier 2025" } };
const D2026 = { decree: "Décret n° 2-25-983 du 29 décembre 2025", bo: { bulletinOfficiel: "BO n° 7469 du 29 décembre 2025" } };

/**
 * Textile-sector staging (2008-2013) is not modelled; between 2004-06-08 and
 * 2004-06-30 no entry exists, so the check reports a missing value rather than guessing.
 */
export const MINIMUM_WAGES: MinimumWageEntry[] = [
  smig("smig-2004", "9.66", "2004-07-01", "2008-06-30", D2004.decree, D2004.bo),
  smig("smig-2008", "10.14", "2008-07-01", "2009-06-30", D2008.decree, D2008.bo),
  smig("smig-2009", "10.64", "2009-07-01", "2011-06-30", D2008.decree, D2008.bo),
  smig("smig-2011", "11.70", "2011-07-01", "2012-06-30", D2011.decree, D2011.bo),
  smig("smig-2012", "12.24", "2012-07-01", "2014-06-30", D2011.decree, D2011.bo),
  smig("smig-2014", "12.85", "2014-07-01", "2015-06-30", D2014.decree, D2014.bo),
  smig("smig-2015", "13.46", "2015-07-01", "2019-06-30", D2014.decree, D2014.bo),
  smig("smig-2019", "14.13", "2019-07-01", "2020-06-30", D2019.decree, D2019.bo),
  smig("smig-2020", "14.81", "2020-07-01", "2022-08-31", D2019.decree, D2019.bo),
  smig("smig-2022", "15.55", "2022-09-01", "2023-08-31", D2022.decree, D2022.bo),
  smig("smig-2023", "16.29", "2023-09-01", "2024-12-31", D2023.decree, D2023.bo),
  smig("smig-2025", "17.10", "2025-01-01", "2025-12-31", D2025.decree, D2025.bo),
  smig("smig-2026", "17.92", "2026-01-01", null, D2026.decree, D2026.bo),

  smag("smag-2004", "50.00", "2004-07-01", "2008-06-30", D2004.decree, D2004.bo),
  smag("smag-2008", "52.50", "2008-07-01", "2009-06-30", D2008.decree, D2008.bo),
  smag("smag-2009", "55.12", "2009-07-01", "2011-06-30", D2008.decree, D2008.bo),
  smag("smag-2011", "60.63", "2011-07-01", "2012-06-30", D2011.decree, D2011.bo),
  smag("smag-2012", "63.39", "2012-07-01", "2014-06-30", D2011.decree, D2011.bo),
  smag("smag-2014", "66.56", "2014-07-01", "2015-06-30", D2014.decree, D2014.bo),
  smag("smag-2015", "69.73", "2015-07-01", "2019-06-30", D2014.decree, D2014.bo),
  smag("smag-2019", "73.22", "2019-07-01", "2020-06-30", D2019.decree, D2019.bo),
  smag("smag-2020", "76.70", "2020-07-01", "2022-08-31", D2019.decree, D2019.bo),
  smag("smag-2022", "84.37", "2022-09-01", "2023-08-31", D2022.decree, D2022.bo),
  smag("smag-2023", "88.58", "2023-09-01", "2025-03-31", D2023.decree, D2023.bo),
  smag("smag-2025", "93.00", "2025-04-01", "2026-03-31", D2025.decree, D2025.bo),
  smag("smag-2026", "97.44", "2026-04-01", null, D2026.decree, D2026.bo),
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

function l1912(article: string, fr: [string, string], ar: [string, string], verification: LegalProvision["verification"] = "corroborated"): LegalProvision {
  return {
    id: `L1912-${article}`,
    instrument: "law_19_12",
    article,
    title: { fr: fr[0], ar: ar[0] },
    summary: { fr: fr[1], ar: ar[1] },
    officialUrl: SOURCES.law1912,
    bulletinOfficiel: SOURCES.law1912Bo,
    validFrom: DOMESTIC_FROM,
    validTo: null,
    verification,
  };
}

export const PROVISIONS: LegalProvision[] = [
  lc("16", ["Cas de recours au CDD", "Le CDD n'est possible que dans les cas limitativement prévus (remplacement, accroissement temporaire, travail saisonnier…) ; à défaut il peut être requalifié en CDI (art. 16-17)."], ["حالات إبرام العقد محدد المدة", "لا يمكن إبرام عقد محدد المدة إلا في الحالات المحددة قانونا (تعويض أجير، تزايد مؤقت للنشاط، شغل موسمي…)؛ وإلا أمكن اعتباره عقدا غير محدد المدة (المادتان 16 و17)."]),
  lc("33", ["Rupture anticipée du CDD", "Hors faute grave ou force majeure, la rupture avant terme ouvre droit à des dommages-intérêts égaux aux salaires de la période allant de la rupture au terme fixé par le contrat."], ["الإنهاء المبتسر للعقد محدد المدة", "خارج حالتي الخطأ الجسيم والقوة القاهرة، يستحق الطرف المتضرر تعويضا يعادل مبلغ الأجور عن الفترة الممتدة من تاريخ الإنهاء إلى الأجل المحدد في العقد."]),
  lc("39", ["Faute grave du salarié", "Liste des fautes graves (vol, abus de confiance, absence injustifiée de plus de 4 jours ou 8 demi-journées sur 12 mois, refus délibéré d'exécuter un travail…)."], ["الخطأ الجسيم للأجير", "قائمة الأخطاء الجسيمة (السرقة، خيانة الأمانة، التغيب بدون مبرر لأكثر من 4 أيام أو 8 أنصاف يوم خلال 12 شهرا، رفض إنجاز شغل عمدا…)."]),
  lc("40", ["Faute grave de l'employeur", "Le départ du salarié provoqué par une faute grave de l'employeur (insulte grave, violence, harcèlement sexuel…) est assimilé à un licenciement abusif."], ["الخطأ الجسيم للمشغل", "مغادرة الأجير لشغله بسبب خطأ جسيم للمشغل (السب الفادح، العنف، التحرش الجنسي…) تعتبر فصلا تعسفيا."]),
  lc("41", ["Dommages-intérêts pour licenciement abusif", "Devant le tribunal : réintégration ou dommages-intérêts d'un mois et demi de salaire par année ou fraction d'année de travail, dans la limite de 36 mois. Un accord de conciliation préliminaire signé devant l'inspecteur du travail est définitif."], ["التعويض عن الضرر في حالة الفصل التعسفي", "أمام المحكمة: الإرجاع أو تعويض يحدد على أساس أجر شهر ونصف عن كل سنة عمل أو جزء من السنة على ألا يتعدى سقف 36 شهرا. ويعتبر اتفاق الصلح التمهيدي الموقع أمام مفتش الشغل نهائيا."]),
  lc("43", ["Préavis", "La rupture du CDI par l'une des parties est subordonnée à un préavis, sauf faute grave ou force majeure ; durées fixées par voie réglementaire ; tout préavis inférieur à 8 jours est nul."], ["أجل الإخطار", "يتوقف إنهاء العقد غير محدد المدة على احترام أجل الإخطار ما لم يرتكب خطأ جسيم أو تقع قوة قاهرة؛ وتحدد مدده بنص تنظيمي؛ ويعتبر باطلا كل أجل يقل عن 8 أيام."]),
  lc("51", ["Indemnité compensatrice de préavis", "Sans préavis, la partie responsable verse une indemnité égale à la rémunération qu'aurait perçue le salarié s'il était demeuré à son poste."], ["التعويض عن عدم احترام أجل الإخطار", "يؤدي الطرف المسؤول تعويضا يعادل الأجر الذي كان سيتقاضاه الأجير لو استمر في شغله."]),
  lc("52", ["Droit à l'indemnité de licenciement", "Salarié en CDI licencié après six mois de travail dans la même entreprise, quels que soient le mode de rémunération et la périodicité du paiement, sauf faute grave."], ["الحق في التعويض عن الفصل", "الأجير المرتبط بعقد غير محدد المدة الذي يفصل بعد قضاء ستة أشهر من الشغل داخل نفس المقاولة، بصرف النظر عن طريقة الأداء ودوريته، ما لم يرتكب خطأ جسيما."]),
  lc("53", ["Barème de l'indemnité de licenciement", "Pour chaque année ou fraction d'année de travail effectif : 96 h (5 premières années), 144 h (6 à 10 ans), 192 h (11 à 15 ans), 240 h (au-delà de 15 ans). La Cour de cassation compte toute fraction d'année comme une année entière."], ["جدول التعويض عن الفصل", "عن كل سنة أو جزء من السنة من الشغل الفعلي: 96 ساعة (5 سنوات الأولى)، 144 ساعة (6 إلى 10)، 192 ساعة (11 إلى 15)، 240 ساعة (ما فوق 15 سنة). وتعتبر محكمة النقض كل جزء من السنة سنة كاملة."]),
  lc("54", ["Périodes assimilées à du travail effectif", "Congé payé, congé de maternité, incapacité due à un accident du travail ou une maladie professionnelle, absences autorisées, maladie non professionnelle, fermeture administrative, force majeure."], ["الفترات المعتبرة شغلا فعليا", "العطلة المؤدى عنها، عطلة الأمومة، العجز الناتج عن حادثة شغل أو مرض مهني، التغيبات المأذون بها، المرض غير المهني، الإغلاق الإداري، القوة القاهرة."]),
  lc("55", ["Salaire de base de l'indemnité", "Moyenne des salaires perçus au cours des cinquante-deux semaines qui ont précédé la rupture du contrat."], ["الأجر المعتمد في التعويض", "معدل الأجور المتقاضاة خلال الاثنين والخمسين أسبوعا السابقة لتاريخ إنهاء العقد."]),
  lc("56", ["Plancher du salaire de base", "Le salaire servant de base au calcul de l'indemnité de licenciement ne peut être inférieur au salaire minimum légal."], ["الحد الأدنى للأجر المعتمد", "لا يمكن أن يقل الأجر المعتمد في حساب التعويض عن الفصل عن الحد الأدنى القانوني للأجر."]),
  lc("57", ["Éléments du salaire pris en compte", "Salaire et accessoires : primes et indemnités inhérentes au travail (hors remboursement de frais, indemnités de responsabilité sauf indemnités de fonction, travaux pénibles ou dangereux, zones dangereuses, remplacement temporaire sauf heures supplémentaires), avantages en nature, commissions et pourboires."], ["عناصر الأجر المعتمدة", "الأجر وتوابعه: المنح والتعويضات المرتبطة بالشغل (باستثناء استرجاع المصاريف، وتعويضات المسؤولية ما عدا تعويضات المهام، والأشغال الشاقة أو الخطرة، والمناطق الخطرة، والنيابة المؤقتة ما عدا الساعات الإضافية)، والامتيازات العينية، والعمولات والحلوان."]),
  lc("58", ["Représentants du personnel", "L'indemnité de licenciement est majorée de 100 % pour les délégués des salariés et les représentants syndicaux."], ["مندوبو الأجراء", "يرفع التعويض عن الفصل بنسبة 100% بالنسبة لمندوبي الأجراء والممثلين النقابيين."]),
  lc("59", ["Cumul des indemnités", "Le salarié licencié abusivement cumule les dommages-intérêts (art. 41), l'indemnité de préavis (art. 51) et l'indemnité de licenciement (art. 52-53)."], ["الجمع بين التعويضات", "يجمع الأجير المفصول تعسفيا بين التعويض عن الضرر (المادة 41) والتعويض عن الإخطار (المادة 51) والتعويض عن الفصل (المادتان 52 و53)."]),
  lc("61", ["Licenciement sans préavis pour faute grave", "En cas de faute grave, le salarié peut être licencié sans préavis ni indemnité ni dommages-intérêts."], ["الفصل دون إخطار بسبب خطأ جسيم", "في حالة ارتكاب خطأ جسيم يمكن فصل الأجير دون إخطار ولا تعويض ولا تعويض عن الضرر."]),
  lc("184", ["Durée légale du travail", "Non agricole : 2288 heures par an ou 44 heures par semaine. Agricole : 2496 heures par an."], ["المدة القانونية للشغل", "غير الفلاحي: 2288 ساعة في السنة أو 44 ساعة في الأسبوع. الفلاحي: 2496 ساعة في السنة."]),
  lc("201", ["Majoration des heures supplémentaires", "25 % (jour) ou 50 % (nuit) ; 50 % et 100 % le jour du repos hebdomadaire."], ["الزيادة عن الساعات الإضافية", "25% نهارا و50% ليلا؛ و50% و100% إذا أنجزت يوم الراحة الأسبوعية."]),
  lc("217", ["Jours fériés payés", "Le travail est interdit les jours de fête payés fixés par voie réglementaire ; le salaire est maintenu (art. 219-221)."], ["أيام الأعياد المؤدى عنها", "يمنع الشغل في أيام الأعياد المؤدى عنها المحددة بنص تنظيمي، مع الحفاظ على الأجر (المواد 219-221)."]),
  lc("231", ["Durée du congé annuel payé", "Après six mois de service continu : 1,5 jour de travail effectif par mois de service (2 jours pour les moins de 18 ans)."], ["مدة العطلة السنوية المؤدى عنها", "بعد ستة أشهر من الشغل المتواصل: يوم ونصف من الشغل الفعلي عن كل شهر (يومان للأجراء دون 18 سنة)."]),
  lc("232", ["Majoration pour ancienneté", "1,5 jour par période entière, continue ou non, de cinq ans de service, sans que la durée totale dépasse 30 jours."], ["الزيادة بحسب الأقدمية", "يوم ونصف عن كل فترة كاملة، متصلة أو غير متصلة، من خمس سنوات، على ألا تتعدى المدة الإجمالية 30 يوما."]),
  lc("238", ["Mois de travail de référence", "Un mois de travail correspond à 26 jours de travail effectif, ou à 191 heures (activités non agricoles) et 208 heures (activités agricoles)."], ["الشهر المرجعي للشغل", "يعادل شهر الشغل 26 يوما من الشغل الفعلي، أو 191 ساعة في الأنشطة غير الفلاحية و208 ساعات في الأنشطة الفلاحية."]),
  lc("239", ["Périodes assimilées pour le congé", "Sont assimilés à du travail effectif : le congé de l'année précédente, le préavis, les suspensions de l'art. 32 (1° à 5°), les absences autorisées jusqu'à 10 jours par an, la fermeture temporaire."], ["الفترات المعتبرة في العطلة", "تعتبر شغلا فعليا: عطلة السنة السابقة، أجل الإخطار، حالات التوقف المنصوص عليها في المادة 32 (1° إلى 5°)، التغيبات المأذون بها في حدود 10 أيام سنويا، الإغلاق المؤقت."]),
  lc("249", ["Indemnité de congé", "Pendant le congé, le salarié perçoit une indemnité équivalente à la rémunération qu'il aurait perçue s'il était en service."], ["تعويض العطلة", "يتقاضى الأجير خلال عطلته تعويضا يعادل الأجر الذي كان سيتقاضاه لو بقي في شغله."]),
  lc("251", ["Indemnité compensatrice de congé", "Le salarié comptant six mois de service continu dont le contrat prend fin avant d'avoir pris son congé perçoit une indemnité compensatrice ; tout mois de travail entamé est considéré comme un mois entier."], ["التعويض عن العطلة غير المستفاد منها", "يستحق الأجير الذي قضى ستة أشهر من الشغل المتواصل وانتهى عقده قبل الاستفادة من عطلته تعويضا؛ ويعتبر كل شهر شغل بدئ فيه شهرا كاملا."]),
  lc("252", ["Service inférieur à six mois", "Le salarié comptant au moins un mois de travail perçoit 1,5 jour (2 jours pour les moins de 18 ans) par mois entier de travail."], ["مدة شغل تقل عن ستة أشهر", "يستحق الأجير الذي قضى شهرا على الأقل يوما ونصف (يومين لمن هم دون 18 سنة) عن كل شهر كامل من الشغل."]),
  lc("254", ["Indemnité due quel que soit le motif", "L'indemnité compensatrice de congé est due quelle que soit la cause de la rupture du contrat."], ["استحقاق التعويض أيا كان السبب", "يستحق التعويض عن العطلة أيا كان سبب إنهاء العقد."]),
  lc("356", ["Salaire minimum légal", "Le salaire minimum légal (SMIG / SMAG) est fixé par voie réglementaire après consultation des organisations professionnelles."], ["الحد الأدنى القانوني للأجر", "يحدد الحد الأدنى القانوني للأجر بنص تنظيمي بعد استشارة المنظمات المهنية."]),
  {
    id: "D-2-04-469",
    instrument: "decree_2_04_469",
    article: "—",
    title: { fr: "Durées du préavis (décret n° 2-04-469 du 29 décembre 2004)", ar: "مدد أجل الإخطار (المرسوم رقم 2.04.469 بتاريخ 29 دجنبر 2004)" },
    summary: {
      fr: "Cadres : 1 mois (< 1 an), 2 mois (1 à 5 ans), 3 mois (> 5 ans). Employés et ouvriers : 8 jours (< 1 an), 1 mois (1 à 5 ans), 2 mois (> 5 ans ; le texte arabe : « 5 ans et plus »).",
      ar: "الأطر: شهر (أقل من سنة)، شهران (من سنة إلى 5 سنوات)، 3 أشهر (أكثر من 5 سنوات). المستخدمون والعمال: 8 أيام، شهر (من سنة إلى 5 سنوات)، شهران (من خمس سنوات فأكثر).",
    },
    officialUrl: SOURCES.noticeDecree,
    bulletinOfficiel: "BO n° 5279 du 3 janvier 2005 (éd. arabe)",
    validFrom: "2004-12-29",
    validTo: null,
    verification: "corroborated",
    notes: "Les versions arabe et française divergent pour une ancienneté d'exactement 5 ans (employés et ouvriers).",
  },
  l1912("21", ["Indemnité de licenciement du travailleur domestique", "Licenciement après au moins un an de travail effectif continu chez le même employeur : 96/144/192/240 heures par année ou fraction d'année. Le travail effectif n'est compté qu'à partir de l'entrée en vigueur de la loi."], ["التعويض عن الفصل للعامل المنزلي", "الفصل بعد سنة على الأقل من الشغل الفعلي المتواصل لدى نفس المشغل: 96/144/192/240 ساعة عن كل سنة أو جزء من السنة. ولا يحتسب الشغل الفعلي إلا ابتداء من دخول القانون حيز التنفيذ."]),
  l1912("19", ["Salaire minimum du travailleur domestique", "Au moins 60 % du salaire minimum légal (SMIG), versé en espèces ; la nourriture et le logement ne peuvent pas être imputés."], ["الحد الأدنى لأجر العامل المنزلي", "لا يقل عن 60% من الحد الأدنى القانوني للأجر، يؤدى نقدا؛ ولا يحتسب المأكل والمسكن ضمنه."]),
  l1912("13", ["Durée du travail du travailleur domestique", "48 heures par semaine ; 40 heures pour les travailleurs âgés de 16 à 18 ans."], ["مدة شغل العامل المنزلي", "48 ساعة في الأسبوع؛ 40 ساعة للعمال الذين تتراوح أعمارهم بين 16 و18 سنة."]),
  l1912("16", ["Congé annuel du travailleur domestique", "Après six mois de service continu : 1,5 jour de travail par mois ; aucune majoration d'ancienneté n'est prévue."], ["العطلة السنوية للعامل المنزلي", "بعد ستة أشهر من الشغل المتواصل: يوم ونصف عن كل شهر؛ دون زيادة بحسب الأقدمية."]),
  l1912("17", ["Jours fériés du travailleur domestique", "Repos payé lors des fêtes religieuses et nationales."], ["أيام الأعياد للعامل المنزلي", "راحة مؤدى عنها خلال الأعياد الدينية والوطنية."]),
  {
    ...l1912("—", ["Préavis du travailleur domestique", "La loi 19-12 ne contient aucune disposition sur le préavis ; aucune indemnité de préavis n'est calculée."], ["أجل الإخطار للعامل المنزلي", "لا يتضمن القانون 19.12 أي مقتضى بشأن أجل الإخطار؛ ولا يحتسب أي تعويض عنه."]),
    id: "L1912-notice",
  },
];

/* ------------------------------------------------------------------ calculation rules */

const LABOR_BRACKETS: ScaleBracket[] = [
  { upToYears: 5, hoursPerYear: 96 },
  { upToYears: 10, hoursPerYear: 144 },
  { upToYears: 15, hoursPerYear: 192 },
  { upToYears: null, hoursPerYear: 240 },
];

/** `fiveYearsInMiddle`: whether exactly 5 years still belongs to the "1 to 5 years" band. */
const tiers = (
  a: [number, "days" | "months"],
  b: [number, "days" | "months"],
  c: [number, "days" | "months"],
  fiveYearsInMiddle: boolean,
): NoticeTier[] => [
  { upToYears: 1, inclusive: false, value: a[0], unit: a[1] },
  { upToYears: 5, inclusive: fiveYearsInMiddle, value: b[0], unit: b[1] },
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
    value: { weeklyHours: 44, annualHours: 2288, conventionalMonthlyHours: 191, monthDays: 26 },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-184", "CT-238"],
    verification: "corroborated",
    description: { fr: "2288 h/an = 44 h/semaine ; un mois = 191 heures ou 26 jours de travail effectif (art. 238).", ar: "2288 ساعة سنويا = 44 ساعة أسبوعيا؛ الشهر = 191 ساعة أو 26 يوما من الشغل الفعلي (المادة 238)." },
  },
  {
    id: "wt-agri-2004",
    key: "working_time.agricultural",
    value: { weeklyHours: 48, annualHours: 2496, conventionalMonthlyHours: 208, monthDays: 26 },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-184", "CT-238"],
    verification: "corroborated",
    description: { fr: "2496 h/an ; un mois = 208 heures ou 26 jours de travail effectif (art. 238).", ar: "2496 ساعة سنويا؛ الشهر = 208 ساعات أو 26 يوما من الشغل الفعلي (المادة 238)." },
  },
  {
    id: "wt-domestic-2018",
    key: "working_time.domestic",
    value: { weeklyHours: 48, minorWeeklyHours: 40, conventionalMonthlyHours: 208, monthDays: 26 },
    validFrom: DOMESTIC_FROM,
    validTo: null,
    provisionIds: ["L1912-13"],
    verification: "corroborated",
    description: {
      fr: "48 h par semaine (40 h pour les 16-18 ans). La loi ne définit pas de mois de référence : 26 jours sont retenus par analogie avec l'art. 238 du Code du travail.",
      ar: "48 ساعة أسبوعيا (40 ساعة لمن هم بين 16 و18 سنة). لا يحدد القانون شهرا مرجعيا: تعتمد 26 يوما قياسا على المادة 238 من مدونة الشغل.",
    },
  },
  {
    id: "dismissal-lc-2004",
    key: "dismissal.labor_code",
    value: { minEffectiveMonths: 6, brackets: LABOR_BRACKETS, defaultPartialYear: "full_year", minimumWageFloor: true, representativeMultiplier: "2" },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-52", "CT-53", "CT-54", "CT-56", "CT-58"],
    verification: "corroborated",
    description: {
      fr: "Barème de l'art. 53 (toute fraction d'année compte comme une année : Cass. soc. 2017 et 2023) ; six mois de travail (art. 52) ; salaire de base au moins égal au SMIG (art. 56) ; majoration de 100 % pour les représentants (art. 58).",
      ar: "جدول المادة 53 (كل جزء من السنة يعتبر سنة كاملة: محكمة النقض 2017 و2023)؛ ستة أشهر من الشغل (المادة 52)؛ أجر مرجعي لا يقل عن الحد الأدنى للأجر (المادة 56)؛ زيادة 100% للممثلين (المادة 58).",
    },
  },
  {
    id: "dismissal-domestic-2018",
    key: "dismissal.domestic",
    value: { minEffectiveMonths: 12, brackets: LABOR_BRACKETS, defaultPartialYear: "full_year", minimumWageFloor: false, representativeMultiplier: "1" },
    validFrom: DOMESTIC_FROM,
    validTo: null,
    provisionIds: ["L1912-21"],
    verification: "corroborated",
    description: {
      fr: "Loi 19-12, art. 21 : un an de travail effectif continu ; même barème horaire ; le travail effectif ne compte qu'à partir du 2 octobre 2018. La loi ne prévoit pas expressément l'exclusion pour faute grave.",
      ar: "القانون 19.12، المادة 21: سنة من الشغل الفعلي المتواصل؛ نفس الجدول بالساعات؛ لا يحتسب الشغل الفعلي إلا ابتداء من 2 أكتوبر 2018. ولا ينص القانون صراحة على الحرمان بسبب الخطأ الجسيم.",
    },
  },
  {
    id: "damages-lc-2004",
    key: "damages.labor_code",
    value: { monthsPerYear: "1.5", capMonths: 36, defaultPartialYear: "full_year" },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-41", "CT-59"],
    verification: "corroborated",
    description: { fr: "1,5 mois par année ou fraction d'année, plafond 36 mois.", ar: "شهر ونصف عن كل سنة أو جزء منها، بسقف 36 شهرا." },
  },
  {
    id: "notice-lc-2004",
    key: "notice.labor_code",
    value: {
      executive: tiers([1, "months"], [2, "months"], [3, "months"], true),
      // Arabic (authoritative) text: "من خمس سنوات فأكثر" — five years or more.
      employee: tiers([8, "days"], [1, "months"], [2, "months"], false),
      worker: tiers([8, "days"], [1, "months"], [2, "months"], false),
    },
    validFrom: "2004-12-29",
    validTo: null,
    provisionIds: ["CT-43", "D-2-04-469"],
    verification: "corroborated",
    description: {
      fr: "Décret 2-04-469 : « moins d'un an », « de 1 à 5 ans », « plus de 5 ans ». Pour les employés et ouvriers, le texte arabe vise « 5 ans et plus » : 5 ans exactement donnent 2 mois.",
      ar: "المرسوم 2.04.469: «أقل من سنة»، «من سنة إلى 5 سنوات»، «أكثر من 5 سنوات». بالنسبة للمستخدمين والعمال ينص النص العربي على «من خمس سنوات فأكثر»: 5 سنوات بالضبط تخول شهرين.",
    },
  },
  {
    id: "notice-domestic-2018",
    key: "notice.domestic",
    value: null,
    validFrom: DOMESTIC_FROM,
    validTo: null,
    provisionIds: ["L1912-notice"],
    verification: "corroborated",
    description: { fr: "La loi 19-12 ne prévoit aucun préavis.", ar: "لا ينص القانون 19.12 على أي أجل للإخطار." },
  },
  {
    id: "leave-lc-2004",
    key: "paid_leave.labor_code",
    value: { daysPerMonth: "1.5", minorDaysPerMonth: "2", seniorityBonusDays: "1.5", seniorityBonusEveryYears: 5, maxDays: 30, minServiceMonths: 6, startedMonthCountsAsFull: true },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-231", "CT-232", "CT-238", "CT-251", "CT-252"],
    verification: "corroborated",
    description: {
      fr: "1,5 j/mois (2 j < 18 ans), +1,5 j par 5 ans, plafond 30 jours. À la rupture : tout mois entamé compte (art. 251) ; moins de six mois : mois entiers seulement (art. 252).",
      ar: "يوم ونصف شهريا (يومان دون 18 سنة)، +1.5 يوم عن كل 5 سنوات، بسقف 30 يوما. عند الإنهاء: كل شهر بدئ فيه يحتسب (المادة 251)؛ أقل من ستة أشهر: الأشهر الكاملة فقط (المادة 252).",
    },
  },
  {
    id: "leave-domestic-2018",
    key: "paid_leave.domestic",
    value: { daysPerMonth: "1.5", minServiceMonths: 6 },
    validFrom: DOMESTIC_FROM,
    validTo: null,
    provisionIds: ["L1912-16"],
    verification: "corroborated",
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
    provisionIds: ["L1912-19"],
    verification: "corroborated",
    description: {
      fr: "Salaire minimum des travailleurs domestiques : 60 % du SMIG (loi 19-12). Un relèvement ultérieur de ce taux par décret doit être saisi ici après vérification au BO.",
      ar: "الحد الأدنى لأجر العمال المنزليين: 60% من الحد الأدنى للأجر (القانون 19.12). أي رفع لاحق لهذه النسبة بمرسوم يجب إدخاله هنا بعد التحقق منه في الجريدة الرسمية.",
    },
  },
  {
    id: "suspension-2004",
    key: "seniority.suspension_assimilation",
    value: {
      illness: true,
      work_accident: true,
      maternity: true,
      military_service: false,
      strike: false,
      temporary_closure: true,
      unpaid_leave: false,
      disciplinary_suspension: false,
      other: false,
    },
    validFrom: LC_FROM,
    validTo: null,
    provisionIds: ["CT-54"],
    verification: "requires_legal_review",
    description: {
      fr: "Périodes comptées comme travail effectif pour l'indemnité (art. 54) : maladie, accident du travail, maternité, fermeture administrative. Grève, congé sans solde, mise à pied et service militaire ne sont pas listés. Modifiable période par période.",
      ar: "الفترات المعتبرة شغلا فعليا في التعويض (المادة 54): المرض، حادثة الشغل، الأمومة، الإغلاق الإداري. لا يشمل ذلك الإضراب والعطلة غير المؤدى عنها والتوقيف التأديبي والخدمة العسكرية. قابلة للتعديل لكل فترة.",
    },
  },
];

/* ------------------------------------------------------------------ paid holidays */

function holiday(
  id: string,
  fr: string,
  ar: string,
  kind: "civil" | "religious",
  fixedDate?: string,
  validFrom = LC_FROM,
  verification: PaidHoliday["verification"] = "corroborated",
): PaidHoliday {
  return { id, name: { fr, ar }, kind, fixedDate, validFrom, validTo: null, source: "Décret n° 2-04-426 du 29 décembre 2004 (BO n° 5280)", verification };
}

/** Décret n° 2-04-426 du 29 décembre 2004 (BO n° 5280 du 6 janvier 2005), as amended. 1 January is not on the private-sector list. */
export const PAID_HOLIDAYS: PaidHoliday[] = [
  holiday("independence-manifesto", "Manifeste de l'indépendance", "ذكرى تقديم وثيقة الاستقلال", "civil", "01-11"),
  { ...holiday("amazigh-new-year", "Nouvel an amazigh", "رأس السنة الأمازيغية", "civil", "01-14", "2024-01-01"), source: "Décret n° 2-23-1000 (2023) modifiant le décret 2-04-426" },
  holiday("labour-day", "Fête du travail", "عيد الشغل", "civil", "05-01"),
  holiday("throne", "Fête du Trône", "عيد العرش", "civil", "07-30"),
  holiday("oued-eddahab", "Allégeance de Oued Eddahab", "ذكرى استرجاع إقليم وادي الذهب", "civil", "08-14"),
  holiday("revolution", "Révolution du Roi et du Peuple", "ذكرى ثورة الملك والشعب", "civil", "08-20"),
  holiday("youth", "Fête de la Jeunesse", "عيد الشباب", "civil", "08-21"),
  {
    ...holiday("unity", "Fête de l'Unité", "عيد الوحدة", "civil", "10-31", "2026-02-05"),
    source: "Décret n° 2-26-14 du 27 janvier 2026 (BO n° 7480 du 5 février 2026)",
  },
  holiday("green-march", "Marche Verte", "ذكرى المسيرة الخضراء", "civil", "11-06"),
  holiday("independence", "Fête de l'Indépendance", "عيد الاستقلال", "civil", "11-18"),
  holiday("eid-fitr", "Aïd Al Fitr (1 jour)", "عيد الفطر (يوم واحد)", "religious"),
  holiday("eid-adha", "Aïd Al Adha (1 jour)", "عيد الأضحى (يوم واحد)", "religious"),
  holiday("muharram", "1er Moharrem", "فاتح محرم", "religious"),
  holiday("mawlid", "Aïd Al Mawlid", "عيد المولد النبوي", "religious"),
];

export const SEED_RULESET: LegalRuleSet = {
  schemaVersion: 1,
  version: "MA-2026.10-2",
  publishedAt: "2026-10-10T00:00:00.000Z",
  minimumWages: MINIMUM_WAGES,
  provisions: PROVISIONS,
  rules: RULES,
  paidHolidays: PAID_HOLIDAYS,
};
