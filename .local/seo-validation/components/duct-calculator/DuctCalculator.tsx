"use client";

import { useEffect, useRef } from "react";

import { markSuccessfulToolUse } from "@/lib/support";

import styles from "./DuctCalculator.module.css";

const NS = "http://www.w3.org/2000/svg";
const CX = 380;
const CY = 355;
const A0 = -145;
const A1 = 145;

/* Four touching concentric bands */
const OC_RI = 307;
const OC_RO = 347; // fixed blue CFM
const F_RI = 267;
const F_RO = 307; // moving blue friction — touches blue CFM

const IC_RI = 214;
const IC_RO = 254; // fixed red CFM
const V_RI = 172;
const V_RO = 214; // moving red velocity — touches red CFM

const CMIN = 30;
const CMAX = 100000;
const FRMIN = 0.01;
const FRMAX = 10;
const VCMIN = 300;
const VCMAX = 100000;
const VMIN = 300;
const VMAX = 12000;
const RECT_MIN_SIDE = 4;
const RECT_MAX_SIDE = 96;
const RECT_MAX_ASPECT = 4;
const RECT_FRICTION_TOLERANCE = 0.05;
// Whole-inch rounding puts the required 10-inch and 12-inch preferred-side
// examples slightly above 5%; keep that narrow allowance preferred-only.
const PREFERRED_FRICTION_TOLERANCE = 0.065;
const STD = [
  4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32,
  34, 36, 40, 42, 44, 48, 52, 56, 60, 66, 72, 78, 84, 90, 96, 108, 120,
];

type CalculatorState = {
  cfm: number;
  fr: number;
  side: number;
  rot: number;
  drag: boolean;
  last: number;
};

type RectResult = {
  width: number;
  height: number;
  equivalentDiameter: number;
  frictionRate: number;
  frictionError: number;
  aspect: number;
  area: number;
  fixedDistance: number;
};

export function DuctCalculator() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const get = <T extends Element>(id: string) => {
      const node = root.querySelector<T>(`#${id}`);
      if (!node) throw new Error(`Missing duct calculator element: ${id}`);
      return node;
    };

    const svg = get<SVGSVGElement>("ductCalculator");
    const frictionRing = get<SVGGElement>("frictionRing");
    const velocityRing = get<SVGGElement>("velocityRing");
    const frictionClipPath = get<SVGPathElement>("frictionClipPath");
    const velocityClipPath = get<SVGPathElement>("velocityClipPath");
    const frictionContentClipPath = get<SVGPathElement>(
      "frictionContentClipPath",
    );
    const velocityContentClipPath = get<SVGPathElement>(
      "velocityContentClipPath",
    );
    const frictionDragTarget = get<SVGPathElement>("frictionDragTarget");
    const frLine = get<SVGLineElement>("frictionReferenceLine");
    const frDot = get<SVGCircleElement>("frictionReferenceDot");
    const cfmInput = get<HTMLInputElement>("cfmInput");
    const frictionInput = get<HTMLInputElement>("frictionInput");
    const fixedSideInput = get<HTMLInputElement>("fixedSideInput");
    const resetButton = get<HTMLButtonElement>("resetButton");
    const validation = get<HTMLParagraphElement>("validationMessage");
    const quick = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-friction]"),
    );
    const exactDiameterEl = get<HTMLElement>("exactDiameter");
    const nominalDiameterEl = get<HTMLElement>("nominalDiameter");
    const exactVelocityEl = get<HTMLElement>("exactVelocity");
    const nominalVelocityEl = get<HTMLElement>("nominalVelocity");
    const nominalFrictionEl = get<HTMLElement>("nominalFriction");
    const roundAreaEl = get<HTMLElement>("roundArea");
    const rectPrimaryEl = get<HTMLElement>("rectPrimary");
    const rectOptionsEl = get<HTMLElement>("rectOptions");
    const scaleNameLayer = get<SVGGElement>("scaleNameLayer");

    let state: CalculatorState = {
      cfm: 5000,
      fr: 0.1,
      side: 12,
      rot: 0,
      drag: false,
      last: 0,
    };

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    function polar(radius: number, angle: number) {
      const radians = ((angle - 90) * Math.PI) / 180;
      return {
        x: CX + radius * Math.cos(radians),
        y: CY + radius * Math.sin(radians),
      };
    }

    function sector(
      innerRadius: number,
      outerRadius: number,
      startAngle: number,
      endAngle: number,
    ) {
      const p1 = polar(outerRadius, startAngle);
      const p2 = polar(outerRadius, endAngle);
      const p3 = polar(innerRadius, endAngle);
      const p4 = polar(innerRadius, startAngle);
      const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
      return `M ${p1.x} ${p1.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
    }

    function setScaleContentClip(
      path: SVGPathElement,
      innerRadius: number,
      outerRadius: number,
      startAngle: number,
      endAngle: number,
    ) {
      path.setAttribute(
        "d",
        endAngle > startAngle
          ? sector(innerRadius, outerRadius, startAngle, endAngle)
          : "",
      );
    }

    function element(
      tag: string,
      attributes: Record<string, string | number>,
      parent?: Element,
    ) {
      const node = document.createElementNS(NS, tag);
      Object.entries(attributes).forEach(([key, value]) =>
        node.setAttribute(key, String(value)),
      );
      if (parent) parent.appendChild(node);
      return node;
    }

    function tick(
      parent: Element,
      angle: number,
      edge: number,
      depth: number,
      major: boolean,
    ) {
      const start = polar(edge, angle);
      const end = polar(depth, angle);
      element(
        "line",
        {
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
          class: `${styles.ruleTick}${major ? ` ${styles.major}` : ""}`,
        },
        parent,
      );
    }

    function scaleText(
      parent: Element,
      value: string,
      radius: number,
      angle: number,
      size = 9.2,
    ) {
      const point = polar(radius, angle);
      let rotation = angle - 90;
      const normalized = ((rotation % 360) + 360) % 360;
      if (normalized > 90 && normalized < 270) rotation += 180;
      const node = element(
        "text",
        {
          x: point.x,
          y: point.y,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          class: styles.scaleNumber,
          "font-size": size,
          transform: `rotate(${rotation} ${point.x} ${point.y})`,
        },
        parent,
      );
      node.textContent = value;
    }

    function formatCFM(value: number) {
      if (value >= 1000) {
        const thousands = value / 1000;
        return Number.isInteger(thousands)
          ? `${thousands}K`
          : `${thousands.toFixed(1)}K`;
      }
      return String(Math.round(value));
    }

    /* -------- Exact scale calibration --------
       Blue fixed CFM slope = B degrees/decade.
       Friction slope = B/1.9, because D^5.02 ∝ Q^1.9 / f.
       Red CFM and velocity slope = B*(5.02/3.8), which lets the red
       pair use the same angular rotation as the friction ring.
    */
    const B = (A1 - A0) / Math.log10(CMAX / CMIN);
    const BF = B / 1.9;
    const BR = B * (5.02 / 3.8);

    function cfmAngle(flow: number) {
      return A0 + B * Math.log10(flow / CMIN);
    }

    const QREF = 1000;
    const FREF = 0.1;

    function frictionAngle(friction: number) {
      return cfmAngle(QREF) + BF * Math.log10(friction / FREF);
    }

    const RED_START = -137;

    function redCfmAngle(flow: number) {
      return RED_START + BR * Math.log10(flow / VCMIN);
    }

    function roundDiameter(flow: number, friction: number) {
      return (0.109136 * flow ** 1.9 / friction) ** (1 / 5.02);
    }

    function velocity(flow: number, diameter: number) {
      return (576 * flow) / (Math.PI * diameter * diameter);
    }

    function roundFriction(flow: number, diameter: number) {
      return (0.109136 * flow ** 1.9) / diameter ** 5.02;
    }

    function area(diameter: number) {
      return (Math.PI * diameter * diameter) / 576;
    }

    function equivalentDiameter(firstSide: number, secondSide: number) {
      return (
        (1.3 * (firstSide * secondSide) ** 0.625) /
        (firstSide + secondSide) ** 0.25
      );
    }

    const VREF = velocity(QREF, roundDiameter(QREF, FREF));

    function velocityAngle(value: number) {
      return redCfmAngle(QREF) + BR * Math.log10(value / VREF);
    }

    function inverseCfmAngle(angle: number) {
      return CMIN * 10 ** ((angle - A0) / B);
    }

    function limits() {
      const local = frictionAngle(state.fr);
      return { min: A0 - local, max: A1 - local };
    }

    function solveOther(target: number, fixed: number) {
      let low = 1;
      let high = 240;
      for (let iteration = 0; iteration < 80; iteration += 1) {
        const middle = (low + high) / 2;
        if (equivalentDiameter(fixed, middle) < target) low = middle;
        else high = middle;
      }
      return (low + high) / 2;
    }

    function frictionError(actual: number, requested: number) {
      return Math.abs(actual - requested) / requested;
    }

    function candidateFromFixedSide(
      target: number,
      flow: number,
      requestedFriction: number,
      fixed: number,
    ): RectResult | null {
      const exactCompanion = solveOther(target, fixed);
      const companionCandidates = [
        ...new Set([Math.floor(exactCompanion), Math.ceil(exactCompanion)]),
      ].filter(
        (companion) =>
          companion >= RECT_MIN_SIDE && companion <= RECT_MAX_SIDE,
      );

      const candidates = companionCandidates
        .map((companion) => {
          const candidateEquivalentDiameter = equivalentDiameter(
            fixed,
            companion,
          );
          const candidateFriction = roundFriction(
            flow,
            candidateEquivalentDiameter,
          );

          return {
            width: fixed,
            height: companion,
            equivalentDiameter: candidateEquivalentDiameter,
            frictionRate: candidateFriction,
            frictionError: frictionError(
              candidateFriction,
              requestedFriction,
            ),
            aspect:
              Math.max(fixed, companion) / Math.min(fixed, companion),
            area: fixed * companion,
            fixedDistance: 0,
          };
        })
        .filter((candidate) => candidate.aspect <= RECT_MAX_ASPECT)
        .sort((first, second) => {
          const errorDifference =
            first.frictionError - second.frictionError;
          if (Math.abs(errorDifference) > 1e-12) return errorDifference;

          const aspectDifference = first.aspect - second.aspect;
          if (Math.abs(aspectDifference) > 1e-12) return aspectDifference;

          return first.area - second.area;
        });

      return candidates[0] ?? null;
    }

    function rectangleKey(result: RectResult) {
      const shortSide = Math.min(result.width, result.height);
      const longSide = Math.max(result.width, result.height);
      return `${shortSide}x${longSide}`;
    }

    function normalizeRectangle(result: RectResult, preferredSide: number) {
      const width = Math.max(result.width, result.height);
      const height = Math.min(result.width, result.height);
      return {
        ...result,
        width,
        height,
        fixedDistance: Math.min(
          Math.abs(width - preferredSide),
          Math.abs(height - preferredSide),
        ),
      };
    }

    function hasSameDimensions(first: RectResult, second: RectResult) {
      return rectangleKey(first) === rectangleKey(second);
    }

    function rectangularOptions(
      target: number,
      flow: number,
      requestedFriction: number,
      fixedSide: number,
    ) {
      const fixed = clamp(
        Math.round(fixedSide),
        RECT_MIN_SIDE,
        RECT_MAX_SIDE,
      );
      const candidatesByDimensions = new Map<string, RectResult>();

      // Solve one best whole-inch companion for every possible fixed side,
      // then keep only genuinely equal-friction options and rotated uniques.
      for (
        let candidateFixed = RECT_MIN_SIDE;
        candidateFixed <= RECT_MAX_SIDE;
        candidateFixed += 1
      ) {
        const candidate = candidateFromFixedSide(
          target,
          flow,
          requestedFriction,
          candidateFixed,
        );
        if (
          !candidate ||
          candidate.frictionError > RECT_FRICTION_TOLERANCE
        ) {
          continue;
        }

        const normalized = normalizeRectangle(candidate, fixed);
        const key = rectangleKey(normalized);
        const existing = candidatesByDimensions.get(key);
        if (!existing || normalized.frictionError < existing.frictionError) {
          candidatesByDimensions.set(key, normalized);
        }
      }

      const validCandidates = [...candidatesByDimensions.values()];
      const bySquare = [...validCandidates].sort((first, second) => {
        const squareDifference = first.aspect - second.aspect;
        if (Math.abs(squareDifference) > 1e-9) return squareDifference;

        const errorDifference = first.frictionError - second.frictionError;
        if (Math.abs(errorDifference) > 1e-9) return errorDifference;

        return first.area - second.area;
      });

      const primary = bySquare[0];
      if (!primary) return [];

      const preferred = candidateFromFixedSide(
        target,
        flow,
        requestedFriction,
        fixed,
      );
      const remaining = validCandidates
        .filter(
          (option) =>
            !hasSameDimensions(option, primary) &&
            (!preferred || !hasSameDimensions(option, preferred)),
        )
        .sort((first, second) => {
          const errorDifference =
            first.frictionError - second.frictionError;
          if (Math.abs(errorDifference) > 1e-9) return errorDifference;

          const aspectDifference = first.aspect - second.aspect;
          if (Math.abs(aspectDifference) > 1e-9) return aspectDifference;

          const fixedDifference = first.fixedDistance - second.fixedDistance;
          if (fixedDifference !== 0) return fixedDifference;

          return first.area - second.area;
        });

      const results = [primary];
      if (
        preferred &&
        preferred.frictionError <= PREFERRED_FRICTION_TOLERANCE &&
        !hasSameDimensions(preferred, primary)
      ) {
        results.push(preferred);
      }
      results.push(...remaining);
      return results.slice(0, 6);
    }

    function nominalDiameter(diameter: number) {
      return STD.find((size) => size >= diameter) ?? Math.ceil(diameter / 6) * 6;
    }

    function band(
      parent: Element,
      innerRadius: number,
      outerRadius: number,
      startAngle: number,
      endAngle: number,
      fill: string,
    ) {
      element(
        "path",
        { d: sector(innerRadius, outerRadius, startAngle, endAngle), fill },
        parent,
      );
      element(
        "path",
        {
          d: sector(innerRadius, outerRadius, startAngle, endAngle),
          class: styles.ruleOutline,
        },
        parent,
      );
    }

    /* Fixed blue CFM: ticks begin at the INNER interface and project outward */
    function buildOuterCfmScale() {
      const parent = get<SVGGElement>("outerCfmScale");
      const majorValues = [
        30, 50, 100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000,
        20000, 30000, 50000, 100000,
      ];
      const ticks: number[] = [];
      for (let value = 30; value < 100; value += 10) ticks.push(value);
      for (let value = 100; value < 500; value += 20) ticks.push(value);
      for (let value = 500; value < 1000; value += 50) ticks.push(value);
      for (let value = 1000; value < 2000; value += 100) ticks.push(value);
      for (let value = 2000; value < 5000; value += 200) ticks.push(value);
      for (let value = 5000; value < 10000; value += 500) ticks.push(value);
      for (let value = 10000; value < 20000; value += 1000) ticks.push(value);
      for (let value = 20000; value < 50000; value += 2000) ticks.push(value);
      for (let value = 50000; value <= 100000; value += 5000) ticks.push(value);
      majorValues.forEach((value) => {
        if (!ticks.includes(value)) ticks.push(value);
      });
      ticks.sort((first, second) => first - second).forEach((value) => {
        const angle = cfmAngle(value);
        const major = majorValues.includes(value);
        tick(
          parent,
          angle,
          OC_RI + 2,
          major ? OC_RO - 4 : OC_RI + 18,
          major,
        );
        if (major)
          scaleText(parent, formatCFM(value), OC_RI + 27, angle, 9.5);
      });
    }

    /* Friction is intentionally MUCH SHORTER than the CFM rule. */
    function buildFrictionScale() {
      const parent = get<SVGGElement>("frictionScale");
      const values = [
        0.01, 0.012, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08,
        0.1, 0.12, 0.15, 0.2, 0.3, 0.4, 0.5, 1, 2, 3, 4, 5, 10,
      ];
      const majorValues = [
        0.01, 0.02, 0.03, 0.04, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 3,
        4, 5, 10,
      ];
      values.forEach((value) => {
        const angle = frictionAngle(value);
        const major = majorValues.includes(value);
        tick(
          parent,
          angle,
          F_RO - 2,
          major ? F_RI + 5 : F_RI + 13,
          major,
        );
        if (major) scaleText(parent, String(value), F_RI + 20, angle, 9.1);
      });
    }

    function buildInnerRedCfmScale() {
      const parent = get<SVGGElement>("innerCfmScale");
      const values = [
        300, 325, 350, 375, 400, 425, 450, 475, 500, 550, 600, 650, 700,
        750, 800, 850, 900, 950, 1000, 1100, 1200, 1300, 1400, 1500, 1600,
        1800, 2000, 2250, 2500, 2750, 3000, 3500, 4000, 4500, 5000, 5500,
        6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 12000,
        15000, 20000, 25000, 30000, 40000, 50000, 60000, 70000, 80000,
        90000, 100000,
      ];
      const majorValues = [
        300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000,
        4000, 5000, 6000, 7000, 8000, 9000, 10000, 15000, 20000, 30000,
        50000, 70000, 100000,
      ];
      values.forEach((value) => {
        const angle = redCfmAngle(value);
        const major = majorValues.includes(value);
        tick(
          parent,
          angle,
          IC_RI + 2,
          major ? IC_RO - 4 : IC_RI + 17,
          major,
        );
        if (major)
          scaleText(parent, formatCFM(value), IC_RI + 26, angle, 9.1);
      });
    }

    function buildVelocityScale() {
      const parent = get<SVGGElement>("velocityScale");
      const values = [
        300, 325, 350, 375, 400, 425, 450, 475, 500, 550, 600, 650, 700,
        750, 800, 850, 900, 950, 1000, 1100, 1200, 1300, 1400, 1500, 1600,
        1700, 1800, 1900, 2000, 2250, 2500, 2750, 3000, 3500, 4000, 4500,
        5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000,
        11000, 12000,
      ];
      const majorValues = [
        300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000,
        4000, 5000, 6000, 7000, 8000, 9000, 10000, 12000,
      ];
      values.forEach((value) => {
        const angle = velocityAngle(value);
        const major = majorValues.includes(value);
        tick(
          parent,
          angle,
          V_RO - 2,
          major ? V_RI + 5 : V_RI + 13,
          major,
        );
        if (major) {
          scaleText(
            parent,
            value >= 1000
              ? `${Number((value / 1000).toFixed(1))}K`
              : String(value),
            V_RI + 21,
            angle,
            9,
          );
        }
      });
    }

    function openArcPath(
      radius: number,
      startAngle: number,
      endAngle: number,
      sweep = 1,
    ) {
      const first = polar(radius, startAngle);
      const second = polar(radius, endAngle);
      const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
      return `M ${first.x} ${first.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${second.x} ${second.y}`;
    }

    function arcLabel(
      textValue: string,
      radius: number,
      color: string,
      size: number,
      id: string,
    ) {
      element(
        "path",
        {
          id,
          // Reverse direction across the same bottom arc so text reads upright.
          d: openArcPath(radius, 209, 151, 0),
          class: styles.scaleNameGuide,
        },
        scaleNameLayer,
      );

      const label = element(
        "text",
        { class: styles.scaleNameText, fill: color, "font-size": size },
        scaleNameLayer,
      );
      const textPath = element(
        "textPath",
        {
          href: `#${id}`,
          startOffset: "50%",
          "text-anchor": "middle",
        },
        label,
      );
      textPath.textContent = textValue;
    }

    function buildScaleNames() {
      arcLabel(
        "AIR FLOW RATE — CFM",
        OC_RI + 20,
        "#263d49",
        10.8,
        "name-outer-cfm",
      );
      arcLabel(
        "FRICTION LOSS / 100 FT",
        F_RI + 20,
        "#314957",
        9.8,
        "name-friction",
      );
      arcLabel(
        "AIR FLOW RATE — CFM",
        IC_RI + 20,
        "#762d24",
        10.2,
        "name-inner-cfm",
      );
      arcLabel(
        "ROUND DUCT VELOCITY — FPM",
        V_RI + 20,
        "#762d24",
        9.4,
        "name-velocity",
      );
    }

    function build() {
      band(get("outerCfmBand"), OC_RI, OC_RO, A0, A1, "#71848e");
      const frictionStart = frictionAngle(FRMIN) - 4;
      const frictionEnd = frictionAngle(FRMAX) + 4;
      band(
        get("frictionBand"),
        F_RI,
        F_RO,
        frictionStart,
        frictionEnd,
        "#9aa8ae",
      );
      const redStart = redCfmAngle(VCMIN) - 3;
      const redEnd = redCfmAngle(VCMAX) + 3;
      band(
        get("innerCfmBand"),
        IC_RI,
        IC_RO,
        redStart,
        redEnd,
        "#df5d49",
      );
      const velocityStart = velocityAngle(VMIN) - 3;
      const velocityEnd = velocityAngle(VMAX) + 3;
      band(
        get("velocityBand"),
        V_RI,
        V_RO,
        velocityStart,
        velocityEnd,
        "#e77763",
      );
      buildOuterCfmScale();
      buildFrictionScale();
      buildInnerRedCfmScale();
      buildVelocityScale();
      buildScaleNames();
      frictionClipPath.setAttribute("d", sector(F_RI - 2, F_RO + 2, A0, A1));
      velocityClipPath.setAttribute(
        "d",
        sector(V_RI - 2, V_RO + 2, redStart, redEnd),
      );
      frictionDragTarget.setAttribute(
        "d",
        sector(F_RI, F_RO, frictionStart, frictionEnd),
      );
    }

    function referenceLine() {
      const angle = frictionAngle(state.fr);
      const start = polar(OC_RO + 10, angle);
      const end = polar(F_RI + 1, angle);
      const dot = polar(F_RO - 2, angle);
      frLine.setAttribute("x1", String(start.x));
      frLine.setAttribute("y1", String(start.y));
      frLine.setAttribute("x2", String(end.x));
      frLine.setAttribute("y2", String(end.y));
      frDot.setAttribute("cx", String(dot.x));
      frDot.setAttribute("cy", String(dot.y));
    }

    function calculate() {
      const diameter = roundDiameter(state.cfm, state.fr);
      const nominal = nominalDiameter(diameter);
      const exactVelocity = velocity(state.cfm, diameter);
      const nominalVelocity = velocity(state.cfm, nominal);
      const nominalFriction = roundFriction(state.cfm, nominal);
      const rectangles = rectangularOptions(
        diameter,
        state.cfm,
        state.fr,
        state.side,
      );
      return {
        diameter,
        nominal,
        exactVelocity,
        nominalVelocity,
        nominalFriction,
        area: area(diameter),
        rectangles,
        primaryRectangle: rectangles[0] ?? null,
      };
    }

    /* Proper scale geometry means BOTH moving scales use the same rotation. */
    function synchronizeScales() {
      const range = limits();
      state.rot = clamp(
        cfmAngle(state.cfm) - frictionAngle(state.fr),
        range.min,
        range.max,
      );
      const transform = `rotate(${state.rot} ${CX} ${CY})`;
      frictionRing.setAttribute("transform", transform);
      velocityRing.setAttribute("transform", transform);

      // Clip each moving scale in its own coordinate space before rotation.
      // This prevents off-scale content from aliasing back into the 290°
      // display sector at the 30 and 100,000 CFM endpoints.
      const frictionStart = Math.max(
        frictionAngle(FRMIN) - 4,
        A0 - state.rot,
      );
      const frictionEnd = Math.min(
        frictionAngle(FRMAX) + 4,
        A1 - state.rot,
      );
      setScaleContentClip(
        frictionContentClipPath,
        F_RI - 2,
        F_RO + 2,
        frictionStart,
        frictionEnd,
      );

      const velocityStart = Math.max(
        velocityAngle(VMIN) - 3,
        A0 - state.rot,
      );
      const velocityEnd = Math.min(
        velocityAngle(VMAX) + 3,
        A1 - state.rot,
      );
      setScaleContentClip(
        velocityContentClipPath,
        V_RI - 2,
        V_RO + 2,
        velocityStart,
        velocityEnd,
      );
    }

    function showResults(result: ReturnType<typeof calculate>) {
      exactDiameterEl.textContent = `${result.diameter.toFixed(1)} in`;
      nominalDiameterEl.textContent = `${result.nominal} in`;
      exactVelocityEl.textContent = `${Math.round(result.exactVelocity).toLocaleString()} FPM`;
      nominalVelocityEl.textContent = `${Math.round(result.nominalVelocity).toLocaleString()} FPM`;
      nominalFrictionEl.textContent = `${result.nominalFriction.toFixed(3)} in.w.g./100 ft`;
      roundAreaEl.textContent = `${result.area.toFixed(2)} ft²`;
      rectPrimaryEl.textContent = result.primaryRectangle
        ? `${result.primaryRectangle.width}" × ${result.primaryRectangle.height}"`
        : "—";
      rectOptionsEl.replaceChildren();
      result.rectangles.slice(1).forEach((option) => {
        const chip = document.createElement("span");
        chip.className = styles.rectOption;
        chip.textContent = `${option.width}" × ${option.height}"`;
        rectOptionsEl.appendChild(chip);
      });
    }

    function updateQuickButtons() {
      quick.forEach((button) =>
        button.classList.toggle(
          styles.active,
          Math.abs(Number(button.dataset.friction) - state.fr) < 1e-4,
        ),
      );
    }

    function render() {
      referenceLine();
      synchronizeScales();
      showResults(calculate());
      updateQuickButtons();
      cfmInput.value = String(Math.round(state.cfm));
      frictionInput.value = state.fr.toFixed(2);
      fixedSideInput.value = String(Math.round(state.side));
    }

    function setCFM(value: number) {
      if (!Number.isFinite(value)) return;
      state.cfm = clamp(value, CMIN, CMAX);
      validation.textContent =
        value < CMIN || value > CMAX
          ? `Airflow is limited to ${CMIN.toLocaleString()}–${CMAX.toLocaleString()} CFM.`
          : "";
      render();
    }

    function setFriction(value: number) {
      if (!Number.isFinite(value)) return;
      state.fr = clamp(value, FRMIN, FRMAX);
      render();
    }

    function pointerAngle(event: PointerEvent) {
      const bounds = svg.getBoundingClientRect();
      const centerX = bounds.left + (CX / 760) * bounds.width;
      const centerY = bounds.top + (CY / 720) * bounds.height;
      return (
        (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) /
        Math.PI
      );
    }

    let dragChanged = false;

    function onPointerDown(event: PointerEvent) {
      event.preventDefault();
      state.drag = true;
      dragChanged = false;
      state.last = pointerAngle(event);
      frictionRing.classList.add(styles.dragging);
      frictionRing.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      if (!state.drag) return;
      const current = pointerAngle(event);
      let delta = current - state.last;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const range = limits();
      state.rot = clamp(state.rot + delta, range.min, range.max);
      state.last = current;
      const globalAngle = frictionAngle(state.fr) + state.rot;
      state.cfm = clamp(inverseCfmAngle(globalAngle), CMIN, CMAX);
      const transform = `rotate(${state.rot} ${CX} ${CY})`;
      frictionRing.setAttribute("transform", transform);
      velocityRing.setAttribute("transform", transform);
      showResults(calculate());
      cfmInput.value = String(Math.round(state.cfm));
      dragChanged = true;
    }

    function stopDragging(event: PointerEvent) {
      if (!state.drag) return;
      state.drag = false;
      frictionRing.classList.remove(styles.dragging);
      if (frictionRing.hasPointerCapture(event.pointerId))
        frictionRing.releasePointerCapture(event.pointerId);
      if (dragChanged) markSuccessfulToolUse();
    }

    const onCfmChange = () => {
      const value = Number(cfmInput.value);
      if (!Number.isFinite(value)) return;
      setCFM(value);
      markSuccessfulToolUse();
    };
    const onFrictionChange = () => {
      const value = Number(frictionInput.value);
      if (!Number.isFinite(value)) return;
      setFriction(value);
      markSuccessfulToolUse();
    };
    const onFixedSideChange = () => {
      state.side = clamp(Number(fixedSideInput.value) || 12, 4, 96);
      render();
      markSuccessfulToolUse();
    };
    const quickHandlers = quick.map((button) => {
      const handler = () => {
        setFriction(Number(button.dataset.friction));
        markSuccessfulToolUse();
      };
      button.addEventListener("click", handler);
      return { button, handler };
    });
    const onReset = () => {
      state = {
        cfm: 5000,
        fr: 0.1,
        side: 12,
        rot: 0,
        drag: false,
        last: 0,
      };
      validation.textContent = "";
      render();
    };

    frictionRing.addEventListener("pointerdown", onPointerDown);
    frictionRing.addEventListener("pointermove", onPointerMove);
    frictionRing.addEventListener("pointerup", stopDragging);
    frictionRing.addEventListener("pointercancel", stopDragging);
    cfmInput.addEventListener("change", onCfmChange);
    frictionInput.addEventListener("change", onFrictionChange);
    fixedSideInput.addEventListener("change", onFixedSideChange);
    resetButton.addEventListener("click", onReset);

    // Strict Mode replays effects in development. Clear generated SVG content
    // before rebuilding so ticks, labels, and bands remain single-instance.
    [
      "outerCfmBand",
      "outerCfmScale",
      "frictionBand",
      "frictionScale",
      "innerCfmBand",
      "innerCfmScale",
      "velocityBand",
      "velocityScale",
      "scaleNameLayer",
    ].forEach((id) => get(id).replaceChildren());

    build();
    render();

    return () => {
      frictionRing.removeEventListener("pointerdown", onPointerDown);
      frictionRing.removeEventListener("pointermove", onPointerMove);
      frictionRing.removeEventListener("pointerup", stopDragging);
      frictionRing.removeEventListener("pointercancel", stopDragging);
      cfmInput.removeEventListener("change", onCfmChange);
      frictionInput.removeEventListener("change", onFrictionChange);
      fixedSideInput.removeEventListener("change", onFixedSideChange);
      resetButton.removeEventListener("click", onReset);
      quickHandlers.forEach(({ button, handler }) =>
        button.removeEventListener("click", handler),
      );
      frictionRing.classList.remove(styles.dragging);
    };
  }, []);

  return (
    <div className={styles.ductCalculator} ref={rootRef}>
      <div className={styles.workspace}>
        <section className={`${styles.wheelCard} ${styles.neumorphic}`}>
          <div className={styles.wheelWrap}>
            <svg
              className={styles.calculatorSvg}
              id="ductCalculator"
              viewBox="0 0 760 720"
              role="img"
              aria-label="Interactive circular HVAC duct calculator"
            >
              <defs>
                <clipPath id="frictionClip">
                  <path id="frictionClipPath" />
                </clipPath>
                <clipPath id="velocityClip">
                  <path id="velocityClipPath" />
                </clipPath>
                <clipPath id="frictionContentClip">
                  <path id="frictionContentClipPath" />
                </clipPath>
                <clipPath id="velocityContentClip">
                  <path id="velocityContentClipPath" />
                </clipPath>
              </defs>
              <g id="outerCfmBand" />
              <g id="outerCfmScale" />
              <g id="outerCfmTitle" />
              <g clipPath="url(#frictionClip)">
                <g id="frictionRing" className={styles.frictionRing}>
                  <g clipPath="url(#frictionContentClip)">
                    <g id="frictionBand" />
                    <g id="frictionScale" />
                    <g id="frictionTitle" />
                  </g>
                  <line
                    id="frictionReferenceLine"
                    className={styles.frictionReference}
                  />
                  <circle
                    id="frictionReferenceDot"
                    r="5.2"
                    className={styles.frictionDot}
                  />
                  <path id="frictionDragTarget" fill="transparent" />
                </g>
              </g>
              <g id="innerCfmBand" />
              <g id="innerCfmScale" />
              <g id="innerCfmTitle" />
              <g clipPath="url(#velocityClip)">
                <g id="velocityRing">
                  <g clipPath="url(#velocityContentClip)">
                    <g id="velocityBand" />
                    <g id="velocityScale" />
                    <g id="velocityTitle" />
                  </g>
                </g>
              </g>
              <g id="scaleNameLayer" className={styles.noHit} />
              <g className={styles.noHit}>
                <text
                  x="380"
                  y="350"
                  textAnchor="middle"
                  className={styles.centerMain}
                >
                  HVAC
                </text>
                <text
                  x="380"
                  y="372"
                  textAnchor="middle"
                  className={styles.centerSub}
                >
                  DUCT CALCULATOR
                </text>
              </g>
            </svg>
          </div>
          <div className={`${styles.wheelHelp} ${styles.inset}`}>
            Drag the friction ring to change airflow. The friction and velocity
            scales are calibrated to the same equal-friction relationship.
          </div>
        </section>

        <aside className={styles.controlColumn}>
          <section className={`${styles.panel} ${styles.neumorphic}`}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={`${styles.sectionKicker} ${styles.blueKicker}`}>
                  DESIGN POINT
                </p>
                <h2>Airflow &amp; friction</h2>
              </div>
              <button className={styles.neoButton} id="resetButton" type="button">
                Reset
              </button>
            </div>
            <label className={styles.field}>
              <span>Airflow</span>
              <span className={`${styles.neoInputRow} ${styles.inset}`}>
                <input
                  id="cfmInput"
                  type="number"
                  min="30"
                  max="100000"
                  defaultValue="5000"
                />
                <span>CFM</span>
              </span>
            </label>
            <label className={styles.field}>
              <span>Friction rate</span>
              <span className={`${styles.neoInputRow} ${styles.inset}`}>
                <input
                  id="frictionInput"
                  type="number"
                  min="0.01"
                  max="10"
                  step="0.01"
                  defaultValue="0.10"
                />
                <span>in.w.g./100 ft</span>
              </span>
            </label>
            <div className={styles.quickFriction}>
              <button type="button" data-friction="0.06">
                0.06
              </button>
              <button type="button" data-friction="0.08">
                0.08
              </button>
              <button
                type="button"
                data-friction="0.10"
                className={styles.active}
              >
                0.10
              </button>
              <button type="button" data-friction="0.12">
                0.12
              </button>
              <button type="button" data-friction="0.15">
                0.15
              </button>
            </div>
            <p className={styles.validation} id="validationMessage" />
          </section>

          <section
            className={`${styles.panel} ${styles.neumorphic} ${styles.rectResults}`}
          >
            <p className={`${styles.sectionKicker} ${styles.greenKicker}`}>
              RECTANGULAR DUCT DIMENSIONS
            </p>
            <label className={styles.field}>
              <span>Preferred fixed side</span>
              <span className={`${styles.neoInputRow} ${styles.inset}`}>
                <input
                  id="fixedSideInput"
                  type="number"
                  min="4"
                  max="96"
                  defaultValue="12"
                />
                <span>in</span>
              </span>
            </label>
            <div
              className={`${styles.rectPrimary} ${styles.inset}`}
              id="rectPrimary"
            >
              —
            </div>
            <div className={styles.rectOptions} id="rectOptions" />
          </section>

          <section
            className={`${styles.panel} ${styles.neumorphic} ${styles.roundResults}`}
          >
            <p className={`${styles.sectionKicker} ${styles.redKicker}`}>
              ROUND DUCT RESULTS
            </p>
            <div className={styles.resultsGrid}>
              <div className={`${styles.resultCard} ${styles.inset}`}>
                <span>Calculated diameter</span>
                <strong id="exactDiameter">—</strong>
              </div>
              <div className={`${styles.resultCard} ${styles.inset}`}>
                <span>Suggested nominal</span>
                <strong id="nominalDiameter">—</strong>
              </div>
              <div className={`${styles.resultCard} ${styles.inset}`}>
                <span>Round area</span>
                <strong id="roundArea">—</strong>
              </div>
              <div className={`${styles.resultCard} ${styles.inset}`}>
                <span>Velocity at calculated Ø</span>
                <strong id="exactVelocity">—</strong>
              </div>
              <div className={`${styles.resultCard} ${styles.inset}`}>
                <span>Velocity at nominal Ø</span>
                <strong id="nominalVelocity">—</strong>
              </div>
              <div className={`${styles.resultCard} ${styles.inset}`}>
                <span>Actual friction at nominal Ø</span>
                <strong id="nominalFriction">—</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
