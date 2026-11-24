-- Phase 6 (additive): private storage for files customers attach in YAKU AI chat.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('ai-attachments','ai-attachments',false,10485760,
  array['application/pdf','image/png','image/jpeg','image/webp','text/plain','text/csv','text/markdown','application/json']) on conflict do nothing;
create policy "upload own ai attachments" on storage.objects for insert to authenticated with check (bucket_id = 'ai-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own ai attachments" on storage.objects for select to authenticated using (bucket_id = 'ai-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own ai attachments" on storage.objects for delete to authenticated using (bucket_id = 'ai-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
