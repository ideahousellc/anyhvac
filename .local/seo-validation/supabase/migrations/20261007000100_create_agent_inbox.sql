-- REVIEW ONLY: not applied. No existing tables/data touched.
create table public.agent_inbox_documents (
  owner_id text primary key check (owner_id ~ '^[0-9a-f]{64}$'),
  revision bigint not null default 0 check (revision >= 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ? 'tasks' and jsonb_typeof(payload->'tasks') = 'array' and jsonb_array_length(payload->'tasks') <= 200),
  updated_at timestamptz not null default now()
);
alter table public.agent_inbox_documents enable row level security;
alter table public.agent_inbox_documents force row level security;
revoke all on public.agent_inbox_documents from public, anon, authenticated;
grant select, insert, update on public.agent_inbox_documents to service_role;
create function public.agent_inbox_compare_swap(p_owner text, p_revision bigint, p_payload jsonb)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if p_revision = 0 then
    insert into public.agent_inbox_documents(owner_id, revision, payload)
    values (p_owner, 0, '{"tasks":[]}'::jsonb) on conflict do nothing;
  end if;
  update public.agent_inbox_documents set payload = p_payload, revision = revision + 1, updated_at = now()
  where owner_id = p_owner and revision = p_revision;
  return found;
end;
$$;
revoke all on function public.agent_inbox_compare_swap(text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.agent_inbox_compare_swap(text, bigint, jsonb) to service_role;
