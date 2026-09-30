# Generated-media lifecycle

## Storage philosophy

Git records workflow, source content, technical claims, structured inputs,
templates, campaign metadata, provenance, and publication history. It does not
archive MP4 renders, social image exports, carousel exports, thumbnails, temporary
AI media, narration, music mixes, or intermediate frames.

Disposable media lives only under `growth/.generated/`:

```text
growth/.generated/campaigns/<campaign-id>/
  video/
  images/
  audio/
  previews/
```

## States

`DRAFT → READY_FOR_REVIEW → APPROVED → QUEUED → PUBLISHED_CONFIRMED → CLEANUP_ELIGIBLE`

Approval is not publication. Do not delete media merely because Cesar says
“Approved.” A generated file becomes cleanup-eligible only when:

1. successful publication or scheduling is confirmed and the publishing system no
   longer needs the local file;
2. the campaign is explicitly abandoned or rejected; or
3. an unpublished temporary file exceeds its configured retention period.

The initial unpublished-media retention is seven days. This is a configurable
manifest value, not a scheduled job. Publication records and source manifests are
never cleanup targets.

The local cleanup command is dry-run by default and requires `--execute` to delete
eligible files. It validates every resolved target against `growth/.generated/`,
deletes files only, and never recursively removes directories.
