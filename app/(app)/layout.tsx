import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AppHistory } from "./_components/app-history";
import { Sidebar } from "./_components/sidebar";
import "./engage.css";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1">
      <Suspense fallback={null}>
        <Sidebar email={user.email} />
      </Suspense>
      {/* pt-20 clears the fixed mobile top bar; the sidebar sits in-flow at md+. */}
      <main className="min-w-0 flex-1 px-4 pb-8 pt-20 md:pt-8">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
      <AppHistory />
    </div>
  );
}
