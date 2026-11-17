import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AppHistory } from "./_components/app-history";
import { SectionSwipe } from "./_components/section-swipe";
import { Sidebar } from "./_components/sidebar";
import { OfflineBanner } from "./_components/offline-banner";
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
      {/* pt-20/pb-28 clear the fixed mobile top bar and bottom tab bar; the
          sidebar sits in-flow at md+. */}
      <main className="min-w-0 flex-1 px-4 pb-28 pt-20 md:pb-8 md:pt-8">
        <SectionSwipe>
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </SectionSwipe>
      </main>
      <AppHistory />
      <OfflineBanner />
    </div>
  );
}
