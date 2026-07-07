import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-2xl text-accent-fg">
            🔖
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">BookmarkAI</h1>
          <p className="mt-1 text-sm text-muted">
            Save a link. Get the summary, takeaways, and action items.
          </p>
        </div>
        <AuthForm inviteRequired={Boolean(process.env.SIGNUP_CODE)} />
      </div>
    </main>
  );
}
