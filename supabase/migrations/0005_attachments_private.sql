-- ============================================================
-- 0005_attachments_private.sql
-- 添付バケットを private 化し、ユーザー単位に隔離する
--   保存パス: `${auth.uid()}/${uuid}/${asciiName}` (アプリ側で生成)
--   閲覧・Claude送信は署名URL (createSignedUrl) をその場で発行
-- Supabase SQL Editor に貼り付けて実行
-- ============================================================

-- 1. バケットを非公開に (既存の公開URLは以後 403 になる)
update storage.buckets set public = false where id = 'attachments';

-- 2. 旧ポリシーを撤去
drop policy if exists "attachments public read" on storage.objects;
drop policy if exists "attachments authenticated insert" on storage.objects;
drop policy if exists "attachments authenticated update" on storage.objects;
drop policy if exists "attachments authenticated delete" on storage.objects;

-- 3. 自分のフォルダ (先頭セグメント = auth.uid()) のみ読み書き可
drop policy if exists "attachments owner select" on storage.objects;
create policy "attachments owner select"
  on storage.objects for select to authenticated
  using (bucket_id = 'attachments'
     and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments owner insert" on storage.objects;
create policy "attachments owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments'
     and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments owner update" on storage.objects;
create policy "attachments owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'attachments'
     and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments owner delete" on storage.objects;
create policy "attachments owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'attachments'
     and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 【注記】
-- ・private 化以前にアップロードした旧ファイル (`${uuid}/名前` 形式) は
--   どのユーザーのフォルダにも属さないため、以後は誰も閲覧できない。
--   不要なら Dashboard → Storage → attachments から削除してよい。
-- ・requests.attachments の旧データ (公開URL文字列) は履歴に名前は出るが
--   開けない。新規の添付から {path, name} 形式で保存される。
-- ============================================================
