import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Check, Flame, Gift, Loader2, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionTitle } from "@/components/idspace/shell";
import { msUntil, useServerCheckin } from "@/lib/checkin-store";

export const Route = createFileRoute("/checkin")({
  component: CheckinPage,
  head: () => ({
    meta: [
      { title: "Daily Check-In — IDPI" },
      { name: "description", content: "Claim your daily IDPoints reward. 7-day streak up to 9,000 IDPoints." },
      { property: "og:title", content: "Daily Check-In — IDPI" },
      { property: "og:description", content: "Claim your daily IDPoints reward. 7-day streak up to 9,000 IDPoints." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function fmtCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function CheckinPage() {
  const { signedIn, loading, error, status, claiming, claim } = useServerCheckin();
  const [confetti, setConfetti] = useState(false);
  const [tick, setTick] = useState(0);

  // Live countdown tick — 1s interval. Time reference is the SERVER clock
  // (nextClaimAt/serverNow), never the device clock alone.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const rewards = status.rewards?.length ? status.rewards : [180, 360, 540, 900, 1350, 2070, 3600];
  const cycleDays = status.cycleDays || 7;
  const total = useMemo(() => rewards.reduce((a, b) => a + b, 0), [rewards]);
  const idrValue = Math.floor(total / 9);
  const nextReward = Number(status.nextReward || 0);
  const msLeft = useMemo(
    () => msUntil(status.nextClaimAt, status.serverNow),
    [status.nextClaimAt, status.serverNow, tick],
  );
  const canClaim = signedIn && status.canClaim;
  const progressPct = Math.min(100, (status.streak / cycleDays) * 100);

  const handleClaim = useCallback(async () => {
    if (!canClaim || claiming) return;
    try {
      // The server decides day + amount; the button sends nothing.
      const res = await claim();
      if (res.claimed) {
        toast.success(`+${Number(res.amount ?? 0).toLocaleString()} IDPoints (Day ${res.day})`);
        if (res.cycleCompleted) {
          setConfetti(true);
          setTimeout(() => setConfetti(false), 4000);
        }
      } else {
        toast.error("Already claimed. Come back later.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Claim failed. Please try again.");
    }
  }, [canClaim, claiming, claim]);

  return (
    <AppShell active="Check-In">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 text-center">
          <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI • Rewards</div>
          <h1 className="mt-1 font-display text-3xl gold-shimmer">Daily Check-In</h1>
          <p className="mt-2 text-xs text-emerald-100/60">
            Claim every day · Full 7-day cycle = <span className="gold-text">{total.toLocaleString()} IDPoints</span> (≈ Rp{idrValue.toLocaleString()})
          </p>
        </div>

        {!signedIn && !loading && (
          <div className="glass-card mb-4 p-4 text-center text-xs text-emerald-100/70">
            Sign in to claim your daily reward — balances and streaks are stored on your account.
          </div>
        )}
        {error && (
          <div className="glass-card mb-4 p-4 text-center text-xs" style={{ color: "#FF9F76" }}>
            {error}
          </div>
        )}

        {/* Streak overview */}
        <div className="glass-card p-4 lg:p-5 mb-4">
          <SectionTitle
            icon={<Flame className="h-4 w-4"/>}
            title="STREAK"
            right={
              <span className="text-[11px] gold-text">
                {status.streak}/{cycleDays} days · {status.cyclesCompleted} cycle{status.cyclesCompleted !== 1 ? "s" : ""} completed
              </span>
            }
          />
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="IDPoints" value={loading ? "…" : Number(status.idpointsBalance).toLocaleString()} color="#56FF76"/>
            <StatBox label="Current Streak" value={`${status.streak}/${cycleDays}`} color="#FFD76A"/>
            <StatBox label="Next Reward" value={`+${nextReward.toLocaleString()}`} color="#7CC3FF"/>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full"
               style={{ background: "rgba(5,8,6,.7)", border: "1px solid rgba(255,215,106,.2)" }}>
            <div className="h-full rounded-full transition-all duration-700"
                 style={{
                   width: `${progressPct}%`,
                   background: "linear-gradient(90deg,#FFD76A,#56FF76,#FFD76A)",
                   backgroundSize: "200% 100%",
                   animation: "shimmer 4s linear infinite",
                   boxShadow: "0 0 14px rgba(86,255,118,.4)",
                 }}/>
          </div>
          <div className="mt-1 text-right text-[10px] text-emerald-100/50">
            {progressPct.toFixed(0)}% of current cycle
          </div>
        </div>

        {/* Day grid */}
        <div className="glass-card p-4 lg:p-5 mb-4">
          <SectionTitle
            icon={<Gift className="h-4 w-4"/>}
            title="7-DAY REWARDS"
            right={loading ? <Loader2 className="h-3.5 w-3.5 animate-spin gold-text"/> : null}
          />
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {rewards.map((amt, i) => {
              const day = i + 1;
              const claimed = day <= status.streak;
              const isToday = day === status.nextDay && canClaim;
              const isCycleFinale = day === cycleDays;
              return (
                <div key={day}
                     className="relative flex flex-col items-center justify-center rounded-xl p-2 text-center transition"
                     style={{
                       background: claimed
                         ? "linear-gradient(180deg, rgba(86,255,118,.15), rgba(11,26,18,.9))"
                         : "rgba(5,8,6,.6)",
                       border: `1px solid ${
                         isToday ? "rgba(255,215,106,.8)"
                         : claimed ? "rgba(86,255,118,.5)"
                         : "rgba(255,215,106,.15)"
                       }`,
                       boxShadow: isToday ? "0 0 18px rgba(255,215,106,.35)" : undefined,
                     }}>
                  <div className="text-[10px] uppercase tracking-widest text-emerald-100/60">Day {day}</div>
                  <div className="mt-1 flex h-8 w-8 items-center justify-center">
                    {claimed ? (
                      <Check className="h-5 w-5" style={{ color: "#56FF76" }}/>
                    ) : isCycleFinale ? (
                      <Trophy className="h-5 w-5" style={{ color: "#FFD76A" }}/>
                    ) : (
                      <Sparkles className="h-4 w-4" style={{ color: "#FFD76A" }}/>
                    )}
                  </div>
                  <div className="text-[11px] font-bold" style={{ color: claimed ? "#56FF76" : "#FFD76A" }}>
                    +{amt.toLocaleString()}
                  </div>
                  {isToday && (
                    <span className="absolute -top-2 rounded-full px-2 py-0.5 text-[9px] font-bold text-black gold-shimmer"
                          style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}>
                      TODAY
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Claim panel */}
        <div className="relative rounded-2xl p-[1.5px] anim-pulse-glow"
             style={{
               background: "linear-gradient(120deg,#FFD76A,#56FF76,#FFD76A)",
               backgroundSize: "200% 200%",
               animation: "shimmer 6s linear infinite, pulseGlow 3.5s ease-in-out infinite",
             }}>
          <div className="rounded-[15px] glass-card p-5 text-center">
            <CalendarCheck className="mx-auto h-8 w-8" style={{ color: "#FFD76A" }}/>
            {loading ? (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-emerald-100/70">
                <Loader2 className="h-4 w-4 animate-spin"/> Loading your check-in…
              </div>
            ) : canClaim ? (
              <>
                <div className="mt-2 font-display text-xl gold-shimmer">
                  Day {status.nextDay} Reward Ready
                </div>
                <div className="mt-1 text-xs text-emerald-100/60">
                  Claim +{nextReward.toLocaleString()} IDPoints now
                </div>
              </>
            ) : (
              <>
                <div className="mt-2 font-display text-xl text-white">
                  {signedIn ? "Next Claim In" : "Sign in to claim"}
                </div>
                {signedIn && (
                  <>
                    <div className="mt-2 font-mono text-3xl gold-shimmer">{fmtCountdown(msLeft)}</div>
                    <div className="mt-1 text-xs text-emerald-100/60">
                      Day {status.nextDay} · +{nextReward.toLocaleString()} IDPoints
                    </div>
                  </>
                )}
              </>
            )}
            <button
              onClick={handleClaim}
              disabled={!canClaim || claiming}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-black transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(90deg,#FFD76A,#56FF76,#FFD76A)",
                backgroundSize: "200% 100%",
                animation: canClaim
                  ? "shimmer 5s linear infinite, pulseGlow 3.5s ease-in-out infinite"
                  : "none",
              }}
            >
              {claiming ? <Loader2 className="h-4 w-4 animate-spin"/> : <Gift className="h-4 w-4"/>}
              {claiming ? "Claiming…" : canClaim ? "Claim Reward" : signedIn ? "Come back later" : "Sign in required"}
            </button>
            {canClaim && status.nextDay === 1 && status.streak > 0 && (
              <div className="mt-2 text-[10px]" style={{ color: "#FF9F76" }}>
                Missed a day — the streak restarts at Day 1.
              </div>
            )}
            {status.lastClaimAt && (
              <div className="mt-2 text-[10px] text-emerald-100/45">
                Last claim: {new Date(status.lastClaimAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* History */}
        {signedIn && !loading && (
          <div className="glass-card p-4 lg:p-5 mt-4">
            <SectionTitle icon={<Flame className="h-4 w-4"/>} title="RECENT CLAIMS"/>
            {status.history.length === 0 ? (
              <div className="rounded-lg px-3 py-6 text-center text-xs text-emerald-100/50"
                   style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.12)" }}>
                No claims yet — your first check-in will appear here.
              </div>
            ) : (
              <ul className="space-y-2">
                {status.history.slice(0, 7).map((h) => (
                  <li key={h.at} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                      style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.12)" }}>
                    <span className="text-emerald-100/80">Day {h.day} · <span className="gold-text">+{Number(h.amount).toLocaleString()}</span> IDPoints</span>
                    <span className="text-emerald-100/50">{new Date(h.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {confetti && <Confetti/>}
    </AppShell>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3"
         style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.15)" }}>
      <div className="text-[10px] uppercase tracking-widest text-emerald-100/50">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

/* Lightweight CSS-only confetti burst */
function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 2 + Math.random() * 2,
      hue: [`#FFD76A`, `#56FF76`, `#7CC3FF`, `#FF9F76`][i % 4],
      size: 6 + Math.random() * 8,
      rot: Math.random() * 360,
    })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {pieces.map((p) => (
        <span key={p.id} className="absolute -top-4"
              style={{
                left: `${p.left}%`,
                width: p.size, height: p.size * 0.4,
                background: p.hue,
                transform: `rotate(${p.rot}deg)`,
                animation: `confettiFall ${p.dur}s ${p.delay}s linear forwards`,
                boxShadow: `0 0 6px ${p.hue}`,
              }}/>
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
