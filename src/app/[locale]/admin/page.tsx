import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { RulesAdmin } from "@/components/admin/rules-admin";
import { isLocale, translate } from "@/lib/i18n";
import { getActiveRuleSet, isAdminDevMode, listVersions } from "@/lib/server/rules-store";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: translate(isLocale(locale) ? locale : "ar", "admin.title"),
    robots: { index: false, follow: false },
  };
}

async function AdminWithData() {
  await connection();
  const [ruleSet, versions] = await Promise.all([getActiveRuleSet(), listVersions()]);
  return (
    <RulesAdmin
      initialRuleSet={ruleSet}
      initialVersions={versions.versions}
      initialActiveId={versions.activeVersionId}
      devMode={isAdminDevMode()}
      locked={!process.env.ADMIN_TOKEN && process.env.NODE_ENV === "production"}
    />
  );
}

export default function AdminPage() {
  return (
    <>
      <AppHeader />
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-[1400px] px-4 pt-6 sm:px-6" aria-busy="true">
            <div className="h-24 animate-pulse rounded-xl border bg-card" />
            <div className="mt-4 h-96 animate-pulse rounded-xl border bg-card" />
          </div>
        }
      >
        <AdminWithData />
      </Suspense>
    </>
  );
}
