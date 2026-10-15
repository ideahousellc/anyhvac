-- AnyHVAC Mail foundation.
-- This migration is intentionally repository-only until it is reviewed and
-- explicitly applied to the AnyHVAC Supabase project.

create extension if not exists pgcrypto;

create type public.mailbox_address as enum (
  'contact@anyhvac.net',
  'support@anyhvac.net',
  'social@anyhvac.net',
  'mailtest@anyhvac.net'
);

create type public.mail_direction as enum ('inbound', 'outbound');

create table public.mail_threads (
  id uuid primary key default gen_random_uuid(),
  mailbox public.mailbox_address not null,
  subject text not null default '',
  normalized_subject text,
  latest_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mail_threads_id_mailbox_key unique (id, mailbox),
  constraint mail_threads_normalized_subject_length_check
    check (normalized_subject is null or char_length(normalized_subject) <= 998),
  constraint mail_threads_subject_length_check
    check (char_length(subject) <= 998)
);

comment on column public.mail_threads.normalized_subject is
  'Advisory subject normalization for fallback grouping/search; never the sole threading key.';

create table public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  mailbox public.mailbox_address not null,
  direction public.mail_direction not null,
  provider text not null,
  provider_message_id text,
  provider_event_id text,
  internet_message_id text,
  in_reply_to text,
  reference_message_ids text[] not null default '{}',
  from_address text not null,
  from_name text,
  to_addresses text[] not null default '{}',
  cc_addresses text[] not null default '{}',
  bcc_addresses text[] not null default '{}',
  reply_to_addresses text[] not null default '{}',
  subject text not null default '',
  text_body text,
  html_body text,
  received_at timestamptz,
  sent_at timestamptz,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mail_messages_thread_mailbox_fkey
    foreign key (thread_id, mailbox)
    references public.mail_threads (id, mailbox)
    on delete cascade,
  constraint mail_messages_provider_check
    check (char_length(btrim(provider)) between 1 and 100),
  constraint mail_messages_provider_message_id_check
    check (provider_message_id is null or char_length(provider_message_id) <= 512),
  constraint mail_messages_provider_event_id_check
    check (provider_event_id is null or char_length(provider_event_id) <= 512),
  constraint mail_messages_internet_message_id_check
    check (internet_message_id is null or char_length(internet_message_id) <= 998),
  constraint mail_messages_in_reply_to_check
    check (in_reply_to is null or char_length(in_reply_to) <= 998),
  constraint mail_messages_from_address_check
    check (char_length(from_address) between 1 and 254),
  constraint mail_messages_subject_length_check
    check (char_length(subject) <= 998),
  constraint mail_messages_direction_timestamp_check
    check (
      (direction = 'inbound' and received_at is not null and sent_at is null)
      or
      (direction = 'outbound' and received_at is null)
    ),
  constraint mail_messages_read_state_check
    check (
      (is_read and read_at is not null)
      or
      (not is_read and read_at is null)
    )
);

comment on column public.mail_messages.provider_message_id is
  'Stable provider email identifier, such as Resend email_id; primary message idempotency key.';
comment on column public.mail_messages.provider_event_id is
  'Stable delivery/webhook event identifier when available; protects replay processing.';
comment on column public.mail_messages.internet_message_id is
  'RFC Message-ID used with In-Reply-To and References for conversation threading; not trusted as the sole idempotency key.';
comment on column public.mail_messages.reference_message_ids is
  'Ordered RFC References chain, stored as individual Message-ID values.';

create table public.mail_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null
    references public.mail_messages (id)
    on delete cascade,
  provider text not null,
  provider_attachment_id text,
  filename text not null,
  content_type text,
  content_disposition text,
  content_id text,
  size_bytes bigint,
  storage_provider text,
  storage_bucket text,
  storage_path text,
  checksum_sha256 text,
  created_at timestamptz not null default now(),
  constraint mail_attachments_provider_check
    check (char_length(btrim(provider)) between 1 and 100),
  constraint mail_attachments_filename_check
    check (char_length(filename) between 1 and 1024),
  constraint mail_attachments_size_bytes_check
    check (size_bytes is null or size_bytes >= 0),
  constraint mail_attachments_storage_reference_check
    check (
      (storage_bucket is null and storage_path is null)
      or
      (storage_provider is not null and storage_bucket is not null and storage_path is not null)
    ),
  constraint mail_attachments_checksum_sha256_check
    check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$')
);

comment on table public.mail_attachments is
  'Attachment metadata only. Binary attachment content must not be stored in Postgres.';
comment on column public.mail_attachments.storage_path is
  'Optional future durable object reference; temporary provider download URLs do not belong here.';

create unique index mail_messages_provider_message_id_key
  on public.mail_messages (provider, provider_message_id)
  where provider_message_id is not null;

create unique index mail_messages_provider_event_id_key
  on public.mail_messages (provider, provider_event_id)
  where provider_event_id is not null;

create index mail_threads_mailbox_latest_message_idx
  on public.mail_threads (mailbox, latest_message_at desc);

create index mail_threads_normalized_subject_idx
  on public.mail_threads (mailbox, normalized_subject)
  where normalized_subject is not null;

create index mail_messages_thread_timeline_idx
  on public.mail_messages (
    thread_id,
    (coalesce(received_at, sent_at, created_at))
  );

create index mail_messages_mailbox_timeline_idx
  on public.mail_messages (
    mailbox,
    (coalesce(received_at, sent_at, created_at)) desc
  );

create index mail_messages_unread_inbound_idx
  on public.mail_messages (mailbox, received_at desc)
  where direction = 'inbound' and not is_read;

create index mail_messages_internet_message_id_idx
  on public.mail_messages (internet_message_id)
  where internet_message_id is not null;

create index mail_messages_in_reply_to_idx
  on public.mail_messages (in_reply_to)
  where in_reply_to is not null;

create index mail_messages_references_idx
  on public.mail_messages using gin (reference_message_ids);

create index mail_attachments_message_idx
  on public.mail_attachments (message_id, created_at);

create unique index mail_attachments_provider_identifier_key
  on public.mail_attachments (
    message_id,
    provider,
    provider_attachment_id
  )
  where provider_attachment_id is not null;

create function public.set_mail_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_mail_threads_updated_at
before update on public.mail_threads
for each row execute function public.set_mail_updated_at();

create trigger set_mail_messages_updated_at
before update on public.mail_messages
for each row execute function public.set_mail_updated_at();

alter table public.mail_threads enable row level security;
alter table public.mail_messages enable row level security;
alter table public.mail_attachments enable row level security;

alter table public.mail_threads force row level security;
alter table public.mail_messages force row level security;
alter table public.mail_attachments force row level security;

revoke all on table public.mail_threads from anon, authenticated;
revoke all on table public.mail_messages from anon, authenticated;
revoke all on table public.mail_attachments from anon, authenticated;
revoke all on function public.set_mail_updated_at() from public;

grant select, insert, update, delete on table public.mail_threads to service_role;
grant select, insert, update, delete on table public.mail_messages to service_role;
grant select, insert, update, delete on table public.mail_attachments to service_role;
grant execute on function public.set_mail_updated_at() to service_role;
