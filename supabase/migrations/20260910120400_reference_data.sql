-- Carental :: dados de referencia
--
-- Categorias e tipos de documento sao dados que o sistema PRECISA para
-- funcionar (sem categoria nao ha como cadastrar veiculo). Por isso vivem numa
-- migration, que roda em todo ambiente, e nao no seed.sql, que so roda no
-- desenvolvimento local e carrega dados ficticios.
--
-- Valores definidos pelo cliente em 10/09/2026. Alterar depois continua sendo
-- INSERT/UPDATE nestas tabelas -- o `on conflict` torna esta migration segura
-- de reaplicar.

insert into public.vehicle_categories (slug, label, sort_order) values
  ('sedan',       'Sedan',        1),
  ('hatchback',   'Hatchback',    2),
  ('wagon',       'Wagon',        3),
  ('suv',         'SUV',          4),
  ('coupe',       'Coupe',        5),
  ('convertible', 'Convertible',  6),
  ('minivan',     'Minivan',      7),
  ('pickup',      'Pickup Truck', 8),
  ('van',         'Van',          9)
on conflict (slug) do nothing;

-- O cliente acompanha vencimento apenas da registration (mes/ano).
insert into public.vehicle_document_types (slug, label, requires_expiry, sort_order) values
  ('registration', 'Registration', true, 1)
on conflict (slug) do nothing;

-- Enviados pelo locatario no momento do cadastro.
insert into public.customer_document_types (slug, label, is_required, requires_expiry, sort_order) values
  ('dl_front',         'Driver''s license (front)', true, true,  1),
  ('dl_back',          'Driver''s license (back)',  true, false, 2),
  ('proof_of_address', 'Proof of address',          true, false, 3)
on conflict (slug) do nothing;
