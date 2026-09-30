import { redirect } from "next/navigation";

// Old links point here. Clerk hosts the sign-in UI at /sign-in.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  redirect(`/sign-in${next?.startsWith("/") ? `?redirect_url=${encodeURIComponent(next)}` : ""}`);
}
