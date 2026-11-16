-- Uma linha por jogador = o recorde dele
create table if not exists public.scores (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 3 and 20),
  best_score   integer not null check (best_score >= 0),
  updated_at   timestamptz not null default now()
);

-- Índice para o ranking
create index if not exists scores_best_score_idx
  on public.scores (best_score desc, updated_at asc);

-- Segurança em nível de linha
alter table public.scores enable row level security;

-- Ranking é público (inclusive para quem não está logado)
create policy "ranking publico"
  on public.scores for select
  to anon, authenticated
  using (true);

-- Só grava/atualiza a própria linha
create policy "inserir proprio recorde"
  on public.scores for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "atualizar proprio recorde"
  on public.scores for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Função: cria o registro ou atualiza SOMENTE se a nova pontuação for maior
create or replace function public.submit_score(p_score integer)
returns public.scores
language plpgsql
security invoker
as $$
declare
  v_name text;
  v_row  public.scores;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  v_name := coalesce(
    auth.jwt() -> 'user_metadata' ->> 'display_name',
    'Jogador'
  );

  insert into public.scores as s (user_id, display_name, best_score)
  values (auth.uid(), v_name, greatest(p_score, 0))
  on conflict (user_id) do update
    set best_score   = excluded.best_score,
        display_name = excluded.display_name,
        updated_at   = now()
    where s.best_score < excluded.best_score
  returning * into v_row;

  -- Se a pontuação não superou o recorde, retorna o registro existente
  if v_row.user_id is null then
    select * into v_row from public.scores where user_id = auth.uid();
  end if;

  return v_row;
end;
$$;

grant execute on function public.submit_score(integer) to authenticated;