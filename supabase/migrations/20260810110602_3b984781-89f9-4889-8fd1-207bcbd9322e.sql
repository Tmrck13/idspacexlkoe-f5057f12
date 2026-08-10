-- Members must not be able to insert check-in rows themselves (self-granting rewards).
DROP POLICY IF EXISTS "own checkin insert" ON public.daily_checkin;

CREATE OR REPLACE FUNCTION public.checkin_reward_for_day(_day integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (ARRAY[180,360,540,900,1350,2070,3600])[greatest(1, least(7, _day))]::numeric;
$$;

-- Read-only status for the signed-in member.
CREATE OR REPLACE FUNCTION public.daily_checkin_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'utc')::date;
  _last public.daily_checkin;
  _streak int := 0;
  _next_day int := 1;
  _can boolean := true;
  _cycles int := 0;
  _balance numeric := 0;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('signedIn', false);
  END IF;

  SELECT * INTO _last FROM public.daily_checkin
   WHERE user_id = _uid ORDER BY checkin_date DESC LIMIT 1;

  SELECT count(*)::int INTO _cycles FROM public.daily_checkin
   WHERE user_id = _uid AND streak = 7;

  SELECT coalesce(idpoints_balance, 0) INTO _balance FROM public.wallets WHERE user_id = _uid;

  IF _last.id IS NOT NULL THEN
    _streak := _last.streak;
    IF _last.checkin_date = _today THEN
      _can := false;
      _next_day := CASE WHEN _last.streak >= 7 THEN 1 ELSE _last.streak + 1 END;
    ELSIF _last.checkin_date = _today - 1 AND _last.streak < 7 THEN
      _next_day := _last.streak + 1;
    ELSE
      _next_day := 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'signedIn', true,
    'canClaim', _can,
    'streak', _streak,
    'nextDay', _next_day,
    'nextReward', public.checkin_reward_for_day(_next_day),
    'cyclesCompleted', coalesce(_cycles, 0),
    'idpointsBalance', coalesce(_balance, 0),
    'lastClaimAt', _last.created_at,
    'nextClaimAt', ((_today + 1)::timestamp AT TIME ZONE 'utc'),
    'serverNow', now(),
    'rewards', to_jsonb(ARRAY[180,360,540,900,1350,2070,3600]),
    'cycleDays', 7,
    'history', coalesce((
      SELECT jsonb_agg(jsonb_build_object('day', d.streak, 'amount', d.reward_amount, 'at', d.created_at)
             ORDER BY d.created_at DESC)
      FROM (SELECT * FROM public.daily_checkin WHERE user_id = _uid
            ORDER BY checkin_date DESC LIMIT 14) d
    ), '[]'::jsonb)
  );
END;
$$;

-- Atomic claim: server decides day + amount, ledger records the credit.
CREATE OR REPLACE FUNCTION public.claim_daily_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'utc')::date;
  _last public.daily_checkin;
  _day int := 1;
  _amount numeric;
  _ledger_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Serialize concurrent claims for this user (prevents double reward on retry).
  PERFORM pg_advisory_xact_lock(hashtextextended('idpi.checkin', 0), hashtextextended(_uid::text, 0));

  SELECT * INTO _last FROM public.daily_checkin
   WHERE user_id = _uid ORDER BY checkin_date DESC LIMIT 1;

  IF _last.id IS NOT NULL AND _last.checkin_date = _today THEN
    RETURN public.daily_checkin_status() || jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  END IF;

  IF _last.id IS NOT NULL AND _last.checkin_date = _today - 1 AND _last.streak < 7 THEN
    _day := _last.streak + 1;
  ELSE
    _day := 1;
  END IF;

  _amount := public.checkin_reward_for_day(_day);

  _ledger_id := public.post_ledger_entry(
    _uid, 'DAILY_CHECKIN_REWARD', 'idpoints', _amount,
    'Daily check-in · Day ' || _day, 'success',
    'checkin:' || _uid::text || ':' || _today::text
  );

  INSERT INTO public.daily_checkin (user_id, checkin_date, streak, reward_currency, reward_amount, ledger_id)
  VALUES (_uid, _today, _day, 'idpoints', _amount, _ledger_id);

  INSERT INTO public.idpoints (user_id, ledger_id, event_type, amount, source, description)
  VALUES (_uid, _ledger_id, 'earn', _amount, 'daily_checkin', 'Daily check-in · Day ' || _day);

  RETURN public.daily_checkin_status() || jsonb_build_object(
    'claimed', true, 'day', _day, 'amount', _amount,
    'cycleCompleted', (_day = 7), 'ledgerId', _ledger_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_checkin() FROM public;
REVOKE ALL ON FUNCTION public.daily_checkin_status() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_daily_checkin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_checkin_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_reward_for_day(integer) TO authenticated;