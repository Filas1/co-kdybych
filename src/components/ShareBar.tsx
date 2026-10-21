"use client";

import { useEffect, useRef, useState } from "react";
import { getFontEmbedCSS, toBlob } from "html-to-image";
import { brand } from "@/brand.config";
import type { SimulationResult } from "@/lib/calc";
import type { CalculatorInputs } from "@/lib/inputs";
import { shareContent } from "@/lib/share-content";
import { ShareCard, STORY_HEIGHT, STORY_WIDTH } from "./ShareCard";

interface Props {
  result: SimulationResult;
  inputs: CalculatorInputs;
  /** Serialized inputs for the shareable link. */
  query: string;
}

type ImageState =
  | { status: "idle" }
  | { status: "rendering" }
  | { status: "ready"; file: File; previewUrl: string }
  | { status: "error" };

const FILE_NAME = "co-kdybych.png";

// Embedding the web font (download + base64) is the slowest part of the capture. The font never
// changes, so it is prepared once per page visit and reused by every render.
let fontEmbedCss: Promise<string> | null = null;

async function renderStory(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  fontEmbedCss ??= getFontEmbedCSS(node).catch((error) => {
    fontEmbedCss = null; // retry next time instead of caching the failure
    throw error;
  });
  const options = {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    pixelRatio: 1,
    backgroundColor: brand.colors.bg,
    fontEmbedCSS: await fontEmbedCss,
  };
  // Safari sometimes leaves out web fonts on the first pass, so the first render only warms up
  // html-to-image's font cache and the second one is the real image.
  await toBlob(node, options);
  const blob = await toBlob(node, options);
  if (!blob) throw new Error("html-to-image returned no image");
  return blob;
}

/**
 * Two ways to share: a story image and a link.
 *
 * iPhones only open the share sheet straight after a tap, but drawing the image takes a moment.
 * So the first tap prepares the image and shows a preview; the "Sdílet" button in the preview
 * then shares the ready file instantly. Where file sharing is not supported (desktop, Instagram's
 * in-app browser) the image can be downloaded or long-pressed and saved.
 */
export function ShareBar({ result, inputs, query }: Props) {
  const content = shareContent(result, inputs);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<ImageState>({ status: "idle" });
  const [linkNote, setLinkNote] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  // Draw the PNG once the off-screen card is mounted.
  useEffect(() => {
    if (image.status !== "rendering" || !cardRef.current) return;
    let cancelled = false;
    renderStory(cardRef.current)
      .then((blob) => {
        if (cancelled) return;
        const file = new File([blob], FILE_NAME, { type: "image/png" });
        setImage({ status: "ready", file, previewUrl: URL.createObjectURL(blob) });
      })
      .catch(() => !cancelled && setImage({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [image.status]);

  // Free the preview's memory when it is replaced or the component goes away.
  useEffect(() => {
    if (image.status !== "ready") return;
    return () => URL.revokeObjectURL(image.previewUrl);
  }, [image]);

  if (!content) return null;

  function openImage() {
    setShareNote(null);
    setImage({ status: "rendering" });
    dialogRef.current?.showModal();
  }

  const canShareFile =
    image.status === "ready" && typeof navigator !== "undefined" && navigator.canShare?.({ files: [image.file] });

  async function shareImage() {
    if (image.status !== "ready") return;
    try {
      await navigator.share({ files: [image.file], title: brand.name });
    } catch (error) {
      if ((error as Error).name !== "AbortError") setShareNote("Sdílení se nepovedlo. Stáhni si obrázek a nahraj ho ručně.");
    }
  }

  function downloadImage() {
    if (image.status !== "ready") return;
    const link = document.createElement("a");
    link.href = image.previewUrl;
    link.download = FILE_NAME;
    link.click();
  }

  async function shareLink() {
    const url = `${window.location.origin}${window.location.pathname}?${query}`;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    try {
      if (touch && navigator.share) {
        await navigator.share({ title: brand.name, text: "Spočítej si, kolik by dnes měly tvoje peníze.", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setLinkNote("Odkaz je zkopírovaný.");
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setLinkNote(`Zkopíruj si ho ručně: ${url}`);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={openImage}
          className="min-h-12 rounded-full bg-accent px-4 font-bold text-on-accent transition hover:brightness-95"
        >
          Obrázek na story
        </button>
        <button
          type="button"
          onClick={shareLink}
          className="min-h-12 rounded-full border border-line px-4 font-medium transition hover:border-muted"
        >
          Sdílet odkaz
        </button>
      </div>
      {linkNote && (
        <p className="break-all px-1 text-sm text-muted" role="status">
          {linkNote}
        </p>
      )}

      {/* Off-screen story card, mounted only while the image is being drawn. */}
      {image.status === "rendering" && (
        <div aria-hidden style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }}>
          <ShareCard ref={cardRef} result={result} content={content} />
        </div>
      )}

      <dialog
        ref={dialogRef}
        // The "close" event arrives asynchronously; if the dialog was reopened in the meantime,
        // resetting here would cancel the new image, so only reset while it is really closed.
        onClose={() => {
          if (!dialogRef.current?.open) setImage({ status: "idle" });
        }}
        className="m-auto w-[min(92vw,420px)] rounded-3xl bg-surface p-5 text-fg backdrop:bg-black/70"
        aria-labelledby="share-title"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="share-title" className="text-lg font-bold">
            Obrázek na story
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-10 rounded-full px-3 text-sm text-muted hover:text-fg"
          >
            Zavřít
          </button>
        </div>

        <div className="flex aspect-[9/16] max-h-[60vh] w-full items-center justify-center overflow-hidden rounded-2xl bg-bg">
          {image.status === "ready" ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob URL, next/image can't optimise it
            <img src={image.previewUrl} alt={`${content.scenario}: ${content.hero}. ${content.hook}`} className="h-full w-full object-contain" />
          ) : image.status === "error" ? (
            <p className="p-6 text-center text-sm text-loss">Obrázek se nepovedlo vytvořit. Zavři okno a zkus to znovu.</p>
          ) : (
            <p className="text-sm text-muted" role="status">
              Chystám obrázek…
            </p>
          )}
        </div>

        {image.status === "ready" && (
          <div className="mt-4 space-y-2">
            {canShareFile && (
              <button
                type="button"
                onClick={shareImage}
                className="min-h-12 w-full rounded-full bg-accent font-bold text-on-accent transition hover:brightness-95"
              >
                Sdílet
              </button>
            )}
            <button
              type="button"
              onClick={downloadImage}
              className={
                canShareFile
                  ? "min-h-12 w-full rounded-full border border-line font-medium transition hover:border-muted"
                  : "min-h-12 w-full rounded-full bg-accent font-bold text-on-accent transition hover:brightness-95"
              }
            >
              Stáhnout PNG
            </button>
            <p className="text-center text-xs text-muted">V Instagramu? Podrž obrázek a ulož si ho do fotek.</p>
            {shareNote && (
              <p className="text-center text-sm text-loss" role="alert">
                {shareNote}
              </p>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}
