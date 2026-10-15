import { Audio } from "@remotion/media";
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type DuctSizeVideoInput = {
  campaignId: string;
  videoId: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  openingVideo: string;
  openingEndFrame: string;
  calculatorStates: string[];
  logoPath: string;
  destinationUrl: string;
  music: { path: string; volume: number };
  sfx: { path: string; volume: number };
};

const colors = {
  ink: "#f4f8fb",
  navy: "#07111b",
  deep: "#03080d",
  cyan: "#61d9ff",
  blue: "#0878d1",
  orange: "#ff8450",
  steel: "#9caab1",
};

const base: CSSProperties = {
  fontFamily: "Arial, Helvetica, sans-serif",
  color: colors.ink,
  overflow: "hidden",
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const progress = (frame: number, start: number, end: number) =>
  clamp((frame - start) / (end - start));
const eased = (frame: number, start: number, end: number) => {
  const value = progress(frame, start, end);
  return value * value * (3 - 2 * value);
};

function Enter({
  children,
  frame,
  start,
  style,
}: {
  children: ReactNode;
  frame: number;
  start: number;
  style?: CSSProperties;
}) {
  const { fps } = useVideoConfig();
  const value = spring({
    frame: frame - start,
    fps,
    config: { damping: 20, stiffness: 190, mass: 0.55 },
  });
  return (
    <div
      style={{
        opacity: value,
        transform: `translateY(${interpolate(value, [0, 1], [36, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SafeVignette() {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        boxShadow: "inset 0 0 120px rgba(0,0,0,.48)",
        border: "1px solid rgba(255,255,255,.035)",
      }}
    />
  );
}

function Opening({ frame, input }: { frame: number; input: DuctSizeVideoInput }) {
  const textIn = eased(frame, 24, 38);
  const textOut = 1 - eased(frame, 72, 87);
  return (
    <AbsoluteFill style={{ background: colors.deep }}>
      <OffthreadVideo
        src={staticFile(input.openingVideo)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          left: 58,
          top: 210,
          opacity: textIn * textOut,
          transform: `translateX(${interpolate(textIn, [0, 1], [-30, 0])}px)`,
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: 7,
          textShadow: "0 4px 20px rgba(0,0,0,.85)",
        }}
      >
        SAME AIRFLOW
        <div style={{ marginTop: 12, width: 168, height: 3, background: colors.cyan }} />
      </div>
      <SafeVignette />
    </AbsoluteFill>
  );
}

function FlowStreaks({ frame, speed = 1 }: { frame: number; speed?: number }) {
  return (
    <>
      {Array.from({ length: 14 }, (_, index) => {
        const lane = (index - 6.5) / 6.5;
        const travel = ((frame * speed * 18 + index * 121) % 1200) - 200;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: 540 + lane * 310,
              top: 960 + lane * 520,
              width: 5,
              height: 90 + (index % 4) * 25,
              borderRadius: 10,
              background: index % 3 ? colors.cyan : colors.ink,
              opacity: 0.18 + (index % 4) * 0.08,
              transform: `translateY(${travel}px) rotate(${lane * -4}deg)`,
              boxShadow: `0 0 18px ${colors.cyan}`,
            }}
          />
        );
      })}
    </>
  );
}

function Consequence({ frame, input }: { frame: number; input: DuctSizeVideoInput }) {
  const lastFrameFade = 1 - eased(frame, 0, 22);
  const contraction = eased(frame, 8, 86);
  const innerWidth = interpolate(contraction, [0, 1], [690, 450]);
  const innerHeight = interpolate(contraction, [0, 1], [930, 610]);
  const left = (1080 - innerWidth) / 2;
  const top = (1920 - innerHeight) / 2;
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 48%, #203743 0%, #0a1721 48%, #03080d 100%)",
      }}
    >
      <Img
        src={staticFile(input.openingEndFrame)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: lastFrameFade,
          transform: `scale(${1 + progress(frame, 0, 22) * 0.05})`,
        }}
      />
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: 1 - lastFrameFade * 0.45 }}>
        <defs>
          <linearGradient id="steelTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#788990" />
            <stop offset="1" stopColor="#172630" />
          </linearGradient>
          <linearGradient id="steelSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#12202a" />
            <stop offset=".55" stopColor="#65777e" />
            <stop offset="1" stopColor="#101b23" />
          </linearGradient>
        </defs>
        <polygon points={`0,0 1080,0 ${left + innerWidth},${top} ${left},${top}`} fill="url(#steelTop)" />
        <polygon points={`0,1920 1080,1920 ${left + innerWidth},${top + innerHeight} ${left},${top + innerHeight}`} fill="url(#steelTop)" />
        <polygon points={`0,0 ${left},${top} ${left},${top + innerHeight} 0,1920`} fill="url(#steelSide)" />
        <polygon points={`1080,0 ${left + innerWidth},${top} ${left + innerWidth},${top + innerHeight} 1080,1920`} fill="url(#steelSide)" />
        <rect x={left} y={top} width={innerWidth} height={innerHeight} fill="#010407" stroke="#d5e0e4" strokeOpacity=".56" strokeWidth="5" />
      </svg>
      <FlowStreaks frame={frame} speed={1 + contraction * 1.35} />
      <div style={{ position: "absolute", left: 58, right: 58, top: 205 }}>
        <Enter frame={frame} start={10} style={{ fontSize: 31, fontWeight: 800, letterSpacing: 6, color: "#c9d6dc" }}>
          SAME AIRFLOW
        </Enter>
        <Enter frame={frame} start={32} style={{ marginTop: 16, fontSize: 87, lineHeight: 0.94, fontWeight: 950, letterSpacing: -4 }}>
          SMALLER DUCT
        </Enter>
        <Enter frame={frame} start={68} style={{ marginTop: 20, fontSize: 68, lineHeight: 1, fontWeight: 950, color: colors.orange }}>
          HIGHER VELOCITY
        </Enter>
      </div>
      <div style={{ position: "absolute", bottom: 74, right: 54, fontSize: 16, fontWeight: 800, letterSpacing: 3, opacity: 0.62 }}>
        CONCEPTUAL • AVERAGE VELOCITY
      </div>
      <SafeVignette />
    </AbsoluteFill>
  );
}

function Implications({ frame }: { frame: number }) {
  const sweep = eased(frame, 0, 105);
  const words = [
    { label: "VELOCITY", start: 5, color: colors.cyan },
    { label: "FRICTION", start: 35, color: colors.orange },
    { label: "SPACE", start: 65, color: colors.ink },
  ];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(150deg, ${colors.deep}, #102634 58%, #06101a)` }}>
      <div
        style={{
          position: "absolute",
          width: 1240,
          height: 10,
          left: -80,
          top: 960,
          transform: "rotate(-58deg)",
          transformOrigin: "center",
          background: `linear-gradient(90deg, ${colors.cyan}, ${colors.orange})`,
          boxShadow: `0 0 44px ${colors.cyan}`,
          clipPath: `inset(0 ${100 - sweep * 100}% 0 0)`,
        }}
      />
      <div style={{ position: "absolute", left: 60, right: 60, top: 260 }}>
        {words.map((word, index) => (
          <Enter
            key={word.label}
            frame={frame}
            start={word.start}
            style={{
              marginTop: index === 0 ? 0 : 56,
              fontSize: 116,
              lineHeight: 0.84,
              fontWeight: 950,
              letterSpacing: -6,
              color: word.color,
              textAlign: index === 1 ? "right" : "left",
            }}
          >
            {word.label}.
          </Enter>
        ))}
      </div>
      <Enter
        frame={frame}
        start={86}
        style={{ position: "absolute", left: 60, right: 60, bottom: 245, fontSize: 38, fontWeight: 850, letterSpacing: 2 }}
      >
        DUCT SIZE IS A DESIGN DECISION.
      </Enter>
      <SafeVignette />
    </AbsoluteFill>
  );
}

function Question({ frame, input }: { frame: number; input: DuctSizeVideoInput }) {
  const rotate = frame * 0.7;
  const reveal = eased(frame, 48, 88);
  const circle = interpolate(reveal, [0, 1], [0, 1450]);
  return (
    <AbsoluteFill style={{ background: colors.deep }}>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 455,
          width: 900,
          height: 900,
          borderRadius: "50%",
          border: `28px solid ${colors.steel}`,
          boxShadow: `inset 0 0 100px rgba(97,217,255,.22), 0 0 80px rgba(97,217,255,.16)`,
          transform: `rotate(${rotate}deg) scale(${interpolate(eased(frame, 0, 24), [0, 1], [0.72, 1])})`,
          background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,.48) 0 1deg, transparent 1deg 8deg)",
        }}
      />
      <div style={{ position: "absolute", left: 80, right: 80, top: 760, textAlign: "center" }}>
        <Enter frame={frame} start={8} style={{ fontSize: 98, lineHeight: 0.92, fontWeight: 950, letterSpacing: -5 }}>
          SO WHAT SIZE?
        </Enter>
      </div>
      <Img
        src={staticFile(input.calculatorStates[0])}
        style={{
          position: "absolute",
          width: 1728,
          height: 1920,
          left: -350,
          top: 0,
          objectFit: "cover",
          clipPath: `circle(${circle}px at 540px 960px)`,
        }}
      />
      <SafeVignette />
    </AbsoluteFill>
  );
}

function Calculator({ frame, input }: { frame: number; input: DuctSizeVideoInput }) {
  const toAirflow = eased(frame, 32, 50);
  const toFriction = eased(frame, 92, 112);
  const toResults = eased(frame, 148, 190);
  const imageScale = interpolate(toResults, [0, 1], [1, 1.35]);
  const width = 1728 * imageScale;
  const height = 1920 * imageScale;
  const left = interpolate(toResults, [0, 1], [-360, -950]);
  const top = interpolate(toResults, [0, 1], [-55, -630]);
  const stateOpacity = [1 - toAirflow, toAirflow * (1 - toFriction), toFriction];
  const focusPulse = 0.65 + Math.sin(frame / 5) * 0.12;
  return (
    <AbsoluteFill style={{ background: "#e8edf1" }}>
      {input.calculatorStates.map((source, index) => (
        <Img
          key={source}
          src={staticFile(source)}
          style={{
            position: "absolute",
            width,
            height,
            left,
            top,
            objectFit: "fill",
            opacity: stateOpacity[index],
            filter: "saturate(.98) contrast(1.02)",
          }}
        />
      ))}
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 130px rgba(7,17,27,.44)" }} />
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 68,
          padding: "16px 22px",
          background: "rgba(7,17,27,.91)",
          borderLeft: `6px solid ${colors.cyan}`,
          fontSize: 24,
          fontWeight: 900,
          letterSpacing: 3,
        }}
      >
        REAL ANYHVAC CALCULATOR
      </div>
      {frame < 88 ? (
        <>
          <div
            style={{
              position: "absolute",
              right: 42,
              top: 575,
              width: 300,
              height: 88,
              border: `6px solid rgba(97,217,255,${focusPulse})`,
              borderRadius: 22,
              boxShadow: `0 0 28px rgba(97,217,255,${focusPulse * 0.65})`,
            }}
          />
          <Enter frame={frame} start={8} style={{ position: "absolute", left: 48, right: 48, bottom: 120, fontSize: 46, fontWeight: 950 }}>
            AIRFLOW: {frame < 43 ? "3,000" : "5,000"} CFM
          </Enter>
        </>
      ) : null}
      {frame >= 88 && frame < 158 ? (
        <>
          <div
            style={{
              position: "absolute",
              right: 38,
              top: 700,
              width: 332,
              height: 88,
              border: `6px solid rgba(255,132,80,${focusPulse})`,
              borderRadius: 22,
              boxShadow: `0 0 28px rgba(255,132,80,${focusPulse * 0.65})`,
            }}
          />
          <Enter frame={frame} start={92} style={{ position: "absolute", left: 48, right: 48, bottom: 120, fontSize: 43, fontWeight: 950 }}>
            FRICTION EXAMPLE: 0.10
          </Enter>
        </>
      ) : null}
      {frame >= 158 ? (
        <div style={{ position: "absolute", left: 42, right: 42, top: 160 }}>
          <Enter frame={frame} start={158} style={{ fontSize: 30, fontWeight: 900, letterSpacing: 4, color: "#15324a" }}>
            AUTHENTIC RESULTS
          </Enter>
          <Enter frame={frame} start={170} style={{ marginTop: 12, fontSize: 64, lineHeight: 0.95, fontWeight: 950, color: "#8f2d20" }}>
            25.6 IN → 26 IN
          </Enter>
          <Enter frame={frame} start={187} style={{ marginTop: 18, fontSize: 54, fontWeight: 950, color: "#166637" }}>
            24&quot; × 23&quot;
          </Enter>
        </div>
      ) : null}
      <SafeVignette />
    </AbsoluteFill>
  );
}

function Cta({ frame, input }: { frame: number; input: DuctSizeVideoInput }) {
  const drift = interpolate(frame, [0, 120], [1.03, 1.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: colors.blue }}>
      <Img
        src={staticFile(input.calculatorStates[2])}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${drift})`,
          filter: "blur(8px) saturate(.75)",
          opacity: 0.28,
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(145deg, rgba(8,120,209,.95), rgba(3,38,70,.97) 62%, rgba(7,17,27,.98))" }} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 330 }}>
        <Enter frame={frame} start={0}>
          <div style={{ width: 122, height: 122, padding: 12, borderRadius: 26, background: "white", boxShadow: "0 18px 50px rgba(0,0,0,.3)" }}>
            <Img src={staticFile(input.logoPath)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        </Enter>
        <Enter frame={frame} start={8} style={{ marginTop: 50, fontSize: 104, lineHeight: 0.9, fontWeight: 950, letterSpacing: -6 }}>
          SIZE IT FASTER.
        </Enter>
        <Enter frame={frame} start={22} style={{ marginTop: 34, fontSize: 38, fontWeight: 900, letterSpacing: 2, color: "#d7efff" }}>
          ANYHVAC DUCT CALCULATOR
        </Enter>
        <Enter frame={frame} start={34} style={{ marginTop: 18, fontSize: 34, fontWeight: 850 }}>
          FREE • NO SIGNUP
        </Enter>
        <Enter
          frame={frame}
          start={48}
          style={{
            marginTop: 54,
            padding: "24px 24px",
            borderRadius: 18,
            background: "white",
            color: colors.blue,
            fontSize: 34,
            fontWeight: 950,
            overflowWrap: "anywhere",
          }}
        >
          anyhvac.net/tools/duct-calculator
        </Enter>
      </div>
      <SafeVignette />
    </AbsoluteFill>
  );
}

export function DuctSizeMatters(input: DuctSizeVideoInput) {
  const frame = useCurrentFrame();
  let scene: ReactNode;
  if (frame < 90) scene = <Opening frame={frame} input={input} />;
  else if (frame < 210) scene = <Consequence frame={frame - 90} input={input} />;
  else if (frame < 330) scene = <Implications frame={frame - 210} />;
  else if (frame < 420) scene = <Question frame={frame - 330} input={input} />;
  else if (frame < 660) scene = <Calculator frame={frame - 420} input={input} />;
  else scene = <Cta frame={frame - 660} input={input} />;

  return (
    <AbsoluteFill style={base}>
      {scene}
      <Audio src={staticFile(input.music.path)} volume={input.music.volume} />
      <Audio src={staticFile(input.sfx.path)} volume={input.sfx.volume} />
    </AbsoluteFill>
  );
}
