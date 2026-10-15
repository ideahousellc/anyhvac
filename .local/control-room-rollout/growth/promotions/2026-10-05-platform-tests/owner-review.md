# Instagram and YouTube controlled tests - owner review

**Current YouTube review:** [Audio revision v2 with finished MP4 and sound](audio-revision-v2/owner-review.md). The owner approved the visual direction and rejected the original soundtrack. The pending package/hosting manifest now reference the revised licensed recording. The original YouTube asset, URL, digest and dry run below are historical and must not be used for publication. Instagram's verified scheduling result is recorded at the end of this document.

Status: OWNER REVIEW. Nothing scheduled or uploaded.

LinkedIn independent owner queue confirmation was recorded against saved post ID `6abffcdaa82b64098f40fcc6`; its existing provider post was not changed.

## instagram

Channel: anyhvac (6abd5952ea19ca0bde37267c)

Proposed time: 2026-10-05T19:00:00-04:00 / America/New_York. Unoccupied at read-only check; not reserved.

Asset: [public/social/duct-calculator-linkedin-ceea97e30f5c731e.png](../../../public/social/duct-calculator-linkedin-ceea97e30f5c731e.png)

Caption:

```text
Start your duct-design check with the right inputs.

Explore round and rectangular options with the free AnyHVAC HVAC Duct Calculator. Bring your airflow and design friction rate, then check fittings, noise, space and project requirements.

Visit anyhvac.net → Tools → HVAC Duct Calculator.

Save this post for your next design check.

#HVAC #DuctDesign #HVACDesign #MEPEngineering
```

Destination: https://www.anyhvac.net/tools/duct-calculator

Media URL: https://www.anyhvac.net/social/duct-calculator-linkedin-ceea97e30f5c731e.png

Dry run: PASS — content still unapproved. Duplicate detection: PASS. Public URL HTTP: 200.

Platform settings:

```json
{
  "type": "post",
  "shouldShareToFeed": true,
  "isAiGenerated": false
}
```

Package review digest: ee1febc7cd3d6cd219aa09f298a7adcb6d4443c25084d13de801bda688389706; approval remains null.

## youtube

Channel: AnyHVAC (6abd5b46ea19ca0bde375392)

Proposed time: 2026-10-08T19:00:00-04:00 / America/New_York. Unoccupied at read-only check; not reserved.

Asset: [growth/promotions/2026-10-05-platform-tests/mixed-air-short.mp4](../../../growth/promotions/2026-10-05-platform-tests/mixed-air-short.mp4)

Finished MP4: 15 seconds, static vertical promotional artwork with existing instrumental; watch all 15 seconds with sound.

Title: Two Air Streams, One Mixed State | Free AnyHVAC Tool

Caption:

```text
Define outdoor air and return air, set common project pressure and explore the adiabatic mixed state with AnyHVAC's free Mixed Air Calculator. Mixing uses a dry-air mass basis; verify inputs and assumptions before design use.

Visit anyhvac.net, then Tools > Mixed Air Calculator.

Equipment photograph is illustrative, not a mixing-layout diagram or measured operating condition.

#HVAC #MixedAir #Psychrometrics #Shorts
```

Destination: https://www.anyhvac.net/tools/mixed-air-calculator

Media URL: https://www.anyhvac.net/social/mixed-air-short-86098e26c422d213.mp4

Dry run: BLOCKED. Duplicate detection: PASS. Public URL HTTP: 404.

Platform settings:

```json
{
  "title": "Two Air Streams, One Mixed State | Free AnyHVAC Tool",
  "categoryId": "28",
  "privacy": "public",
  "madeForKids": false,
  "notifySubscribers": true,
  "embeddable": true,
  "license": "youtube",
  "isAiGenerated": false
}
```

Package review digest: 878e44cf1f214379b15c0178ed896676d5a80a104521d794a19e65eceae65d58; approval remains null.

## Hosting and authorization

Reuse the existing Instagram PNG URL; no new hosting needed. The YouTube URL is proposed and returns 404. Add the exact reviewed MP4 to the next approved weekly media manifest, then host all new approved weekly assets in one media-only commit and one Vercel deployment. See [hosting-plan.md](hosting-plan.md) and [requirements-review.md](requirements-review.md). No new paid service is proposed; existing-plan quotas were not inspected.

Owner decision must cover each finished asset (including full video/audio review), exact copy, metadata and time. Hosting/deployment and scheduling need explicit authorization. After authorized hosting, verify every URL/hash and refresh live queue/history before scheduling. Existing LinkedIn post stays untouched.

## October 2 controlled Instagram execution result

The owner approved only the Instagram package and authorized exactly one operation. Buffer post `6ac0087d4d76cf8285c7d95c` is independently verified as scheduled for October 5 at 7 PM EDT, with automatic publishing, type=post and shouldShareToFeed=true. Professional Business account and content-publishing scope were verified before creation. See `instagram-publication-record.json`. This is scheduling confirmation, not publication confirmation.

The earlier dry-run section above is historical preparation evidence. YouTube remains pending visual and audio approval; no MP4 upload or deployment occurred. Future weekly hosting workflow is prepared in `hosting-plan.md`, with no additional external authorization implied.
