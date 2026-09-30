import { Audio } from "@remotion/media";
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { getAudioTracks, type VideoInput, type VideoScene } from "../../schema";

const colors = {
  background: "#f3f5f8",
  surface: "#ffffff",
  surfaceSoft: "#e9eef4",
  foreground: "#1f2a37",
  muted: "#647184",
  primary: "#0057b8",
  primaryLight: "#66b0ff",
  danger: "#b33b32",
} as const;

const base: CSSProperties = {
  fontFamily: "Arial, Helvetica, sans-serif",
  color: colors.foreground,
};

function enter(frame: number, fps: number, delay = 0) {
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 22, stiffness: 120, mass: 0.8 },
  });
  return {
    opacity: interpolate(progress, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(progress, [0, 1], [42, 0])}px)`,
  } satisfies CSSProperties;
}

function BrandBar({ logoPath }: { logoPath: string }) {
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 20,
        top: 48,
        left: 48,
        right: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        border: "1px solid rgba(255, 255, 255, 0.75)",
        borderRadius: 34,
        background: "rgba(255, 255, 255, 0.94)",
        boxShadow: "0 16px 48px rgba(31, 42, 55, 0.10)",
        padding: "18px 24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <Img
          src={staticFile(logoPath)}
          style={{ width: 86, height: 86, objectFit: "contain" }}
        />
        <div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1.2 }}>
            Any<span style={{ color: colors.primary }}>HVAC</span>
          </div>
          <div
            style={{
              marginTop: 7,
              color: colors.primary,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 3.1,
              textTransform: "uppercase",
            }}
          >
            Free HVAC calculators & tools
          </div>
        </div>
      </div>
      <div
        style={{
          borderRadius: 999,
          background: "#dcecff",
          color: colors.primary,
          padding: "14px 22px",
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        Design Reference #02
      </div>
    </div>
  );
}

function Frame({
  scene,
  children,
}: {
  scene: VideoScene;
  children?: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ ...base, padding: "300px 72px 210px" }}>
      <div style={enter(frame, fps)}>
        <div
          style={{
            color: colors.primary,
            fontSize: 24,
            fontWeight: 850,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          {scene.eyebrow}
        </div>
        <h1
          style={{
            maxWidth: 920,
            margin: "32px 0 0",
            fontSize: scene.kind === "hook" ? 126 : 78,
            fontWeight: 850,
            letterSpacing: -4.4,
            lineHeight: 1.04,
          }}
        >
          {scene.title}
        </h1>
      </div>
      {scene.body ? (
        <p
          style={{
            ...enter(frame, fps, 8),
            maxWidth: 900,
            margin: "48px 0 0",
            color: colors.muted,
            fontSize: 43,
            fontWeight: 560,
            lineHeight: 1.42,
          }}
        >
          {scene.body}
        </p>
      ) : null}
      {children}
      {scene.sourceNote ? (
        <div
          style={{
            ...enter(frame, fps, 16),
            position: "absolute",
            right: 72,
            bottom: 188,
            left: 72,
            borderLeft: `6px solid ${colors.primaryLight}`,
            paddingLeft: 24,
            color: colors.muted,
            fontSize: 25,
            fontWeight: 650,
            lineHeight: 1.4,
          }}
        >
          {scene.sourceNote}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

function PressureDiagram() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flow = interpolate(frame, [10, fps * 2.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        ...enter(frame, fps, 12),
        position: "relative",
        height: 270,
        marginTop: 66,
        borderRadius: 38,
        background: colors.surface,
        boxShadow: "0 24px 70px rgba(44, 63, 82, 0.13)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 124,
          left: 82,
          width: 260 * flow,
          height: 8,
          borderRadius: 8,
          background: colors.primaryLight,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 61,
          left: 350,
          width: 250,
          height: 150,
          display: "grid",
          placeItems: "center",
          border: `5px solid ${colors.primary}`,
          borderRadius: 30,
          color: colors.primary,
          fontSize: 27,
          fontWeight: 850,
          textTransform: "uppercase",
        }}
      >
        Equipment / fan
      </div>
      <div
        style={{
          position: "absolute",
          top: 124,
          left: 602,
          width: 260 * flow,
          height: 8,
          borderRadius: 8,
          background: colors.primary,
        }}
      />
      <div style={{ position: "absolute", top: 53, left: 72, fontSize: 25, fontWeight: 800 }}>
        RETURN <span style={{ color: colors.primary }}>negative</span>
      </div>
      <div style={{ position: "absolute", top: 53, right: 72, fontSize: 25, fontWeight: 800 }}>
        SUPPLY <span style={{ color: colors.primary }}>positive</span>
      </div>
    </div>
  );
}

function Example({ scene }: { scene: VideoScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Frame scene={scene}>
      <div style={{ display: "grid", gap: 20, marginTop: 48 }}>
        {scene.values?.map((item, index) => (
          <div
            key={item.label}
            style={{
              ...enter(frame, fps, 6 + index * 7),
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: 26,
              background: colors.surface,
              padding: "28px 34px",
              boxShadow: "0 16px 42px rgba(44, 63, 82, 0.1)",
              fontSize: 34,
            }}
          >
            <span style={{ color: colors.muted, fontWeight: 700 }}>{item.label}</span>
            <strong style={{ color: colors.primary, fontSize: 42 }}>{item.value}</strong>
          </div>
        ))}
      </div>
      <div
        style={{
          ...enter(frame, fps, 28),
          marginTop: 52,
          borderRadius: 30,
          background: colors.foreground,
          color: "white",
          padding: "34px 36px",
          textAlign: "center",
          fontSize: 42,
          fontWeight: 800,
          letterSpacing: -1,
        }}
      >
        {scene.formula}
      </div>
    </Frame>
  );
}

function Warning({ scene }: { scene: VideoScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const emphasis = interpolate(Math.sin(frame / 13), [-1, 1], [0.97, 1]);
  return (
    <Frame scene={scene}>
      <div
        style={{
          ...enter(frame, fps, 18),
          marginTop: 64,
          transform: `scale(${emphasis})`,
          transformOrigin: "left center",
          border: `4px solid ${colors.primary}`,
          borderRadius: 34,
          background: "#e7f2ff",
          padding: "44px 42px",
          color: colors.primary,
          fontSize: 36,
          fontWeight: 800,
          lineHeight: 1.35,
        }}
      >
        Pressure data needs the correct equipment data, operating conditions, and
        measurement procedure.
      </div>
    </Frame>
  );
}

function EndCard({ scene }: { scene: VideoScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        ...base,
        justifyContent: "center",
        padding: "250px 72px 230px",
        background: colors.primary,
        color: "white",
      }}
    >
      <div style={enter(frame, fps)}>
        <div
          style={{
            color: "#d9ecff",
            fontSize: 24,
            fontWeight: 850,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          {scene.eyebrow}
        </div>
        <h1
          style={{
            margin: "34px 0 0",
            fontSize: 78,
            fontWeight: 850,
            lineHeight: 1.06,
            letterSpacing: -3.8,
          }}
        >
          {scene.title}
        </h1>
        <div
          style={{
            marginTop: 64,
            borderRadius: 28,
            background: "white",
            color: colors.primary,
            padding: "30px 34px",
            fontSize: 30,
            fontWeight: 800,
            lineHeight: 1.35,
          }}
        >
          {scene.body}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Scene({ scene }: { scene: VideoScene }) {
  if (scene.kind === "example") return <Example scene={scene} />;
  if (scene.kind === "warning") return <Warning scene={scene} />;
  if (scene.kind === "cta") return <EndCard scene={scene} />;
  return (
    <Frame scene={scene}>
      {scene.kind === "concept" ? <PressureDiagram /> : null}
    </Frame>
  );
}

export function AnyHVACTechnicalShort(input: VideoInput) {
  const scenesWithTiming = input.scenes.map((scene, index) => ({
    scene,
    from:
      input.scenes
        .slice(0, index)
        .reduce((sum, previous) => sum + previous.durationSeconds, 0) * input.fps,
    durationInFrames: scene.durationSeconds * input.fps,
  }));

  return (
    <AbsoluteFill style={{ ...base, background: colors.background }}>
      {scenesWithTiming.map(({ scene, from, durationInFrames }) => (
        <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>
          <Scene scene={scene} />
        </Sequence>
      ))}
      <BrandBar logoPath={input.logoPath} />
      <div
        style={{
          position: "absolute",
          zIndex: 20,
          right: 48,
          bottom: 48,
          left: 48,
          display: "flex",
          justifyContent: "space-between",
          gap: 24,
          borderRadius: 18,
          background: "rgba(255, 255, 255, 0.90)",
          padding: "14px 18px",
          color: colors.muted,
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        <span>{input.sourceNote}</span>
        <span>{input.campaignId}</span>
      </div>
      {getAudioTracks(input.audio).map((track, index) => (
        <Audio
          key={`${track.role}-${track.path}-${index}`}
          src={staticFile(track.path)}
          volume={track.volume}
        />
      ))}
    </AbsoluteFill>
  );
}
