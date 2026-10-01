import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";

const WIDTH = 1080;
const HEIGHT = 1920;

type Point = { x: number; y: number };
type Rect = { left: number; top: number; right: number; bottom: number };

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => Easing.inOut(Easing.cubic)(clamp(value));
const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

function rectAt(center: Point, width: number, height: number): Rect {
  return {
    left: center.x - width / 2,
    top: center.y - height / 2,
    right: center.x + width / 2,
    bottom: center.y + height / 2,
  };
}

function polygon(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function DuctFrame({ rect, opacity, width }: { rect: Rect; opacity: number; width: number }) {
  const chamfer = Math.min(18, (rect.right - rect.left) * 0.025);
  const d = [
    `M ${rect.left + chamfer} ${rect.top}`,
    `L ${rect.right - chamfer} ${rect.top}`,
    `L ${rect.right} ${rect.top + chamfer}`,
    `L ${rect.right} ${rect.bottom - chamfer}`,
    `L ${rect.right - chamfer} ${rect.bottom}`,
    `L ${rect.left + chamfer} ${rect.bottom}`,
    `L ${rect.left} ${rect.bottom - chamfer}`,
    `L ${rect.left} ${rect.top + chamfer} Z`,
  ].join(" ");

  return (
    <g opacity={opacity}>
      <path d={d} fill="none" stroke="#303a41" strokeWidth={width + 5} />
      <path d={d} fill="none" stroke="url(#ribLight)" strokeWidth={width} />
      <path d={d} fill="none" stroke="#e7ebed" strokeOpacity={0.35} strokeWidth={1.4} />
    </g>
  );
}

function Rivets({ rect, opacity }: { rect: Rect; opacity: number }) {
  const count = 7;
  const rivets: Point[] = [];
  for (let index = 1; index < count; index += 1) {
    const amount = index / count;
    rivets.push({ x: mix(rect.left, rect.right, amount), y: rect.top + 8 });
    rivets.push({ x: mix(rect.left, rect.right, amount), y: rect.bottom - 8 });
  }
  return (
    <g opacity={opacity}>
      {rivets.map((point, index) => (
        <g key={`${point.x}-${point.y}-${index}`}>
          <circle cx={point.x + 1.5} cy={point.y + 2} r={4.2} fill="#293239" opacity={0.65} />
          <circle cx={point.x} cy={point.y} r={3.2} fill="url(#rivet)" />
        </g>
      ))}
    </g>
  );
}

function Airflow({ frame, center }: { frame: number; center: Point }) {
  const streams = [
    `M 106 1430 C 286 1190 402 956 ${center.x - 30} ${center.y + 10}`,
    `M 950 1320 C 816 1125 728 945 ${center.x + 28} ${center.y + 8}`,
    `M 164 610 C 330 650 432 720 ${center.x - 14} ${center.y - 2}`,
    `M 930 535 C 790 628 708 698 ${center.x + 18} ${center.y - 4}`,
    `M 325 1780 C 385 1410 470 1050 ${center.x - 7} ${center.y + 18}`,
    `M 760 1680 C 720 1360 660 1045 ${center.x + 9} ${center.y + 18}`,
  ];
  return (
    <g filter="url(#airGlow)" opacity="0.72">
      {streams.map((stream, index) => (
        <path
          key={stream}
          d={stream}
          fill="none"
          stroke={index % 3 === 0 ? "#edf9fc" : "#b7e0e8"}
          strokeLinecap="round"
          strokeOpacity={0.28 + (index % 2) * 0.12}
          strokeWidth={3.2 + (index % 3) * 0.7}
          strokeDasharray={`${90 + index * 11} ${190 + index * 17}`}
          strokeDashoffset={-frame * (14 + index * 0.8) - index * 73}
        />
      ))}
    </g>
  );
}

export function DuctOpeningPrevisualization() {
  const frame = useCurrentFrame();
  const narrowing = ease((frame - 47) / 42);
  const cameraAdvance = frame / 90;
  const center: Point = {
    x: 592 + Math.sin(frame / 31) * 3.2,
    y: 785 + Math.sin(frame / 39) * 2.2,
  };

  const outerWidth = mix(660, 790, narrowing);
  const outerHeight = mix(475, 565, narrowing);
  const outerOpening = rectAt(center, outerWidth, outerHeight);
  const innerOpening = rectAt(
    { x: center.x + narrowing * 4, y: center.y + narrowing * 5 },
    mix(610, 455, narrowing),
    mix(455, 326, narrowing),
  );

  const foreground: Rect = { left: -190, top: -250, right: 1270, bottom: 2170 };
  const textOpacity = interpolate(frame, [22, 31, 69, 78], [0, 0.78, 0.78, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const frames = Array.from({ length: 3 }, (_, index) => {
    const phase = (index / 3 + cameraAdvance * 0.54) % 1;
    const depth = 0.12 + Math.pow(phase, 1.65) * 1.2;
    const left = mix(center.x, foreground.left, depth);
    const right = mix(center.x, foreground.right, depth);
    const top = mix(center.y, foreground.top, depth);
    const bottom = mix(center.y, foreground.bottom, depth);
    return {
      phase,
      rect: { left, top, right, bottom },
      opacity: clamp((phase - 0.05) * 2.3) * clamp((1.04 - phase) * 4),
      width: 5 + phase * 17,
    };
  }).sort((a, b) => a.phase - b.phase);
  const deepOpening = rectAt(
    { x: center.x + 7, y: center.y + 3 },
    mix(305, 270, narrowing),
    mix(205, 176, narrowing),
  );

  const ceiling = polygon([
    { x: foreground.left, y: foreground.top },
    { x: foreground.right, y: foreground.top },
    { x: outerOpening.right, y: outerOpening.top },
    { x: outerOpening.left, y: outerOpening.top },
  ]);
  const floor = polygon([
    { x: foreground.left, y: foreground.bottom },
    { x: outerOpening.left, y: outerOpening.bottom },
    { x: outerOpening.right, y: outerOpening.bottom },
    { x: foreground.right, y: foreground.bottom },
  ]);
  const leftWall = polygon([
    { x: foreground.left, y: foreground.top },
    { x: outerOpening.left, y: outerOpening.top },
    { x: outerOpening.left, y: outerOpening.bottom },
    { x: foreground.left, y: foreground.bottom },
  ]);
  const rightWall = polygon([
    { x: foreground.right, y: foreground.top },
    { x: foreground.right, y: foreground.bottom },
    { x: outerOpening.right, y: outerOpening.bottom },
    { x: outerOpening.right, y: outerOpening.top },
  ]);

  const rootStyle: CSSProperties = {
    background: "#11171b",
    color: "white",
    fontFamily: "Arial, Helvetica, sans-serif",
    overflow: "hidden",
  };

  return (
    <AbsoluteFill style={rootStyle}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          <linearGradient id="ceilingMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f292f" />
            <stop offset="0.42" stopColor="#59666d" />
            <stop offset="0.70" stopColor="#aeb8bc" />
            <stop offset="1" stopColor="#4b575e" />
          </linearGradient>
          <linearGradient id="floorMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7e898f" />
            <stop offset="0.35" stopColor="#505c63" />
            <stop offset="1" stopColor="#182126" />
          </linearGradient>
          <linearGradient id="leftMetal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#222d33" />
            <stop offset="0.46" stopColor="#536068" />
            <stop offset="0.82" stopColor="#9fa9ae" />
            <stop offset="1" stopColor="#505d63" />
          </linearGradient>
          <linearGradient id="rightMetal" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#151d22" />
            <stop offset="0.48" stopColor="#414e55" />
            <stop offset="0.82" stopColor="#929da2" />
            <stop offset="1" stopColor="#4d5a60" />
          </linearGradient>
          <linearGradient id="ribLight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4a555c" />
            <stop offset="0.33" stopColor="#e3e7e9" />
            <stop offset="0.54" stopColor="#7b878e" />
            <stop offset="1" stopColor="#2a343a" />
          </linearGradient>
          <radialGradient id="rivet" cx="35%" cy="25%" r="70%">
            <stop offset="0" stopColor="#f4f6f7" />
            <stop offset="0.42" stopColor="#9ba5aa" />
            <stop offset="1" stopColor="#3f494f" />
          </radialGradient>
          <radialGradient id="depth" cx="50%" cy="48%" r="65%">
            <stop offset="0" stopColor="#182127" />
            <stop offset="0.62" stopColor="#0e1519" />
            <stop offset="1" stopColor="#050809" />
          </radialGradient>
          <filter id="galvanized" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.035 0.09"
              numOctaves="2"
              seed="731"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0.20 0 0 0 0.42  0 0.22 0 0 0.46  0 0 0.24 0 0.49  0 0 0 0.15 0"
              result="softNoise"
            />
            <feBlend in="SourceGraphic" in2="softNoise" mode="soft-light" />
          </filter>
          <filter id="airGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softLight" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="28" />
          </filter>
          <clipPath id="outerOpeningClip">
            <rect
              x={outerOpening.left}
              y={outerOpening.top}
              width={outerOpening.right - outerOpening.left}
              height={outerOpening.bottom - outerOpening.top}
              rx={4}
            />
          </clipPath>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="#151d22" />
        <polygon points={ceiling} fill="url(#ceilingMetal)" filter="url(#galvanized)" />
        <polygon points={floor} fill="url(#floorMetal)" filter="url(#galvanized)" />
        <polygon points={leftWall} fill="url(#leftMetal)" filter="url(#galvanized)" />
        <polygon points={rightWall} fill="url(#rightMetal)" filter="url(#galvanized)" />
        <g fill="none" stroke="#e5e9eb" strokeOpacity="0.12" strokeWidth="2">
          <path d={`M 65 318 L ${center.x - 120} ${center.y - 110}`} />
          <path d={`M 1000 270 L ${center.x + 155} ${center.y - 105}`} />
          <path d={`M 120 1580 L ${center.x - 150} ${center.y + 130}`} />
          <path d={`M 990 1500 L ${center.x + 165} ${center.y + 125}`} />
        </g>

        <path
          d={`M ${foreground.left} ${foreground.top} L ${outerOpening.left} ${outerOpening.top} L ${outerOpening.left} ${outerOpening.bottom} L ${foreground.left} ${foreground.bottom}`}
          fill="none"
          stroke="#202a30"
          strokeWidth="14"
          opacity="0.75"
        />
        <path
          d={`M ${foreground.right} ${foreground.top} L ${outerOpening.right} ${outerOpening.top} L ${outerOpening.right} ${outerOpening.bottom} L ${foreground.right} ${foreground.bottom}`}
          fill="none"
          stroke="#dbe0e2"
          strokeWidth="7"
          opacity="0.38"
        />
        <line
          x1={foreground.left}
          y1={foreground.bottom}
          x2={outerOpening.left}
          y2={outerOpening.bottom}
          stroke="#e8ecee"
          strokeOpacity="0.34"
          strokeWidth="8"
        />
        <line
          x1={foreground.right}
          y1={foreground.bottom}
          x2={outerOpening.right}
          y2={outerOpening.bottom}
          stroke="#273138"
          strokeOpacity="0.8"
          strokeWidth="14"
        />

        {frames.map((item, index) => (
          <g key={index}>
            <DuctFrame rect={item.rect} opacity={item.opacity} width={item.width} />
            {index === 2 && item.phase > 0.24 && item.phase < 0.82 ? (
              <Rivets rect={item.rect} opacity={item.opacity * 0.7} />
            ) : null}
          </g>
        ))}

        <g clipPath="url(#outerOpeningClip)">
          <rect
            x={outerOpening.left}
            y={outerOpening.top}
            width={outerOpening.right - outerOpening.left}
            height={outerOpening.bottom - outerOpening.top}
            fill="url(#depth)"
          />

          <g opacity={1 - narrowing * 0.35}>
            <polygon
              points={polygon([
                { x: outerOpening.left, y: outerOpening.top },
                { x: outerOpening.right, y: outerOpening.top },
                { x: deepOpening.right, y: deepOpening.top },
                { x: deepOpening.left, y: deepOpening.top },
              ])}
              fill="#57636a"
              fillOpacity="0.56"
            />
            <polygon
              points={polygon([
                { x: outerOpening.left, y: outerOpening.bottom },
                { x: deepOpening.left, y: deepOpening.bottom },
                { x: deepOpening.right, y: deepOpening.bottom },
                { x: outerOpening.right, y: outerOpening.bottom },
              ])}
              fill="#303a40"
              fillOpacity="0.76"
            />
            <polygon
              points={polygon([
                { x: outerOpening.left, y: outerOpening.top },
                { x: deepOpening.left, y: deepOpening.top },
                { x: deepOpening.left, y: deepOpening.bottom },
                { x: outerOpening.left, y: outerOpening.bottom },
              ])}
              fill="#3e4a51"
              fillOpacity="0.72"
            />
            <polygon
              points={polygon([
                { x: outerOpening.right, y: outerOpening.top },
                { x: outerOpening.right, y: outerOpening.bottom },
                { x: deepOpening.right, y: deepOpening.bottom },
                { x: deepOpening.right, y: deepOpening.top },
              ])}
              fill="#222c32"
              fillOpacity="0.84"
            />
            <rect
              x={deepOpening.left}
              y={deepOpening.top}
              width={deepOpening.right - deepOpening.left}
              height={deepOpening.bottom - deepOpening.top}
              fill="url(#depth)"
              stroke="#8e999e"
              strokeWidth="5"
            />
          </g>

          {narrowing > 0 ? (
            <g opacity={narrowing}>
              <polygon
                points={polygon([
                  { x: outerOpening.left, y: outerOpening.top },
                  { x: outerOpening.right, y: outerOpening.top },
                  { x: innerOpening.right, y: innerOpening.top },
                  { x: innerOpening.left, y: innerOpening.top },
                ])}
                fill="url(#ceilingMetal)"
                filter="url(#galvanized)"
              />
              <polygon
                points={polygon([
                  { x: outerOpening.left, y: outerOpening.bottom },
                  { x: innerOpening.left, y: innerOpening.bottom },
                  { x: innerOpening.right, y: innerOpening.bottom },
                  { x: outerOpening.right, y: outerOpening.bottom },
                ])}
                fill="url(#floorMetal)"
                filter="url(#galvanized)"
              />
              <polygon
                points={polygon([
                  { x: outerOpening.left, y: outerOpening.top },
                  { x: innerOpening.left, y: innerOpening.top },
                  { x: innerOpening.left, y: innerOpening.bottom },
                  { x: outerOpening.left, y: outerOpening.bottom },
                ])}
                fill="url(#leftMetal)"
                filter="url(#galvanized)"
              />
              <polygon
                points={polygon([
                  { x: outerOpening.right, y: outerOpening.top },
                  { x: outerOpening.right, y: outerOpening.bottom },
                  { x: innerOpening.right, y: innerOpening.bottom },
                  { x: innerOpening.right, y: innerOpening.top },
                ])}
                fill="url(#rightMetal)"
                filter="url(#galvanized)"
              />
              <rect
                x={innerOpening.left}
                y={innerOpening.top}
                width={innerOpening.right - innerOpening.left}
                height={innerOpening.bottom - innerOpening.top}
                fill="url(#depth)"
                stroke="#c7cdd0"
                strokeOpacity="0.72"
                strokeWidth="7"
              />
              <rect
                x={innerOpening.left + 12}
                y={innerOpening.top + 12}
                width={innerOpening.right - innerOpening.left - 24}
                height={innerOpening.bottom - innerOpening.top - 24}
                fill="none"
                stroke="#354148"
                strokeWidth="9"
              />
            </g>
          ) : null}

        </g>

        <DuctFrame rect={outerOpening} opacity={0.72} width={8} />
        <Rivets rect={outerOpening} opacity={0.44} />

        <ellipse
          cx={mix(280, 790, (Math.sin(frame / 22) + 1) / 2)}
          cy={545}
          rx={180}
          ry={520}
          fill="#f7fbfd"
          opacity="0.075"
          filter="url(#softLight)"
          transform={`rotate(-18 ${center.x} ${center.y})`}
        />

        <Airflow frame={frame} center={center} />

        <g opacity={textOpacity} transform="translate(96 430) rotate(-2)">
          <text
            x="0"
            y="0"
            fill="#eef4f6"
            fontSize="29"
            fontWeight="800"
            letterSpacing="5"
            paintOrder="stroke"
            stroke="#374149"
            strokeWidth="2"
          >
            SAME AIRFLOW
          </text>
          <line x1="0" y1="16" x2="195" y2="16" stroke="#cbd5d9" strokeOpacity="0.5" strokeWidth="1.5" />
        </g>

        <g opacity={interpolate(frame, [54, 65], [0, 0.58], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
          <text
            x="802"
            y="1378"
            fill="#d8e0e3"
            fontSize="18"
            fontWeight="700"
            letterSpacing="4"
            transform="rotate(3 802 1378)"
          >
            CONCEPTUAL
          </text>
        </g>

        <rect width={WIDTH} height={HEIGHT} fill="none" stroke="#020405" strokeOpacity="0.36" strokeWidth="64" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#depth)" opacity="0.18" />
      </svg>
    </AbsoluteFill>
  );
}
