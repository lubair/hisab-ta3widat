import type { Metadata } from "next";
import { BASE_PATH, IS_STATIC_EXPORT } from "@/lib/deployment";
import { DEFAULT_LOCALE, translate } from "@/lib/i18n";

const target = `${BASE_PATH}/${DEFAULT_LOCALE}${IS_STATIC_EXPORT ? "/" : ""}`;

export const metadata: Metadata = {
  title: translate(DEFAULT_LOCALE, "app.title"),
  icons: { icon: `${BASE_PATH}/favicon.ico` },
};

/** Static hosts cannot apply the `/` redirect from next.config.ts, so the root page forwards instead. */
export default function RootRedirect() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${target}`} />
      <main className="flex min-h-screen items-center justify-center p-6">
        <a href={target} className="text-lg font-semibold text-primary underline underline-offset-4">
          {translate(DEFAULT_LOCALE, "app.title")}
        </a>
      </main>
    </>
  );
}
