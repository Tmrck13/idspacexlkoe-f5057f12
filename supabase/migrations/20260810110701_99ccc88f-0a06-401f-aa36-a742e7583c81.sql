REVOKE EXECUTE ON FUNCTION public.claim_daily_checkin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.daily_checkin_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.checkin_reward_for_day(integer) FROM anon, public;

CREATE OR REPLACE FUNCTION public.checkin_reward_for_day(_day integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (ARRAY[180,360,540,900,1350,2070,3600])[greatest(1, least(7, _day))]::numeric;
$$;

REVOKE EXECUTE ON FUNCTION public.checkin_reward_for_day(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.checkin_reward_for_day(integer) TO authenticated;