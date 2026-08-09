/**
 * Single source of truth for "who is signed in" on the client.
 *
 * Every surface that shows the user's name, username, membership level or
 * on-chain/ledger balances MUST read from here — never from a hardcoded demo
 * object. When nobody is signed in the hook returns `signedIn: false` and the
 * UI is expected to render a neutral guest state (not a fake production user).
 *
 * Data path: browser session (Supabase) -> getMyAccount() server fn -> RLS.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/idpi.functions";

export type AccountView = {
  loading: boolean;
  error: string | null;
  signedIn: boolean;
  /** Display name — falls back to the username, never to a demo person. */
  displayName: string;
  username: string | null;
  avatar: string | null;
  membership: string;
  memberId: string | null;
  roles: string[];
  isAdmin: boolean;
  isStaff: boolean;
  /** Authoritative balances from the ledger-backed wallet row. */
  piBalance: number;
  idpointsBalance: number;
  cashbackBalance: number;
  ledger: Array<Record<string, unknown>>;
};

const GUEST: AccountView = {
  loading: false,
  error: null,
  signedIn: false,
  displayName: "Guest",
  username: null,
  avatar: null,
  membership: "Bronze",
  memberId: null,
  roles: [],
  isAdmin: false,
  isStaff: false,
  piBalance: 0,
  idpointsBalance: 0,
  cashbackBalance: 0,
  ledger: [],
};

/** True once a Supabase session exists in this browser. */
function useHasSession(): boolean | null {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setHasSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return hasSession;
}

export function useAccount(): AccountView {
  const hasSession = useHasSession();
  const fetchAccount = useServerFn(getMyAccount);

  const query = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    enabled: hasSession === true,
    staleTime: 30_000,
    retry: 1,
  });

  if (hasSession !== true) {
    return { ...GUEST, loading: hasSession === null };
  }
  if (query.isPending) return { ...GUEST, loading: true, signedIn: true };
  if (query.error || !query.data) {
    return {
      ...GUEST,
      signedIn: true,
      error: query.error instanceof Error ? query.error.message : "Failed to load account",
    };
  }

  const { profile, wallet, roles, ledger } = query.data;
  const roleList = (roles ?? []).map(String);
  const username = profile?.username ?? null;

  return {
    loading: false,
    error: null,
    signedIn: true,
    displayName: username ?? profile?.email?.split("@")[0] ?? "Member",
    username,
    avatar: profile?.avatar ?? null,
    membership: profile?.membership_level ?? "Bronze",
    memberId: profile?.id ?? null,
    roles: roleList,
    isAdmin: roleList.includes("admin"),
    isStaff: roleList.includes("admin") || roleList.includes("moderator"),
    piBalance: Number(wallet?.pi_balance ?? 0),
    idpointsBalance: Number(wallet?.idpoints_balance ?? 0),
    cashbackBalance: Number(wallet?.cashback_balance ?? 0),
    ledger: (ledger ?? []) as Array<Record<string, unknown>>,
  };
}
