# Final render QA — Campaign #003

## Output

- Master: `growth/.generated/campaigns/003-why-duct-size-matters/video/001-why-duct-size-matters.mp4`
- SHA-256: `F911D8D711BECDDB11811A8B0406148D75936921E8A9C0B93F6FB8A6C95A0883`
- Size: 11,508,277 bytes
- Container duration: 26.048 seconds
- Picture: H.264, 1080 × 1920, 30 fps, 780 frames / 26.000 seconds, yuv420p
- Audio: AAC, 48 kHz, stereo, 26.048 seconds
- Phone preview: `growth/.generated/campaigns/003-why-duct-size-matters/video/001-why-duct-size-matters-phone.mp4`
- Phone SHA-256: `D96313B116D556248EE405D62AC04FC4574B2D17689827739D13C4C3724E05D9`

## Visual, muted, and phone-size review

The actual final master was sampled at 0.5, 3.5, 5.5, 8.5, 12.5, 14.5, 15.8, 17.8, 20.5, 22.5, 24.5, and 25.8 seconds. The resulting contact sheet is at `growth/.generated/campaigns/003-why-duct-size-matters/final-review/final/final-campaign-contact-sheet.png`.

PASS: meaningful motion begins immediately; HVAC is recognizable; the same-airflow/smaller-area/higher-average-velocity relationship is understandable without audio; the sequence remains connected rather than card-based; the calculator is the payoff; the CTA and canonical route are readable at phone size.

## Calculator and engineering review

PASS: all three product states came from the hydrated local `/tools/duct-calculator` application through real input and button events. The sequence uses 3,000 CFM / 0.08, 5,000 CFM / 0.08, then 5,000 CFM / 0.10 with a 12-inch preferred side. The final state visibly reports 25.6-inch calculated round, 26-inch nominal round, and a 24 × 23 rectangular option. No UI or engineering value was fabricated and no formula was changed.

PASS: the video makes no universal velocity, friction, code-compliance, final-design, system-performance, or noise claim. The qualitative airflow sequence is labeled `CONCEPTUAL • AVERAGE VELOCITY`.

## Audio review

PASS: source and timeline inspection confirm continuous original 120 BPM electronic-mechanical music, a calculator-reveal change, CTA resolution, and supporting transition/UI effects. Exact mix gains are 0.78 music and 0.60 SFX.

Signal analysis of the authored WAVs at those gains found a -8.00 dBFS peak, -25.15 dBFS RMS, no clipping, and no unintended silence (longest interval below -45 dBFS: 0.091 seconds). Section RMS remains consistent from opening through CTA. The final MP4 contains the expected stereo AAC stream.

## Authorized polish and integration correction

The one focused polish pass reduced the calculator result-overlay type from 72 px to 64 px and increased the CTA URL from 29 px to 34 px. No further polish pass was performed.

The approved opening's first review encode had embedded letterboxing caused by encoder canvas initialization order. The existing approved 1080 × 1920 source frames were re-encoded after setting the portrait canvas before strip creation. No source frame, camera, model, lighting, timing, or opening design changed.

## Result

`FINAL PUBLICATION CANDIDATE / OWNER APPROVAL PENDING`. Internal QA passes. Nothing has been uploaded, scheduled, or published.
