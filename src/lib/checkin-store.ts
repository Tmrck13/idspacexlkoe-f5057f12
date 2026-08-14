/**
 * Client hook for the server-side Daily Check-In.
 *
 * Nothing here decides eligibility, streak or reward — it only renders what
 * the server returned and asks the server to claim. localStorage is NOT
 * consulted for balance, streak or last-claim time.
 */
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { claimDailyCheckin, getCheckinStatus, type CheckinStatus, type ClaimResult } from "@/lib/checkin.functions";

const DEFAULT_REWARDS = [180, 360, 540, 900, 1350, 2070, 3600];

export const GUEST_STATUS: CheckinStatus = {
  signedIn: false,
  canClaim: false,
  streak: 0,
  nextDay: 1,
  nextReward: DEFAULT_REWARDS[0]!,
  cyclesCompleted: 0,
  idpointsBalance: 0,
  lastClaimAt: null,
  nextClaimAt: null,
  serverNow: new Date().toISOString(),
  rewards: DEFAULT_REWARDS,
  cycleDays: 7,
  history: [],
};

function useHasSession(): boolean | null {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setHasSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setHasSession(!!session));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return hasSession;
}

export function useServerCheckin() {
  const hasSession = useHasSession();
  const fetchStatus = useServerFn(getCheckinStatus);
  const claimFn = useServerFn(claimDailyCheckin);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["checkin-status"],
    queryFn: () => fetchStatus(),
    enabled: hasSession === true,
    staleTime: 15_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: () => claimFn() as Promise<ClaimResult>,
    onSuccess: (res) => {
      qc.setQueryData(["checkin-status"], res);
      // wallet balance changed -> refresh the account view too
      void qc.invalidateQueries({ queryKey: ["my-account"] });
    },
  });

  const status: CheckinStatus =
    hasSession === true && query.data ? query.data : { ...GUEST_STATUS, signedIn: hasSession === true };

  const claim = useCallback(async () => mutation.mutateAsync(), [mutation]);

  return {
    signedIn: hasSession === true,
    loading: hasSession === null || (hasSession === true && query.isPending),
    error: query.error instanceof Error ? query.error.message : null,
    status,
    claiming: mutation.isPending,
    claim,
    refetch: query.refetch,
  };
}

/** ms until the server-provided next claim time, measured against the server clock offset. */
export function msUntil(nextClaimAt: string | null, serverNow: string): number {
  if (!nextClaimAt) return 0;
  const offset = Date.now() - new Date(serverNow).getTime();
  return Math.max(0, new Date(nextClaimAt).getTime() - (Date.now() - offset));
}
