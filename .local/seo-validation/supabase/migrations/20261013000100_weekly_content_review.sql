-- REVIEW ONLY. Apply transactionally after separate production authorization.
create table public.weekly_content_reviews (
  owner_id text not null check (owner_id ~ '^[0-9a-f]{64}$'),
  batch_id text not null check (batch_id ~ '^anyhvac-week-[0-9-]+$'),
  agent_id text not null default 'anyhvac.george' check (agent_id = 'anyhvac.george'),
  revision bigint not null default 0 check (revision >= 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ?& array['versions','actions'] and jsonb_typeof(payload->'versions')='array' and jsonb_typeof(payload->'actions')='array' and jsonb_array_length(payload->'versions') between 1 and 50 and jsonb_array_length(payload->'actions') <= 200),
  updated_at timestamptz not null default now(),
  primary key(owner_id,batch_id)
);
alter table public.weekly_content_reviews enable row level security;
alter table public.weekly_content_reviews force row level security;
revoke all on public.weekly_content_reviews from public, anon, authenticated, service_role;
grant select, insert, update on public.weekly_content_reviews to service_role;

create function public.guard_weekly_content_review() returns trigger
language plpgsql set search_path=public,pg_temp as $$
declare v jsonb; a jsonb; n integer:=0; previous jsonb;
begin
  if tg_op='INSERT' and new.revision<>0 then raise exception 'Initial revision must be zero'; end if;
  if tg_op='UPDATE' then
    if new.owner_id<>old.owner_id or new.batch_id<>old.batch_id or new.agent_id<>old.agent_id or new.revision<>old.revision+1 then raise exception 'Invalid review identity/revision'; end if;
    if jsonb_array_length(new.payload->'versions')<jsonb_array_length(old.payload->'versions') or jsonb_array_length(new.payload->'actions')<jsonb_array_length(old.payload->'actions') then raise exception 'History cannot be removed'; end if;
    for previous in select value from jsonb_array_elements(old.payload->'versions') loop
      if new.payload->'versions'->((previous->>'number')::integer-1) is distinct from previous then raise exception 'Immutable version changed'; end if;
    end loop;
    for previous in select value from jsonb_array_elements(old.payload->'actions') loop
      if new.payload->'actions'->n is distinct from previous then raise exception 'Immutable action changed'; end if;
      n:=n+1;
    end loop;
  end if;
  n:=0;
  for v in select value from jsonb_array_elements(new.payload->'versions') loop
    n:=n+1;
    if (v->>'number')::integer is distinct from n or not coalesce(v->>'digest' ~ '^[0-9a-f]{64}$',false) or v->'content'->>'batchId' is distinct from new.batch_id or v->'content'->>'agentId' is distinct from new.agent_id then raise exception 'Invalid version identity'; end if;
  end loop;
  if (select count(distinct x->>'requestId') from jsonb_array_elements(new.payload->'actions') x)<>jsonb_array_length(new.payload->'actions') then raise exception 'Duplicate request'; end if;
  for a in select value from jsonb_array_elements(new.payload->'actions') loop
    if not coalesce(a->>'requestId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',false) or not coalesce(a->>'action' in ('revision','edit','review','approve'),false) then raise exception 'Invalid action'; end if;
    if not exists(select 1 from jsonb_array_elements(new.payload->'versions') x where x->>'number'=a->>'version' and x->>'digest'=a->>'digest') then raise exception 'Action digest/version mismatch'; end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.guard_weekly_content_review() from public,anon,authenticated,service_role;
create trigger weekly_review_integrity before insert or update on public.weekly_content_reviews for each row execute function public.guard_weekly_content_review();

create function public.weekly_content_compare_swap(p_owner text,p_batch text,p_revision bigint,p_payload jsonb)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if p_revision=0 then
    insert into public.weekly_content_reviews(owner_id,batch_id,revision,payload)
    values(p_owner,p_batch,0,p_payload) on conflict do nothing;
  end if;
  update public.weekly_content_reviews set payload=p_payload,revision=revision+1,updated_at=now()
  where owner_id=p_owner and batch_id=p_batch and revision=p_revision;
  return found;
end;
$$;
revoke all on function public.weekly_content_compare_swap(text,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.weekly_content_compare_swap(text,text,bigint,jsonb) to service_role;

-- Private review bucket only. Never make this bucket public or issue browser upload tokens.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('weekly-content-review','weekly-content-review',false,50000000,array['image/png','video/mp4']);
-- Restrictive policies defeat existing broad permissive browser-role policies for this bucket.
create policy weekly_review_browser_deny on storage.objects as restrictive for all to anon,authenticated
using(bucket_id<>'weekly-content-review') with check(bucket_id<>'weekly-content-review');
