-- ============================================================
-- BUHI WORKS 初期スキーマ
-- Supabase ダッシュボード > SQL Editor に貼り付けて実行してください
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- 専門家 (ユーザーごとのチーム) ----------
create table if not exists public.experts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug        text not null,                       -- 'secretary' 等の安定キー / custom-xxxx
  name        text not null,
  specialty   text not null,
  prompt      text not null,                       -- 指示書
  coat        text not null default 'white',
  accessory   text not null default 'glasses',
  is_default  boolean not null default false,
  photo_url   text,                                -- Storage 公開URL (ユーザー設定写真)
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, slug)
);

-- ---------- 依頼履歴 ----------
create table if not exists public.requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expert_slug      text not null,
  expert_name      text not null,                  -- 削除された専門家でも表示できるよう非正規化
  specialty        text not null,
  request_text     text not null default '',
  attachments      jsonb not null default '[]'::jsonb,  -- 添付ファイル名の配列
  response_preview text,
  artifact_url     text,                           -- 成果物URL (後付け登録可)
  status           text not null default 'waiting'
                   check (status in ('waiting','done','error')),
  requested_at     timestamptz not null default now()
);

create index if not exists requests_user_time_idx
  on public.requests (user_id, requested_at desc);

-- ---------- RLS: 自分の行のみ読み書き可能 ----------
alter table public.experts  enable row level security;
alter table public.requests enable row level security;

create policy "experts_select_own" on public.experts
  for select using (auth.uid() = user_id);
create policy "experts_insert_own" on public.experts
  for insert with check (auth.uid() = user_id);
create policy "experts_update_own" on public.experts
  for update using (auth.uid() = user_id);
create policy "experts_delete_own" on public.experts
  for delete using (auth.uid() = user_id);

create policy "requests_select_own" on public.requests
  for select using (auth.uid() = user_id);
create policy "requests_insert_own" on public.requests
  for insert with check (auth.uid() = user_id);
create policy "requests_update_own" on public.requests
  for update using (auth.uid() = user_id);
create policy "requests_delete_own" on public.requests
  for delete using (auth.uid() = user_id);

-- ---------- Storage: 専門家写真 (avatars バケット) ----------
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- 誰でも閲覧可 / 書き込みは自分のフォルダ (avatars/{uid}/...) のみ
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
