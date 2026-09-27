import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AuthCard } from "@/components/midgard-app";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <main className="grid min-h-screen place-items-center text-parchment">Checking the gate…</main>;
  if (user) return <Navigate to="/" />;
  return (
    <main className="grid min-h-screen place-items-center bg-ink p-4">
      <AuthCard onReady={() => {}} />
    </main>
  );
}
