import { requireUser } from "@/lib/auth";
import { Sidebar } from "./_components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar email={user.email} />
      {/* pt-20 clears the fixed mobile top bar; the sidebar sits in-flow at md+. */}
      <main className="min-w-0 flex-1 px-4 pb-8 pt-20 md:pt-8">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
