alter table public.mail_threads
  add column trashed_at timestamptz;

comment on column public.mail_threads.trashed_at is
  'Soft-delete timestamp for recoverable, thread-level Control Room Trash.';

create index mail_threads_trash_latest_message_idx
  on public.mail_threads (trashed_at, latest_message_at desc);
