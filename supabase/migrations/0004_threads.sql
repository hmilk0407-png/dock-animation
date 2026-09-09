-- ============================================================
-- 0004_threads.sql
-- 依頼履歴に「会話のまとまり(スレッド)」と「回答全文」を追加する
--   thread_id     : 同じ会話に属する依頼は同じ値を持つ。
--                   「新しい依頼」で新しい値になり、履歴から「続きを依頼」すると引き継ぐ
--   response_text : 回答の全文 (従来の response_preview は一覧表示用に維持)
-- 既存行は行ごとに別々の thread_id が自動採番され、1件だけの会話として扱われる
-- Supabase ダッシュボード > SQL Editor に貼り付けて実行してください
-- ============================================================

alter table public.requests
  add column if not exists thread_id uuid not null default gen_random_uuid();

alter table public.requests
  add column if not exists response_text text;

create index if not exists requests_user_thread_idx
  on public.requests (user_id, thread_id, requested_at);
