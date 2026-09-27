import { createFileRoute } from "@tanstack/react-router";
import { MidgardApp } from "@/components/midgard-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <MidgardApp />;
}
