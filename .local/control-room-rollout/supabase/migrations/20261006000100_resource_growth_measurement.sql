-- LOCAL DRAFT ONLY: owner approval required before production application.
-- No email, IP, referrer, URL, cookie or persistent visitor identifier is stored.
create table public.resource_growth_receipts (
  view_id uuid primary key,
  view_started_at timestamptz not null,
  received_at timestamptz not null default now(),
  metric_day date not null default (now() at time zone 'America/New_York')::date,
  counted_keys text[] not null default '{}'
);
create table public.resource_growth_daily (
  metric_day date not null,
  metric text not null check (metric in (
    'resource_view', 'calculator_any', 'calculator_top', 'calculator_contextual',
    'newsletter_any', 'newsletter_inline', 'newsletter_footer', 'newsletter_automatic', 'newsletter_other'
  )),
  count bigint not null default 0 check (count >= 0),
  primary key (metric_day, metric)
);
alter table public.resource_growth_receipts enable row level security;
alter table public.resource_growth_daily enable row level security;
revoke all on public.resource_growth_receipts, public.resource_growth_daily from public, anon, authenticated;
grant select, insert, update, delete on public.resource_growth_receipts to service_role;
grant select, insert, update on public.resource_growth_daily to service_role;

create function public.record_resource_growth_event(
  p_view_id uuid, p_view_started_at timestamptz, p_event text, p_placement text
) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  receipt public.resource_growth_receipts%rowtype;
  metric_key text;
  keys_to_count text[] := array['resource_view'];
begin
  -- Old retries remain invalid after short-lived receipts are pruned.
  if p_view_started_at < now() - interval '24 hours' or p_view_started_at > now() + interval '1 minute' then
    raise exception 'Invalid view age';
  end if;
  if p_event = 'resource_view' and p_placement = 'none' then
    null;
  elsif p_event = 'resource_calculator_click' and p_placement in ('duct-reference-top', 'duct-reference-contextual') then
    keys_to_count := keys_to_count || array['calculator_any', case when p_placement = 'duct-reference-top' then 'calculator_top' else 'calculator_contextual' end];
  elsif p_event = 'resource_newsletter_open' and p_placement in ('duct-reference-inline', 'footer', 'automatic', 'other') then
    keys_to_count := keys_to_count || array['newsletter_any', case when p_placement = 'duct-reference-inline' then 'newsletter_inline' else 'newsletter_' || p_placement end];
  else
    raise exception 'Invalid event';
  end if;
  insert into public.resource_growth_receipts(view_id, view_started_at)
    values (p_view_id, p_view_started_at) on conflict (view_id) do nothing;
  select * into strict receipt from public.resource_growth_receipts where view_id = p_view_id for update;
  if receipt.view_started_at <> p_view_started_at then raise exception 'Mismatched receipt'; end if;
  foreach metric_key in array keys_to_count loop
    if not metric_key = any(receipt.counted_keys) then
      insert into public.resource_growth_daily(metric_day, metric, count) values (receipt.metric_day, metric_key, 1)
        on conflict (metric_day, metric) do update set count = public.resource_growth_daily.count + 1;
      receipt.counted_keys := array_append(receipt.counted_keys, metric_key);
    end if;
  end loop;
  update public.resource_growth_receipts set counted_keys = receipt.counted_keys where view_id = p_view_id;
  return true;
end;
$$;
revoke all on function public.record_resource_growth_event(uuid, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.record_resource_growth_event(uuid, timestamptz, text, text) to service_role;

-- Proposed retention operation (NOT scheduled or run): owner runs daily after
-- approving application/configuration; durable daily counters are preserved.
-- delete from public.resource_growth_receipts where received_at < now() - interval '48 hours';
-- Owner-only aggregate export (never expose the receipt table publicly):
-- select metric_day, metric, count from public.resource_growth_daily order by metric_day, metric;
