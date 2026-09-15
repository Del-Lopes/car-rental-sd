-- Carental :: seed
-- Roda automaticamente no `supabase db reset` (ambiente local / staging).
--
-- As listas abaixo ja refletem as respostas do cliente. Incluir ou remover
-- categoria e tipo de documento continua sendo INSERT/UPDATE aqui -- nenhuma
-- migration nova e necessaria.

-- ------------------------------------------------------------- categorias
-- Definidas pelo cliente por tipo de carroceria (e nao por faixa de preco).

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

-- --------------------------------------- tipos de documento do veiculo
-- O cliente acompanha vencimento apenas da registration, informada em mes/ano.
-- Insurance e inspection ficam prontos para entrar depois, se ele quiser.

insert into public.vehicle_document_types (slug, label, requires_expiry, sort_order) values
  ('registration', 'Registration', true, 1)
on conflict (slug) do nothing;

-- --------------------------------------- tipos de documento do locatario
-- Enviados no momento do cadastro, antes de qualquer locacao.

insert into public.customer_document_types (slug, label, is_required, requires_expiry, sort_order) values
  ('dl_front',         'Driver''s license (front)', true, true,  1),
  ('dl_back',          'Driver''s license (back)',  true, false, 2),
  ('proof_of_address', 'Proof of address',          true, false, 3)
on conflict (slug) do nothing;

-- ------------------------------------------------------- veiculos de exemplo
-- Dados ficticios para desenvolvimento e para o cliente ver o sistema cheio.
-- Precos semanal e mensal, mais caucao. Sem diaria e sem limite de milhagem.

insert into public.vehicles
  (id, make, model, year, category_slug, transmission, fuel, seats, doors, color,
   mileage, plate, weekly_rate, monthly_rate, security_deposit, status, featured, description)
values
  ('a0000000-0000-4000-8000-000000000001', 'Mercedes-Benz', 'S-Class', 2023, 'sedan', 'automatic', 'gasoline', 5, 4, 'Black',
   12400, 'CAR-1001', 1750.00, 5900.00, 1500.00, 'available', true,
   'Full-size luxury sedan with premium leather interior and driver assistance package.'),
  ('a0000000-0000-4000-8000-000000000002', 'BMW', 'X5', 2022, 'suv', 'automatic', 'gasoline', 5, 5, 'Alpine White',
   28750, 'CAR-1002', 1290.00, 4400.00, 1000.00, 'available', true,
   'Midsize luxury SUV, all-wheel drive, panoramic roof.'),
  ('a0000000-0000-4000-8000-000000000003', 'Toyota', 'Camry', 2023, 'sedan', 'automatic', 'hybrid', 5, 4, 'Silver',
   19300, 'CAR-1003', 520.00, 1750.00, 500.00, 'available', false,
   'Reliable hybrid sedan with excellent fuel economy. Great for long trips.'),
  ('a0000000-0000-4000-8000-000000000004', 'Chevrolet', 'Tahoe', 2021, 'suv', 'automatic', 'gasoline', 7, 5, 'Dark Gray',
   54200, 'CAR-1004', 1050.00, 3600.00, 800.00, 'rented', false,
   'Full-size SUV seating seven. Ideal for family trips and group travel.'),
  ('a0000000-0000-4000-8000-000000000005', 'Tesla', 'Model 3', 2024, 'sedan', 'automatic', 'electric', 5, 4, 'Deep Blue',
   6100, 'CAR-1005', 760.00, 2600.00, 700.00, 'available', true,
   'All-electric sedan with autopilot. Charging cable included.'),
  ('a0000000-0000-4000-8000-000000000006', 'Volkswagen', 'Golf', 2022, 'hatchback', 'automatic', 'gasoline', 5, 5, 'White',
   41800, 'CAR-1006', 350.00, 1200.00, 400.00, 'available', false,
   'Compact and economical. The best value in the fleet.'),
  ('a0000000-0000-4000-8000-000000000007', 'Subaru', 'Outback', 2023, 'wagon', 'automatic', 'gasoline', 5, 5, 'Autumn Green',
   17600, 'CAR-1007', 690.00, 2350.00, 600.00, 'maintenance', false,
   'All-wheel drive wagon with generous cargo space and roof rails.'),
  ('a0000000-0000-4000-8000-000000000008', 'Chrysler', 'Pacifica', 2022, 'minivan', 'automatic', 'hybrid', 7, 5, 'Modern Steel',
   23900, 'CAR-1008', 820.00, 2800.00, 700.00, 'available', false,
   'Seven-seat minivan with sliding doors and flexible seating.')
on conflict (id) do nothing;

-- ------------------------------------------ registrations com vencimento
-- A registration vence em mes/ano; gravamos sempre o ULTIMO DIA do mes.
-- As datas cobrem todas as faixas do semaforo do dashboard.

insert into public.vehicle_documents (vehicle_id, type_slug, doc_number, expires_at)
values
  -- vencidas
  ('a0000000-0000-4000-8000-000000000004', 'registration', 'REG-4471',
   (date_trunc('month', current_date) - interval '1 day')::date),
  ('a0000000-0000-4000-8000-000000000006', 'registration', 'REG-8890',
   (date_trunc('month', current_date) - interval '1 month' - interval '1 day')::date),
  -- vence no fim do mes corrente
  ('a0000000-0000-4000-8000-000000000001', 'registration', 'REG-1123',
   (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date),
  ('a0000000-0000-4000-8000-000000000007', 'registration', 'REG-7781',
   (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date),
  -- vence no mes seguinte
  ('a0000000-0000-4000-8000-000000000002', 'registration', 'REG-2234',
   (date_trunc('month', current_date) + interval '2 months' - interval '1 day')::date),
  ('a0000000-0000-4000-8000-000000000003', 'registration', 'REG-3345',
   (date_trunc('month', current_date) + interval '2 months' - interval '1 day')::date),
  -- daqui a dois meses
  ('a0000000-0000-4000-8000-000000000005', 'registration', 'REG-5567',
   (date_trunc('month', current_date) + interval '3 months' - interval '1 day')::date),
  -- em dia
  ('a0000000-0000-4000-8000-000000000008', 'registration', 'REG-8891',
   (date_trunc('month', current_date) + interval '10 months' - interval '1 day')::date);
