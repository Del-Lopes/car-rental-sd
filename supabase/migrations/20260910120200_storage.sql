-- Carental :: buckets de Storage e suas policies
--
-- Convencao de caminho:
--   vehicle-photos  vehicles/<vehicle_id>/<uuid>.<ext>   (publico)
--   vehicle-docs    vehicles/<vehicle_id>/<uuid>.<ext>   (privado, so admin)
--   customer-docs   <profile_id>/<uuid>.<ext>            (privado, dono + admin)
--
-- O primeiro segmento de customer-docs e o profile_id justamente para que a
-- policy consiga autorizar por pasta, sem consultar outra tabela.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-photos', 'vehicle-photos', true, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('vehicle-docs', 'vehicle-docs', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('customer-docs', 'customer-docs', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- --------------------------------------------------------------- vehicle-photos

create policy "vehicle-photos: leitura publica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'vehicle-photos');

create policy "vehicle-photos: admin gerencia"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'vehicle-photos' and public.is_admin())
  with check (bucket_id = 'vehicle-photos' and public.is_admin());

-- ----------------------------------------------------------------- vehicle-docs

create policy "vehicle-docs: apenas admin"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'vehicle-docs' and public.is_admin())
  with check (bucket_id = 'vehicle-docs' and public.is_admin());

-- ---------------------------------------------------------------- customer-docs

create policy "customer-docs: dono le o seu, admin le todos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'customer-docs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "customer-docs: dono envia na propria pasta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'customer-docs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "customer-docs: dono apaga o seu, admin apaga qualquer"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'customer-docs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
