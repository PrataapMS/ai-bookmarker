import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { AppHistory } from "./_components/app-history";
import { NavTracker } from "./_components/nav-tracker";
import { SectionSwipe } from "./_components/section-swipe";
import { Sidebar } from "./_components/sidebar";
import { NavSkeleton } from "./_components/nav-skeleton";
import { OfflineBanner } from "./_components/offline-banner";
import "./engage.css";

// Signed-out visitors are sent to /login by proxy.ts; each page also checks
// the session itself (requireUser), so this layout needs no request data and
// its chrome is part of the prerendered static shell.

async function AccountEmail() {
  const user = await getCurrentUser();
  return user ? <span title={user.email}>{user.email}</span> : null;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1">
      <Suspense fallback={<NavSkeleton />}>
        <Sidebar
          account={
            <Suspense fallback={null}>
              <AccountEmail />
            </Suspense>
          }
        />
      </Suspense>
      {/* pt-20/pb-28 clear the fixed mobile top bar and bottom tab bar; the
          sidebar sits in-flow at md+. */}
      <main className="min-w-0 flex-1 px-4 pb-28 pt-20 md:pb-8 md:pt-8">
        <SectionSwipe>
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </SectionSwipe>
      </main>
      <AppHistory />
      <Suspense fallback={null}>
        <NavTracker />
      </Suspense>
      <OfflineBanner />
    </div>
  );
}
