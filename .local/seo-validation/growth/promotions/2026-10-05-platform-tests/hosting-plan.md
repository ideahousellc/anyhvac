# Proposed weekly media hosting workflow

Status: PREPARED FOR FUTURE OWNER-APPROVED BATCHES. This workflow itself does not
authorize uploads, commits, pushes, deployments or scheduling. The separately
authorized Instagram test reused the existing hosted PNG and required no deployment.

Reuse the established `public/social/` + GitHub `main` + Vercel production workflow.
Prepare every unique final weekly PNG/MP4 locally before review. Reuse deployed
assets when their bytes remain unchanged; one shared asset URL may serve multiple
platforms. Give new files content-hashed names and retain a local manifest of
source path, target path, URL, full SHA-256, bytes, rights and approved batch version.

Present the finished five-package batch and exact platform copies/settings/slots.
After explicit content and deployment authorization, copy only approved new media
to `public/social/`, stage only manifest-listed files, inspect the staged and
committed file lists, then push one media-only commit for the entire batch. This
uses one deployment per approved batch, rather than one per post. No private
operational records, license-evidence HTML, Buffer credentials, source captures,
or unrelated worktree files belong in that deployment commit.

After Vercel succeeds, GET each final URL without credentials or redirects and
require HTTP 200, correct MIME type and exact SHA-256. Bind the reviewed captions,
channels, metadata, times and media hashes to scheduling approvals. Refresh each
channel's complete queue/history before each authorized create operation. Keep
the ATTEMPTING journal, returned IDs and independent queue confirmation. An
ambiguous create stops the batch; inspect the queue before considering a retry.

Keep media URLs available through successful publication and retention review;
never overwrite content-hashed files. Future deployments must retain still-needed
assets. Do not delete assets merely because their queue time has passed.

No new paid service or hosting account is proposed. Existing Vercel-plan usage,
bandwidth and repository growth still need monitoring; current billing and spare
quota were not inspected. The documented 100 MB Hobby / 1 GB Pro CLI upload cap
is a total source-upload constraint, not an individual MP4 size allowance and not
proof of the current project's plan. This task continues using the Git workflow.
If media growth later makes this impractical, evaluate separate object storage
in a separately authorized setup task; do not silently add a host or permissions.

For these two tests, Instagram reused the already-live approved PNG. Only the
788,052-byte Mixed Air MP4 needs future hosting. Its proposed target and full hash
are in `hosting-manifest.json`. It can join a future batch after visual/audio,
hosting and deployment authorization. It remains pending and has not been uploaded.

Sources checked October 2, 2026:
- https://developers.buffer.com/guides/hosting-media.html
- https://vercel.com/docs/git/vercel-for-github
- https://vercel.com/docs/limits
