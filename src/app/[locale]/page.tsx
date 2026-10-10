import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { Calculator } from "@/components/calculator/calculator";
import { loadRuleSetForRender } from "@/lib/server/render-rules";

async function CalculatorWithRules() {
  const ruleSet = await loadRuleSetForRender();
  return <Calculator ruleSet={ruleSet} />;
}

function CalculatorSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[5fr_6fr]" aria-busy="true">
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-xl border bg-card" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl border bg-card" />
    </div>
  );
}

export default function Page() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={<CalculatorSkeleton />}>
        <CalculatorWithRules />
      </Suspense>
    </>
  );
}
