# Production measurement verification specification

William, October 6, 2026. Owner has separately authorized production stages; root executes them. This document specifies read-only verification and QA exclusions, not an additional provider action. Deployment results remain pending until root supplies evidence.

## Verify schema and privileges without writing

Use existing private owner-approved database access; never publish credentials or receipt IDs. For schema verification:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('resource_growth_receipts', 'resource_growth_daily')
order by table_name, ordinal_position;

select conrelid::regclass as table_name, contype,
       pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid in ('public.resource_growth_receipts'::regclass,
                   'public.resource_growth_daily'::regclass);

select relname, relrowsecurity
from pg_class
where oid in ('public.resource_growth_receipts'::regclass,
              'public.resource_growth_daily'::regclass);

select p.prosecdef as security_definer, p.proconfig,
       pg_get_functiondef(p.oid) as deployed_definition
from pg_proc p
where p.oid = 'public.record_resource_growth_event(uuid,timestamp with time zone,text,text)'::regprocedure;

select role_name,
       has_table_privilege(role_name, 'public.resource_growth_daily', 'SELECT') as daily_read,
       has_table_privilege(role_name, 'public.resource_growth_daily', 'INSERT') as daily_insert,
       has_table_privilege(role_name, 'public.resource_growth_receipts', 'SELECT') as receipt_read,
       has_function_privilege(role_name,
         'public.record_resource_growth_event(uuid,timestamp with time zone,text,text)',
         'EXECUTE') as rpc_execute
from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name);
```

Expected: receipt UUID primary key and required timestamps/day/keys; daily `(metric_day,metric)` primary key, allowed metric CHECK and nonnegative count CHECK; RLS enabled for both tables; security invoker with empty search path; anonymous/authenticated no listed permissions and service-role granted reads/writes/RPC. Compare exact function definition against the reviewed migration. Read-only role/API denial checks must distinguish denial or empty RLS-visible results from exposed rows; HTTP 204 on the event endpoint is not persistence proof.

## Minimal QA and read-only reconciliation

Perform only owner-authorized controlled QA writes, ideally one fresh resource view exercising both calculator placements and explicit footer intent. The existing automatic path can be checked on a separate fresh excluded view if needed; don't submit newsletter forms or set confirmed-subscription flags. An opted-out ordinary owner browser is preferred for other navigation. Record accepted QA view IDs privately, extraction/deployment timestamps, hostname, switches and response codes. The isolated tests already cover repeated/racing/malformed cases; production need not repeat every synthetic test.

Privately inspect each known QA receipt while short-lived rows are retained:

```sql
select view_id, view_started_at, received_at, metric_day, counted_keys
from public.resource_growth_receipts
where view_id in (:qa_view_ids);

select metric_day, metric, count
from public.resource_growth_daily
where metric_day in (:qa_metric_days)
order by metric_day, metric;
```

`:qa_view_ids`/`:qa_metric_days` are bound private parameters or owner-selected SQL literals, not literal valid SQL placeholders. Capture before/after counters when possible; unrelated public arrivals can increase totals, so use QA receipt keys to verify inclusion and don't demand exactly QA-only daily totals. For opt-out, verify no browser request. For admin-cookie QA, verify its known receipt ID is absent and no associated counter delta attributable to it; a 204 alone cannot prove exclusion. Data quality remains limited by anonymous clients, blockers, browser clock tolerance and conservative exclusion of any admin cookie.

## Baseline boundary and QA exclusion

Daily aggregates are assigned to **America/New_York day of first server receipt**, including all later activities from that page view. Client `viewStartedAt` limits replay age; it does not choose the reporting day. One lost initial view request can be recovered by the first valid click/open. Capture server `received_at` and `metric_day` rather than guessing the day from local browser time.

Mark **every Eastern metric day containing accepted QA as fully excluded**. Do not delete rows, subtract QA events from aggregate counters or claim a subday clean baseline: daily data cannot faithfully recover subday traffic. Preserve those counters and label them validation/transition activity, even if genuine traffic also arrived. Old-view late actions remain attributed to the original receipt day; fresh QA IDs on a later day exclude that later day too.

Baseline begins on the next complete Eastern reporting day after verified deployment/enabling, owner/test exclusions and the final accepted QA day. If all production QA finishes October 6, the earliest boundary is **October 7, 2026 at 00:00 EDT = 2026-10-07T04:00:00Z**. If readiness or new accepted QA slips into October 7, earliest start becomes October 8 at 00:00 EDT. The earlier owner-review proposal may retain October 12 as the planned baseline start; earlier technical readiness does not automatically reschedule the experiment. Record one explicit selected date before interpreting outcomes.

Use `metric_day` filters for resource baseline exports. For 14 complete days starting date D, end date is D+13; for 28 complete days, D+27. Keep GSC's Pacific day boundaries and finalized-data checks separate. If the window crosses the November 1 daylight-saving change, Eastern midnight becomes 05:00 UTC; derive each boundary using America/New_York, never add a fixed UTC offset to the whole period.

No additional accepted QA should occur during baseline; use owner opt-out and admin exclusions. If it does, flag the affected day and extend to preserve the required number of complete comparable days. Report collection interruptions/rate losses separately. Production collection does not prove all traffic is genuine humans or remove all owner/bot contamination. Describe the result as a verified collection baseline with documented exclusions; call it clean only if the evidence supports that stronger statement.

## Final readiness criteria

Ready for page-view/link/intent baseline only after reviewed schema/permissions, enabled deployment, real production service-role receipt/export and excluded QA evidence are verified. Current public CTA and title must remain unchanged. Genuine new/confirmed newsletter acquisition cohorts and future-CTA source attribution still require Beehiiv evidence; active totals and modal-open counts cannot substitute. No unverified count is zero. This document will record the final verdict after deployment evidence arrives.
