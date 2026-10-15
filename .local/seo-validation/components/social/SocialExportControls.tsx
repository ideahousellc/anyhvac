"use client";

import { useState } from "react";

const SLIDE_COUNT = 5;
const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1350;

type ExportStatus = "idle" | "exporting" | "done" | "error";

function getSlideFilename(number: number) {
  const slideNumber = String(number).padStart(2, "0");
  return `anyhvac-instagram-post-01-slide-${slideNumber}.png`;
}

async function waitForSlideAssets(node: HTMLElement) {
  await document.fonts.ready;

  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }

      if (typeof image.decode === "function") {
        await image.decode().catch(() => undefined);
      }
    }),
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function exportSlide(number: number, fontEmbedCSS?: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Social exports are disabled in production.");
  }

  const node = document.getElementById(`social-slide-${number}`);
  if (!node) throw new Error(`Slide ${number} was not found.`);

  await waitForSlideAssets(node);

  const { getFontEmbedCSS, toBlob } = await import("html-to-image");
  const embeddedFonts = fontEmbedCSS ?? await getFontEmbedCSS(node, {
    preferredFontFormat: "woff2",
  });
  const blob = await toBlob(node, {
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    canvasWidth: EXPORT_WIDTH,
    canvasHeight: EXPORT_HEIGHT,
    pixelRatio: 1,
    skipAutoScale: true,
    cacheBust: true,
    includeQueryParams: true,
    preferredFontFormat: "woff2",
    fontEmbedCSS: embeddedFonts,
    style: {
      inset: "auto",
      position: "relative",
      transform: "none",
      transformOrigin: "top left",
    },
  });

  if (!blob) throw new Error(`Slide ${number} could not be rendered.`);
  downloadBlob(blob, getSlideFilename(number));

  return embeddedFonts;
}

function statusLabel(status: ExportStatus, idleLabel: string) {
  if (status === "exporting") return "Exporting…";
  if (status === "done") return "Downloaded";
  if (status === "error") return "Try again";
  return idleLabel;
}

export function SocialExportButton({
  className,
  number,
}: {
  className: string;
  number: number;
}) {
  const [status, setStatus] = useState<ExportStatus>("idle");

  async function handleExport() {
    setStatus("exporting");
    try {
      await exportSlide(number);
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1_800);
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return (
    <button
      className={className}
      type="button"
      onClick={handleExport}
      disabled={status === "exporting"}
      aria-label={`Export slide ${number} as PNG`}
      aria-live="polite"
    >
      {statusLabel(status, "Export PNG")}
    </button>
  );
}

export function SocialExportAllButton({ className }: { className: string }) {
  const [status, setStatus] = useState<ExportStatus>("idle");

  async function handleExportAll() {
    setStatus("exporting");
    try {
      let fontEmbedCSS: string | undefined;
      for (let number = 1; number <= SLIDE_COUNT; number += 1) {
        fontEmbedCSS = await exportSlide(number, fontEmbedCSS);
      }
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1_800);
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return (
    <button
      className={className}
      type="button"
      onClick={handleExportAll}
      disabled={status === "exporting"}
      aria-live="polite"
    >
      {statusLabel(status, "Export All")}
    </button>
  );
}
