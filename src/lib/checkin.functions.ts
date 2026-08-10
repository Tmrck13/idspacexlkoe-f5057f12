/**
 * Daily Check-In / IDPoints — server-side source of truth.
 *
 * The frontend never sends day, streak, reward amount or timestamps.
 * All of that is decided by the SECURITY DEFINER database routines
 * `daily_checkin_status()` and `claim_daily_checkin()`, which credit the
 * wallet exclusively through `post_ledger_entry` and record the claim in
 * `daily_checkin` + `idpoints` in the same transaction (idempotent per
 * user per UTC day via a unique constraint + advisory lock).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CheckinHistoryEntry = { day: number; amount: number; at: string };

export type CheckinStatus = {
  signedIn: boolean;
  canClaim: boolean;
  streak: number;
  nextDay: number;
  nextReward: number;
  cyclesCompleted: number;
  idpointsBalance: number;
  lastClaimAt: string | null;
  nextClaimAt: string | null;
  serverNow: string;
  rewards: number[];
  cycleDays: number;
  history: CheckinHistoryEntry[];
};

export type ClaimResult = CheckinStatus & {
  claimed: boolean;
  reason?: string;
  day?: number;
  amount?: number;
  cycleCompleted?: boolean;
};

export const getCheckinStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("daily_checkin_status");
    if (error) throw new Error(error.message);
    return data as unknown as CheckinStatus;
  });

export const claimDailyCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_daily_checkin");
    if (error) throw new Error(error.message);
    return data as unknown as ClaimResult;
  });
