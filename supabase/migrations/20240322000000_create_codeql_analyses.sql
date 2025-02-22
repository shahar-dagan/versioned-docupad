
create table if not exists public.codeql_analyses (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade,
  repository_name text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  triggered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add RLS policies
alter table public.codeql_analyses enable row level security;

create policy "Users can view analyses for their products"
  on public.codeql_analyses for select
  using (exists (
    select 1 from public.products
    where products.id = codeql_analyses.product_id
      and products.owner_id = auth.uid()
  ));

create policy "Users can create analyses for their products"
  on public.codeql_analyses for insert
  with check (exists (
    select 1 from public.products
    where products.id = codeql_analyses.product_id
      and products.owner_id = auth.uid()
  ));

-- Add updated_at trigger
create trigger set_timestamp
  before update on public.codeql_analyses
  for each row
  execute function update_updated_at_column();
