-- ============================================================
-- 0003_calendar_days.sql
-- Google カレンダー(Apps Script) から届いた「今日の予定」の保管庫
--   書き込み: /api/calendar/ingest (service role) のみ
--   読み取り: ログイン済みユーザー
-- Supabase ダッシュボード > SQL Editor に貼り付けて実行してください
-- ============================================================

create table if not exists public.calendar_days (
  day           date primary key,                  -- 'YYYY-MM-DD' (日本時間)
  events        jsonb not null default '[]'::jsonb,-- [{title,start,end,allDay,location}]
  greeting      text,                              -- ミルクの朝の一言 (キャッシュ)
  greeting_hash text,                              -- greeting 生成時の events ハッシュ
  received_at   timestamptz not null default now()
);

alter table public.calendar_days enable row level security;

-- 読み取りはログイン済みユーザーのみ。書き込みポリシーは作らない
-- (anon / authenticated は書けない。ingest API は service role で書く)
drop policy if exists "calendar_days_read_authenticated" on public.calendar_days;
create policy "calendar_days_read_authenticated"
  on public.calendar_days for select
  to authenticated
  using (true);
