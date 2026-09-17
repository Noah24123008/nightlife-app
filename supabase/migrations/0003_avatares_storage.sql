-- ============================================================
-- Migración: bucket de avatares (Supabase Storage)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares',
  'avatares',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Cada usuario solo puede leer, subir, reemplazar y borrar dentro de su
-- propia carpeta: la ruta usada es siempre "{auth.uid()}/avatar.ext".

create policy "Avatares - leer propio"
  on storage.objects for select
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatares - subir propio"
  on storage.objects for insert
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatares - reemplazar propio"
  on storage.objects for update
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatares - borrar propio"
  on storage.objects for delete
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
