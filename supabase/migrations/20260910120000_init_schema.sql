-- Carental :: schema inicial
-- Convencao: tudo em public, ids uuid, timestamps timestamptz.
-- Categorias e tipos de documento vivem em tabelas de lookup (e nao em enums)
-- porque a lista definitiva ainda depende de confirmacao do cliente: assim a
-- resposta dele vira um INSERT, e nao uma migration nova.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums fixos

-- Em bloco com tratamento de duplicidade: se uma execucao anterior parou no
-- meio, rodar o arquivo de novo nao falha por causa dos tipos ja criados.
do $$
begin
  create type public.user_role as enum ('admin', 'customer');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.vehicle_status as enum ('available', 'rented', 'maintenance', 'archived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

-- -------------------------------------------------------------------- helpers

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------------- lookups

create table public.vehicle_categories (
  slug        text primary key,
  label       text not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

create table public.vehicle_document_types (
  slug            text primary key,
  label           text not null,
  requires_expiry boolean not null default true,
  sort_order      integer not null default 0,
  is_active       boolean not null default true
);

create table public.customer_document_types (
  slug            text primary key,
  label           text not null,
  is_required     boolean not null default true,
  requires_expiry boolean not null default false,
  sort_order      integer not null default 0,
  is_active       boolean not null default true
);

-- ------------------------------------------------------------------- profiles

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       public.user_role not null default 'customer',
  full_name  text,
  email      text,
  phone      text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- is_admin() fica DEPOIS da tabela profiles: funcao em `language sql` tem o
-- corpo validado na criacao, e referenciar uma tabela ainda inexistente falha
-- com 42P01 ("relation public.profiles does not exist").
-- SECURITY DEFINER para nao disparar a RLS de profiles dentro das policies que
-- consultam profiles (evita recursao infinita).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o profile assim que o usuario se cadastra no Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que um cliente promova a si mesmo a admin editando o proprio profile.
--
-- So barra quem chega como usuario final (anon/authenticated) e nao e admin.
-- O service_role (script create-admin) e o postgres (SQL Editor) passam.
-- Por isso a funcao NAO e security definer: dentro de uma, current_user seria o
-- dono da funcao e nunca daria para saber quem chamou -- foi exatamente esse o
-- bug que fazia o create-admin "concluir" sem promover ninguem.
-- Erro explicito em vez de reverter em silencio: falha visivel e rastreavel.
create or replace function public.lock_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'Only an admin can change user roles'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_lock_role
  before update on public.profiles
  for each row execute function public.lock_profile_role();

-- ------------------------------------------------------------------- vehicles

create table public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  make          text not null,
  model         text not null,
  year          integer not null check (year between 1950 and 2100),
  category_slug text not null references public.vehicle_categories(slug),
  transmission  text not null check (transmission in ('automatic', 'manual')),
  fuel          text check (fuel in ('gasoline', 'diesel', 'hybrid', 'electric')),
  seats         integer check (seats between 1 and 20),
  doors         integer check (doors between 1 and 8),
  color         text,
  mileage       integer check (mileage >= 0),
  plate         text,
  vin           text,
  -- A locadora nao trabalha com diaria: so semanal e mensal, mais a caucao.
  -- Nao ha limite de milhagem por decisao do cliente.
  weekly_rate      numeric(10, 2) not null check (weekly_rate >= 0),
  monthly_rate     numeric(10, 2) not null check (monthly_rate >= 0),
  security_deposit numeric(10, 2) check (security_deposit >= 0),
  status        public.vehicle_status not null default 'available',
  description   text,
  featured      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index vehicles_plate_key on public.vehicles (upper(plate)) where plate is not null;
create unique index vehicles_vin_key on public.vehicles (upper(vin)) where vin is not null;
create index vehicles_status_idx on public.vehicles (status);
create index vehicles_category_idx on public.vehicles (category_slug);
create index vehicles_featured_idx on public.vehicles (featured) where featured;

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

create table public.vehicle_photos (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  storage_path text not null,
  alt_text     text,
  sort_order   integer not null default 0,
  is_cover     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index vehicle_photos_vehicle_idx on public.vehicle_photos (vehicle_id, sort_order);
create unique index vehicle_photos_single_cover on public.vehicle_photos (vehicle_id) where is_cover;

-- Hoje so a registration e acompanhada, e o vencimento dela e informado como
-- mes/ano. Guardamos mesmo assim em `date`, sempre no ULTIMO DIA do mes, para
-- que a contagem de dias do dashboard continue certa. A tabela de tipos segue
-- existindo: incluir insurance ou inspection depois e um INSERT, nao migration.
create table public.vehicle_documents (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  type_slug  text not null references public.vehicle_document_types(slug),
  doc_number text,
  issued_at  date,
  expires_at date,
  file_path  text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_documents_dates_check
    check (issued_at is null or expires_at is null or expires_at >= issued_at)
);

create index vehicle_documents_vehicle_idx on public.vehicle_documents (vehicle_id);
create index vehicle_documents_expires_idx on public.vehicle_documents (expires_at)
  where expires_at is not null;

create trigger vehicle_documents_set_updated_at
  before update on public.vehicle_documents
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------- customer documents

-- Ancorado ao profile (e nao a uma locacao) de proposito: funciona tanto se o
-- locatario enviar os documentos no cadastro quanto so ao fechar a locacao.
create table public.customer_documents (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  type_slug   text not null references public.customer_document_types(slug),
  file_path   text not null,
  file_name   text,
  status      public.document_status not null default 'pending',
  expires_at  date,
  notes       text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index customer_documents_profile_idx on public.customer_documents (profile_id);
create index customer_documents_status_idx on public.customer_documents (status);

create trigger customer_documents_set_updated_at
  before update on public.customer_documents
  for each row execute function public.set_updated_at();

-- Carimba quem revisou e quando, sempre que o status muda.
create or replace function public.stamp_document_review()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_by = auth.uid();
    new.reviewed_at = now();
  end if;
  return new;
end;
$$;

create trigger customer_documents_stamp_review
  before update on public.customer_documents
  for each row execute function public.stamp_document_review();
