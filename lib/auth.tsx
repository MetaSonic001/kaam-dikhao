"use client";

import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setTokenProvider } from "./api";
import type { Me } from "./types";

// Development only: NEXT_PUBLIC_DEV_USER=you@example.com signs you in without going through Clerk.
const DEV_USER = process.env.NODE_ENV !== "production" ? process.env.NEXT_PUBLIC_DEV_USER : undefined;

type Session = { user: { email: string | null } };
type AuthCtx = {
  ready: boolean;
  session: Session | null;
  /** Truthy when signed in. Requests fetch a fresh Clerk token themselves (see setTokenProvider). */
  token: string | null;
  me: Me | null;
  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ ready: false, session: null, token: null, me: null, refreshMe: async () => {}, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const [me, setMe] = useState<Me | null>(null);

  const signedIn = !!DEV_USER || !!isSignedIn;
  const token = DEV_USER ? `dev:${DEV_USER}` : isSignedIn ? "clerk" : null;
  const email = DEV_USER ?? user?.primaryEmailAddress?.emailAddress ?? null;

  useEffect(() => {
    setTokenProvider(DEV_USER ? null : () => getToken());
    return () => setTokenProvider(null);
  }, [getToken]);

  const refreshMe = useCallback(async () => {
    if (!token || (!DEV_USER && !isLoaded)) { setMe(null); return; }
    try { setMe(await api<Me>("/api/me", { token })); } catch { setMe(null); }
  }, [token, isLoaded]);
  useEffect(() => { void refreshMe(); }, [refreshMe]);

  const signOut = useCallback(async () => { await clerk.signOut({ redirectUrl: "/" }); setMe(null); }, [clerk]);

  const value = useMemo<AuthCtx>(
    () => ({ ready: !!DEV_USER || isLoaded, session: signedIn ? { user: { email } } : null, token, me, refreshMe, signOut }),
    [isLoaded, signedIn, email, token, me, refreshMe, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
