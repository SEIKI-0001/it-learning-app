-- GF-P0-006: 配信枠の予約を冪等にする。
--
-- なぜ要るか:
--   本番の PostgREST が 504 を返すことがあり、予約の INSERT もこれに当たる。
--   実際に「判定は全て通り、送信直前の再確認も通り、予約の書き込みだけが 504」で
--   通知が出せなかった（2026-09-14 18:00 JST）。
--
--   読み取りはリトライで回復できるが、INSERT は素直に再試行できない。
--   504 は「実際には挿入されたが応答だけ失われた」場合を含むため、再試行すると
--   主キー衝突になり「その日はもう扱った」と誤判定して送らなくなる。
--
--   そこで予約を1つの関数にまとめ、何度呼んでも同じ結果になるようにする。
--   直前の試行が作った pending は自分のものとして引き継ぎ、sent / failed は
--   「その日はもう扱った」として送らない。
--
-- 重複送信の防止は従来どおり主キー (user_id, notification_type, local_date) が担う。
-- この関数はその上で「応答を失っただけの再試行」を通すだけで、判定は変えない。
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function public.reserve_notification_delivery(
  p_user_id uuid,
  p_notification_type text,
  p_local_date date
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status text;
begin
  insert into public.notification_deliveries (user_id, notification_type, local_date, status)
  values (p_user_id, p_notification_type, p_local_date, 'pending')
  on conflict (user_id, notification_type, local_date) do nothing;

  if found then
    return true;
  end if;

  select delivery.status
  into v_status
  from public.notification_deliveries delivery
  where delivery.user_id = p_user_id
    and delivery.notification_type = p_notification_type
    and delivery.local_date = p_local_date;

  -- pending は応答を失った自分の予約。sent / failed はその日すでに扱っている。
  return v_status = 'pending';
end;
$$;

alter function public.reserve_notification_delivery(uuid, text, date) owner to postgres;
revoke all on function public.reserve_notification_delivery(uuid, text, date) from public;
revoke all on function public.reserve_notification_delivery(uuid, text, date) from anon;
revoke all on function public.reserve_notification_delivery(uuid, text, date) from authenticated;
revoke all on function public.reserve_notification_delivery(uuid, text, date) from service_role;
grant execute on function public.reserve_notification_delivery(uuid, text, date) to service_role;

comment on function public.reserve_notification_delivery(uuid, text, date) is
  'GF-P0-006 idempotent reservation of one delivery slot. Safe to retry after a lost response: it reclaims its own pending row and refuses rows already sent or failed.';
