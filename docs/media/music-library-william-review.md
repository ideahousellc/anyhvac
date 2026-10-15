# William — shared music library rights review

October 14, 2026. **PASS for licensed synchronized AnyHVAC web/social video use; owner review/publication approval remains separate.** Exact local recordings were matched to the provider records and official download byte comparisons; filenames alone were not treated as rights evidence.

| Local recording | Verified title / artist | Official catalog / download | SHA-256 |
|---|---|---|---|
| `.local/media-library/music/mixkit-new-bass-01-720.mp3` | New Bass 01 — Lily J | [News catalog](https://mixkit.co/free-stock-music/tag/news/); [official MP3](https://assets.mixkit.co/music/720/720.mp3) | `6389a142c19ca427a32517a815f06eeaa2b6be0512edb5137c502bf840ac0f63` |
| `.local/media-library/music/mixkit-chicken-out-1166.mp3` | Chicken Out — Michael Ramir C. | [Corporate Music catalog](https://mixkit.co/free-stock-music/corporate-music/); [official MP3](https://assets.mixkit.co/music/1166/1166.mp3) | `0520ac7ec9e75e453b394220be73be0464fdb7ab44fa97466777dde0d3d0818a` |

Provider comparison records at `.local/media-library/music/identity-verification.json` report exact byte matches at 2026-10-14T19:17:03.793Z / 19:17:04.240Z, respectively (3,839,999 / 3,853,627 bytes). William independently recomputed the local hashes and byte lengths, and parsed saved official catalog JSON-LD: each `MusicRecording` binds the exact title, artist, matching download URL and Mixkit Stock Music Free License. Catalog association is unambiguous. Full source audio and downloaded evidence remain local, outside deployment assets.

The current [Stock Music Free License](https://mixkit.co/license/modal/musicFree/) permits commercial and noncommercial web/social video, advertising and educational uses, including YouTube. Editing for synchronized video is allowed. It excludes television/radio, CDs/DVDs, games, music-only remixes, ownership claims and rights-management registration. [Mixkit's music FAQ](https://mixkit.co/free-stock-music/) states attribution is unnecessary; AnyHVAC may retain a voluntary title/artist/provider credit.

The [User Terms](https://mixkit.co/terms/), revised October 2, 2025, also apply. Keep this as an internal production library: do not publish standalone MP3s or offer a stock/inventory redistribution service. Do not mass-download the catalog or transfer recordings to a new service. The two-file exact-identity check does not establish permission for unrelated files. If a platform claim occurs, retain the license/source evidence and use the provider's claim-assistance procedure; no rights-management registration or claim-free guarantee is implied.

Saved evidence: `.local/media-library/music/evidence/720-catalog.html`, `1166-catalog.html`, `music-license.html`, `music-faq.html`, and `terms.html`. Recheck license conditions for new uses and preserve the source hashes with each rendered derivative. Neither license verification nor acoustic measurements establish subjective music suitability: owner playback approval is still required. No existing batch asset, caption, approval, production configuration, scheduled post, runner or startup task was changed by this review.
