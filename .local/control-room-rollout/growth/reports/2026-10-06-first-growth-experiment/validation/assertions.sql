\set ON_ERROR_STOP on
-- Run only in the owner-authorized disposable measurement-validation database.
-- Migration must already be applied. All fixtures roll back.
begin;
truncate public.resource_growth_receipts, public.resource_growth_daily;

do $$
declare role_name text; table_name text; privilege_name text; denied boolean;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    foreach table_name in array array['resource_growth_receipts', 'resource_growth_daily'] loop
      foreach privilege_name in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
        if has_table_privilege(role_name, 'public.' || table_name, privilege_name) then
          raise exception 'Unexpected % % privilege on %', role_name, privilege_name, table_name;
        end if;
      end loop;
    end loop;
    if has_function_privilege(role_name, 'public.record_resource_growth_event(uuid,timestamp with time zone,text,text)', 'EXECUTE') then
      raise exception 'Unexpected RPC permission for %', role_name;
    end if;
    execute format('set local role %I', role_name);
    denied := false;
    begin execute 'select count(*) from public.resource_growth_daily';
    exception when insufficient_privilege then denied := true; end;
    reset role;
    if not denied then raise exception 'Read not denied for %', role_name; end if;
    execute format('set local role %I', role_name);
    denied := false;
    begin execute $write$insert into public.resource_growth_daily(metric_day, metric, count) values (current_date, 'resource_view', 99)$write$;
    exception when insufficient_privilege then denied := true; end;
    reset role;
    if not denied then raise exception 'Write not denied for %', role_name; end if;
    execute format('set local role %I', role_name);
    denied := false;
    begin perform public.record_resource_growth_event('11111111-1111-4111-8111-111111111111', now(), 'resource_view', 'none');
    exception when insufficient_privilege then denied := true; end;
    reset role;
    if not denied then raise exception 'RPC not denied for %', role_name; end if;
  end loop;
  if not (select relrowsecurity from pg_class where oid = 'public.resource_growth_daily'::regclass)
    or not (select relrowsecurity from pg_class where oid = 'public.resource_growth_receipts'::regclass) then
    raise exception 'RLS missing';
  end if;
end $$;

set local role service_role;
select public.record_resource_growth_event('11111111-1111-4111-8111-111111111111', now(), 'resource_view', 'none');
select public.record_resource_growth_event('11111111-1111-4111-8111-111111111111', now(), 'resource_calculator_click', 'duct-reference-top');
select public.record_resource_growth_event('11111111-1111-4111-8111-111111111111', now(), 'resource_calculator_click', 'duct-reference-top');
select public.record_resource_growth_event('11111111-1111-4111-8111-111111111111', now(), 'resource_calculator_click', 'duct-reference-contextual');
select public.record_resource_growth_event('11111111-1111-4111-8111-111111111111', now(), 'resource_newsletter_open', 'footer');
select public.record_resource_growth_event('11111111-1111-4111-8111-111111111111', now(), 'resource_newsletter_open', 'automatic');
-- Click-first recovery and a second view verify aggregate increments.
select public.record_resource_growth_event('22222222-2222-4222-8222-222222222222', now(), 'resource_calculator_click', 'duct-reference-contextual');
select public.record_resource_growth_event('22222222-2222-4222-8222-222222222222', now(), 'resource_view', 'none');
select count(*) as service_role_read_allowed from public.resource_growth_daily;
reset role;

do $$
declare expected record; actual bigint; before_total bigint; rejected boolean;
begin
  for expected in select * from (values
    ('resource_view', 2), ('calculator_any', 2), ('calculator_top', 1),
    ('calculator_contextual', 2), ('newsletter_any', 1), ('newsletter_footer', 1),
    ('newsletter_automatic', 1)
  ) as checks(metric, wanted) loop
    select count into actual from public.resource_growth_daily where metric = expected.metric;
    if actual is distinct from expected.wanted::bigint then
      raise exception 'Wrong counter %: %, wanted %', expected.metric, actual, expected.wanted;
    end if;
  end loop;
  if (select count(*) from public.resource_growth_receipts) <> 2 then raise exception 'Unexpected receipt count'; end if;
  if exists (select 1 from public.resource_growth_daily where metric_day <> (now() at time zone 'America/New_York')::date) then
    raise exception 'Wrong reporting day';
  end if;
  select sum(count) into before_total from public.resource_growth_daily;
  rejected := false;
  begin insert into public.resource_growth_daily(metric_day, metric, count) values (current_date, 'invented_metric', 1);
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception 'Invalid metric constraint missing'; end if;
  rejected := false;
  begin update public.resource_growth_daily set count = -1 where metric = 'resource_view';
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception 'Negative count constraint missing'; end if;
  rejected := false;
  begin insert into public.resource_growth_receipts(view_id, view_started_at) values ('11111111-1111-4111-8111-111111111111', now());
  exception when unique_violation then rejected := true; end;
  if not rejected then raise exception 'Unique receipt constraint missing'; end if;
  rejected := false;
  begin perform public.record_resource_growth_event('33333333-3333-4333-8333-333333333333', now(), 'resource_calculator_click', 'footer');
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Invalid placement accepted'; end if;
  rejected := false;
  begin perform public.record_resource_growth_event('11111111-1111-4111-8111-111111111111', now() - interval '1 second', 'resource_view', 'none');
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Mismatched timestamp accepted'; end if;
  rejected := false;
  begin perform public.record_resource_growth_event('44444444-4444-4444-8444-444444444444', now() - interval '25 hours', 'resource_view', 'none');
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Old replay accepted'; end if;
  rejected := false;
  begin perform public.record_resource_growth_event('55555555-5555-4555-8555-555555555555', now() + interval '2 minutes', 'resource_view', 'none');
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Future view accepted'; end if;
  if (select sum(count) from public.resource_growth_daily) is distinct from before_total
    or (select count(*) from public.resource_growth_receipts) <> 2 then
    raise exception 'Rejected event mutated counters/receipts';
  end if;
  -- Simulate aged fixture, execute reviewed retention, verify durable history.
  update public.resource_growth_receipts set received_at = now() - interval '49 hours', view_started_at = now() - interval '49 hours'
    where view_id = '11111111-1111-4111-8111-111111111111';
  delete from public.resource_growth_receipts where received_at < now() - interval '48 hours';
  if (select count(*) from public.resource_growth_receipts) <> 1
    or (select sum(count) from public.resource_growth_daily) is distinct from before_total then
    raise exception 'Retention lost durable counters';
  end if;
  rejected := false;
  begin perform public.record_resource_growth_event('11111111-1111-4111-8111-111111111111', now() - interval '49 hours', 'resource_view', 'none');
  exception when others then rejected := true; end;
  if not rejected or (select sum(count) from public.resource_growth_daily) is distinct from before_total then
    raise exception 'Pruned stale replay changed history';
  end if;
end $$;
rollback;
\echo PASS: permissions, service RPC, deduplication, recovery, rollback, replay, retention
