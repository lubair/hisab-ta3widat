"use client";

import { AlertTriangle, ExternalLink, History, KeyRound, Landmark, Plus, RotateCcw, Save, ScrollText, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AnyRuleEntry, LegalRuleSet, MinimumWageEntry, VerificationStatus } from "@/lib/legal/rules/schema";
import { validateRuleSet, type ValidationIssue } from "@/lib/legal/rules/validate";
import type { VersionMeta } from "@/lib/server/rules-store";
import { cn } from "@/lib/utils";

interface Props {
  initialRuleSet: LegalRuleSet;
  initialVersions: VersionMeta[];
  initialActiveId: string;
  devMode: boolean;
  locked: boolean;
}

const VERIFICATION: VerificationStatus[] = ["verified", "corroborated", "requires_legal_review"];

function MiniSelect<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <Select items={options} value={value} onValueChange={(v) => v !== null && onChange(v as T)}>
      <SelectTrigger aria-label={label} className={cn("h-8 w-full min-w-0 text-xs", className)}>
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
  );
}

function IssueCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ms-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-5 text-white tabular">
      {count}
    </span>
  );
}

function VerificationBadge({ status }: { status: VerificationStatus }) {
  const { t } = useI18n();
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap",
        status === "verified" && "border-success/40 text-success",
        status === "corroborated" && "border-primary/30 text-primary",
        status === "requires_legal_review" && "border-warning/50 text-warning",
      )}
    >
      {t(`results.verification.${status}`)}
    </Badge>
  );
}

function RuleEditor({
  rule,
  onChange,
  onDelete,
  isInvalid,
}: {
  rule: AnyRuleEntry;
  onChange: (rule: AnyRuleEntry) => void;
  onDelete: () => void;
  isInvalid: (field: string) => true | undefined;
}) {
  const { t, locale } = useI18n();
  const [text, setText] = useState(() => JSON.stringify(rule.value, null, 2));
  const [jsonError, setJsonError] = useState(false);
  const verificationOptions = VERIFICATION.map((v) => ({ value: v, label: t(`results.verification.${v}`) }));

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold" dir="ltr">
          {rule.id}
        </code>
        <VerificationBadge status={rule.verification} />
        <Button variant="ghost" size="sm" className="ms-auto text-destructive" onClick={onDelete}>
          <Trash2 aria-hidden />
          {t("admin.delete")}
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{rule.description[locale]}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("admin.minwage.from")}</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={rule.validFrom}
            aria-invalid={isInvalid("validFrom")}
            onChange={(e) => onChange({ ...rule, validFrom: e.target.value } as AnyRuleEntry)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("admin.minwage.to")}</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={rule.validTo ?? ""}
            aria-invalid={isInvalid("validTo")}
            onChange={(e) => onChange({ ...rule, validTo: e.target.value || null } as AnyRuleEntry)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("admin.verification")}</Label>
          <MiniSelect
            label={t("admin.verification")}
            value={rule.verification}
            options={verificationOptions}
            onChange={(v) => onChange({ ...rule, verification: v } as AnyRuleEntry)}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <Label className="text-xs">{t("admin.rule.value")}</Label>
        <Textarea
          dir="ltr"
          spellCheck={false}
          value={text}
          aria-invalid={jsonError || undefined}
          className="min-h-28 font-mono text-xs"
          onChange={(e) => {
            setText(e.target.value);
            try {
              const value = JSON.parse(e.target.value);
              setJsonError(false);
              onChange({ ...rule, value } as AnyRuleEntry);
            } catch {
              setJsonError(true);
            }
          }}
        />
        {jsonError ? <p className="text-xs text-destructive">{t("admin.rule.invalidJson")}</p> : null}
      </div>
    </div>
  );
}

export function RulesAdmin({ initialRuleSet, initialVersions, initialActiveId, devMode, locked }: Props) {
  const { t, locale, date } = useI18n();
  const [base, setBase] = useState(initialRuleSet);
  const [draft, setDraft] = useState<LegalRuleSet>(() => structuredClone(initialRuleSet));
  const [editorKey, setEditorKey] = useState(0);
  const [versions, setVersions] = useState(initialVersions);
  const [activeId, setActiveId] = useState(initialActiveId);
  const [token, setToken] = useState("");
  const [author, setAuthor] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [serverIssues, setServerIssues] = useState<ValidationIssue[]>([]);
  const [busy, setBusy] = useState(false);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(base), [draft, base]);
  const issues = useMemo(() => validateRuleSet(draft), [draft]);
  const allIssues = issues.length ? issues : serverIssues;
  const canSave = !locked && dirty && issues.length === 0 && confirmed && note.trim().length > 0 && !busy;
  const invalidPaths = useMemo(() => new Set(allIssues.map((i) => i.path)), [allIssues]);
  const isInvalid = (path: string): true | undefined => (invalidPaths.has(path) ? true : undefined);
  const issueCount = (prefix: string) => allIssues.filter((i) => i.path.startsWith(prefix)).length;
  const rowHasIssue = (prefix: string) => allIssues.some((i) => i.path.startsWith(prefix));

  const sectorOptions = [
    { value: "non_agricultural" as const, label: t("form.sector.non_agricultural") },
    { value: "agricultural" as const, label: t("form.sector.agricultural") },
  ];
  const verificationOptions = VERIFICATION.map((v) => ({ value: v, label: t(`results.verification.${v}`) }));

  const rulesByKey = useMemo(() => {
    const groups = new Map<string, { rule: AnyRuleEntry; index: number }[]>();
    draft.rules.forEach((rule, index) => {
      const list = groups.get(rule.key) ?? [];
      list.push({ rule, index });
      groups.set(rule.key, list);
    });
    return [...groups.entries()];
  }, [draft.rules]);

  function updateWage(index: number, patch: Partial<MinimumWageEntry>) {
    setDraft((d) => {
      const minimumWages = d.minimumWages.map((w, i) => {
        if (i !== index) return w;
        const next = { ...w, ...patch };
        if (patch.sector) next.unit = patch.sector === "agricultural" ? "day" : "hour";
        return next;
      });
      return { ...d, minimumWages };
    });
  }

  function addWage() {
    setDraft((d) => ({
      ...d,
      minimumWages: [
        ...d.minimumWages,
        {
          id: `mw-${Date.now().toString(36)}`,
          sector: "non_agricultural",
          unit: "hour",
          amount: "",
          validFrom: "",
          validTo: null,
          decree: "",
          officialUrl: "https://",
          verification: "requires_legal_review",
        },
      ],
    }));
  }

  function addRulePeriod(key: string) {
    setDraft((d) => {
      const latest = [...d.rules].reverse().find((r) => r.key === key);
      if (!latest) return d;
      const copy = structuredClone(latest);
      copy.id = `${key.replace(/\./g, "-")}-${Date.now().toString(36)}`;
      copy.validFrom = "";
      copy.validTo = null;
      copy.verification = "requires_legal_review";
      return { ...d, rules: [...d.rules, copy] };
    });
  }

  async function refresh() {
    const res = await fetch("/api/rules", { cache: "no-store" });
    const data = (await res.json()) as { ruleSet: LegalRuleSet; versions: VersionMeta[]; activeVersionId: string };
    setBase(data.ruleSet);
    setDraft(structuredClone(data.ruleSet));
    setEditorKey((k) => k + 1);
    setVersions(data.versions);
    setActiveId(data.activeVersionId);
  }

  async function save() {
    setBusy(true);
    setServerIssues([]);
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ ruleSet: draft, note, author, officialSourceConfirmed: confirmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; issues?: ValidationIssue[] };
      if (!res.ok) {
        if (data.issues) setServerIssues(data.issues);
        toast.error(`${t("admin.saveError")} (${res.status === 401 || res.status === 403 ? t("admin.unauthorized") : data.error ?? res.status})`);
        return;
      }
      toast.success(t("admin.saved"));
      setNote("");
      setConfirmed(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function restore(id: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/rules/restore", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error(`${t("admin.saveError")} (${res.status === 401 || res.status === 403 ? t("admin.unauthorized") : res.status})`);
        return;
      }
      toast.success(t("admin.restored"));
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("admin.title")}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{t("admin.desc")}</p>
      </div>

      {locked ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle aria-hidden />
          <AlertTitle>{t("admin.locked.title")}</AlertTitle>
          <AlertDescription>{t("admin.locked.desc")}</AlertDescription>
        </Alert>
      ) : devMode ? (
        <Alert className="mt-4 border-warning/40 bg-warning/5">
          <AlertTriangle className="text-warning" aria-hidden />
          <AlertTitle>{t("admin.devMode.title")}</AlertTitle>
          <AlertDescription>{t("admin.devMode")}</AlertDescription>
        </Alert>
      ) : null}

      {allIssues.length > 0 ? (
        <Alert variant="destructive" className="mt-4" role="status">
          <AlertTriangle aria-hidden />
          <AlertTitle>{t("admin.issues", { count: allIssues.length })}</AlertTitle>
          <AlertDescription>{t("admin.issues.hint")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Tabs defaultValue="minwage" className="min-w-0">
          <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
            <TabsTrigger value="minwage" className="px-3 py-1.5">
              <Landmark aria-hidden />
              {t("admin.tab.minwage")}
              <IssueCount count={issueCount("minimumWages")} />
            </TabsTrigger>
            <TabsTrigger value="rules" className="px-3 py-1.5">
              <ScrollText aria-hidden />
              {t("admin.tab.rules")}
              <IssueCount count={issueCount("rules")} />
            </TabsTrigger>
            <TabsTrigger value="provisions" className="px-3 py-1.5">
              <ScrollText aria-hidden />
              {t("admin.tab.provisions")}
              <IssueCount count={issueCount("provisions")} />
            </TabsTrigger>
            <TabsTrigger value="history" className="px-3 py-1.5">
              <History aria-hidden />
              {t("admin.tab.history")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="minwage">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.tab.minwage")}</CardTitle>
                <CardDescription>{t("admin.minwage.desc")}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="w-max min-w-full text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36">{t("admin.minwage.sector")}</TableHead>
                      <TableHead className="w-28">{t("admin.minwage.amount")}</TableHead>
                      <TableHead className="w-36">{t("admin.minwage.from")}</TableHead>
                      <TableHead className="w-36">{t("admin.minwage.to")}</TableHead>
                      <TableHead>{t("admin.minwage.decree")}</TableHead>
                      <TableHead>{t("admin.minwage.bo")}</TableHead>
                      <TableHead>{t("admin.minwage.url")}</TableHead>
                      <TableHead className="w-44">{t("admin.verification")}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draft.minimumWages.map((w, i) => (
                      <TableRow key={w.id} className={cn("align-top", rowHasIssue(`minimumWages[${i}].`) && "bg-destructive/5")}>
                        <TableCell>
                          <MiniSelect label={t("admin.minwage.sector")} value={w.sector} options={sectorOptions} onChange={(v) => updateWage(i, { sector: v })} className="w-44" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" dir="ltr">
                            <Input
                              inputMode="decimal"
                              className="h-8 w-24 text-xs tabular"
                              value={w.amount}
                              aria-label={t("admin.minwage.amount")}
                              aria-invalid={isInvalid(`minimumWages[${i}].amount`)}
                              onChange={(e) => updateWage(i, { amount: e.target.value.replace(",", ".").trim() })}
                            />
                            <span className="shrink-0 text-[11px] text-muted-foreground">/{t(`admin.minwage.unit.${w.unit}`)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input type="date" className="h-8 w-36 text-xs" value={w.validFrom} aria-label={t("admin.minwage.from")} aria-invalid={isInvalid(`minimumWages[${i}].validFrom`)} onChange={(e) => updateWage(i, { validFrom: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input type="date" className="h-8 w-36 text-xs" value={w.validTo ?? ""} aria-label={t("admin.minwage.to")} aria-invalid={isInvalid(`minimumWages[${i}].validTo`)} onChange={(e) => updateWage(i, { validTo: e.target.value || null })} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-8 w-72 text-xs" value={w.decree} aria-label={t("admin.minwage.decree")} aria-invalid={isInvalid(`minimumWages[${i}].decree`)} onChange={(e) => updateWage(i, { decree: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-8 w-60 text-xs" value={w.bulletinOfficiel ?? ""} aria-label={t("admin.minwage.bo")} onChange={(e) => updateWage(i, { bulletinOfficiel: e.target.value || undefined })} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input dir="ltr" className="h-8 w-64 text-xs" value={w.officialUrl} aria-label={t("admin.minwage.url")} aria-invalid={isInvalid(`minimumWages[${i}].officialUrl`)} onChange={(e) => updateWage(i, { officialUrl: e.target.value.trim() })} />
                            {/^https:\/\/\S+$/.test(w.officialUrl) ? (
                              <a href={w.officialUrl} target="_blank" rel="noreferrer noopener" className="text-muted-foreground hover:text-primary" aria-label={t("admin.open")}>
                                <ExternalLink className="size-3.5" />
                              </a>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <MiniSelect label={t("admin.verification")} value={w.verification} options={verificationOptions} onChange={(v) => updateWage(i, { verification: v })} className="w-52" />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("admin.delete")}
                            onClick={() => setDraft((d) => ({ ...d, minimumWages: d.minimumWages.filter((_, j) => j !== i) }))}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button variant="outline" size="sm" className="mt-3" onClick={addWage}>
                  <Plus aria-hidden />
                  {t("admin.minwage.add")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <div className="flex flex-col gap-4" key={editorKey}>
              {rulesByKey.map(([key, entries]) => (
                <Card key={key} size="sm">
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      <code className="text-sm" dir="ltr">
                        {key}
                      </code>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {issueCount(`rules.${key}`) > 0 ? (
                      <p className="text-xs font-medium text-destructive">{t("admin.rule.overlap")}</p>
                    ) : null}
                    {entries.map(({ rule, index }) => (
                      <RuleEditor
                        key={rule.id}
                        rule={rule}
                        onChange={(next) => setDraft((d) => ({ ...d, rules: d.rules.map((r, j) => (j === index ? next : r)) }))}
                        onDelete={() => setDraft((d) => ({ ...d, rules: d.rules.filter((_, j) => j !== index) }))}
                        isInvalid={(field) => isInvalid(`rules[${index}].${field}`)}
                      />
                    ))}
                    <Button variant="outline" size="sm" className="w-fit" onClick={() => addRulePeriod(key)}>
                      <Plus aria-hidden />
                      {t("admin.rule.add")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="provisions">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.tab.provisions")}</CardTitle>
                <CardDescription>{t("admin.provisions.desc")}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="w-max min-w-full text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">{t("admin.provision.id")}</TableHead>
                      <TableHead>{t("admin.provision.title")}</TableHead>
                      <TableHead className="w-36">{t("admin.minwage.from")}</TableHead>
                      <TableHead>{t("admin.minwage.url")}</TableHead>
                      <TableHead className="w-44">{t("admin.verification")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draft.provisions.map((p, i) => (
                      <TableRow key={p.id} className="align-top">
                        <TableCell>
                          <code dir="ltr">{p.id}</code>
                        </TableCell>
                        <TableCell className="min-w-80 max-w-md whitespace-normal">
                          <span className="font-medium">{p.title[locale]}</span>
                          <span className="mt-0.5 block text-muted-foreground">{p.summary[locale]}</span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            className="h-8 w-36 text-xs"
                            value={p.validFrom}
                            aria-label={t("admin.minwage.from")}
                            onChange={(e) => setDraft((d) => ({ ...d, provisions: d.provisions.map((x, j) => (j === i ? { ...x, validFrom: e.target.value } : x)) }))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            dir="ltr"
                            className="h-8 w-72 text-xs"
                            value={p.officialUrl}
                            aria-label={t("admin.minwage.url")}
                            aria-invalid={isInvalid(`provisions.${p.id}.officialUrl`)}
                            onChange={(e) => setDraft((d) => ({ ...d, provisions: d.provisions.map((x, j) => (j === i ? { ...x, officialUrl: e.target.value.trim() } : x)) }))}
                          />
                        </TableCell>
                        <TableCell>
                          <MiniSelect
                            className="w-52"
                            label={t("admin.verification")}
                            value={p.verification}
                            options={verificationOptions}
                            onChange={(v) => setDraft((d) => ({ ...d, provisions: d.provisions.map((x, j) => (j === i ? { ...x, verification: v } : x)) }))}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.tab.history")}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-[640px] text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.version")}</TableHead>
                      <TableHead>{t("admin.date")}</TableHead>
                      <TableHead>{t("admin.author")}</TableHead>
                      <TableHead>{t("admin.note")}</TableHead>
                      <TableHead className="w-28" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((v) => (
                      <TableRow key={v.id} className="align-top">
                        <TableCell>
                          <code dir="ltr" className="font-semibold">
                            {v.rulesVersion}
                          </code>
                          {v.id === activeId ? <Badge className="ms-2">{t("admin.current")}</Badge> : null}
                        </TableCell>
                        <TableCell className="tabular">{date(v.createdAt.slice(0, 10))}</TableCell>
                        <TableCell>{v.author}</TableCell>
                        <TableCell className="max-w-md whitespace-normal">{v.note}</TableCell>
                        <TableCell>
                          {v.id !== activeId ? (
                            <Button variant="outline" size="sm" disabled={busy || locked} onClick={() => restore(v.id)}>
                              <RotateCcw aria-hidden />
                              {t("admin.restore")}
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="size-4 text-primary" aria-hidden />
                {t("admin.publish")}
              </CardTitle>
              <CardDescription>
                {t("admin.activeVersion")}: <code dir="ltr">{base.version}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {!devMode ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin-token" className="flex items-center gap-1.5 text-xs">
                    <KeyRound className="size-3.5" aria-hidden />
                    {t("admin.token")}
                  </Label>
                  <Input id="admin-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">{t("admin.token.help")}</p>
                </div>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rules-version" className="text-xs">
                  {t("admin.rulesVersion")}
                </Label>
                <Input id="rules-version" dir="ltr" aria-invalid={isInvalid("version")} value={draft.version} onChange={(e) => setDraft((d) => ({ ...d, version: e.target.value.trim() }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rules-author" className="text-xs">
                  {t("admin.author")}
                </Label>
                <Input id="rules-author" value={author} maxLength={120} onChange={(e) => setAuthor(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rules-note" className="text-xs">
                  {t("admin.note")}
                </Label>
                <Textarea id="rules-note" value={note} maxLength={2000} placeholder={t("admin.note.placeholder")} onChange={(e) => setNote(e.target.value)} />
              </div>
              <label className="flex items-start gap-2 text-xs leading-relaxed">
                <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} className="mt-0.5" />
                <span>{t("admin.officialConfirm")}</span>
              </label>

              {allIssues.length > 0 ? (
                <Alert variant="destructive">
                  <AlertTriangle aria-hidden />
                  <AlertTitle>{t("admin.issues", { count: allIssues.length })}</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-1 max-h-40 list-disc overflow-y-auto ps-4 text-[11px]" dir="ltr">
                      {allIssues.slice(0, 20).map((issue) => (
                        <li key={`${issue.path}-${issue.message}`}>
                          <code>{issue.path}</code>: {issue.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex gap-2">
                <Button className="flex-1" disabled={!canSave} onClick={save}>
                  <Save aria-hidden />
                  {t("admin.save")}
                </Button>
                <Button
                  variant="outline"
                  disabled={!dirty || busy}
                  aria-label={t("admin.discard")}
                  onClick={() => {
                    setDraft(structuredClone(base));
                    setEditorKey((k) => k + 1);
                    setServerIssues([]);
                  }}
                >
                  <Undo2 aria-hidden />
                </Button>
              </div>
              {dirty ? <p className="text-[11px] font-medium text-warning">{t("admin.unsaved")}</p> : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
