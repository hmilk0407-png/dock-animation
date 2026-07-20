-- ============================================================
-- 0002_attachments_bucket.sql
-- BUHI WORKS 添付ファイルの Supabase Storage 永続化
--   bucket "attachments" を作成し、
--   保存パスは `${uuid}/${originalName}` (アプリ側で生成)
-- ============================================================

-- 公開読み取り可のバケット (Anthropic API がURLを取得できる必要があるため public)
-- ※ 機微データを扱う場合は下部の注記を参照し、署名URL方式への切替を検討すること
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- 読み取り: 公開 (バケットpublic=trueと併せ、URLを知っていれば誰でも取得可能)
drop policy if exists "attachments public read" on storage.objects;
create policy "attachments public read"
  on storage.objects for select
  using (bucket_id = 'attachments');

-- 追加: 認証済みユーザーのみ
drop policy if exists "attachments authenticated insert" on storage.objects;
create policy "attachments authenticated insert"
  on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

-- 更新: 認証済みユーザーのみ
drop policy if exists "attachments authenticated update" on storage.objects;
create policy "attachments authenticated update"
  on storage.objects for update
  using (bucket_id = 'attachments' and auth.role() = 'authenticated');

-- 削除: 認証済みユーザーのみ
drop policy if exists "attachments authenticated delete" on storage.objects;
create policy "attachments authenticated delete"
  on storage.objects for delete
  using (bucket_id = 'attachments' and auth.role() = 'authenticated');

-- ============================================================
-- 【セキュリティ注記 — 要検討】
-- 1. public バケットのため、URL(推測困難なuuidを含む)を知る者は誰でも
--    添付を閲覧可能。会計・労務など機微データを扱う場合は、
--    public=false + 署名URL (createSignedUrl) 方式を推奨。
--    ただし署名URLは失効するため、履歴からの再閲覧・↺再送の
--    有効期限設計が別途必要になる。
-- 2. 保存パスが `${uuid}/${originalName}` (uuid=ファイル単位のランダム値)
--    のため、書き込みポリシーをユーザー単位に絞れない
--    (認証済みなら全員が書込/削除可能)。ユーザー単位に隔離するなら
--    保存パスを `${auth.uid()}/${uuid}/${originalName}` とし、
--    ポリシーを `(storage.foldername(name))[1] = auth.uid()::text` に変更する。
-- ============================================================
