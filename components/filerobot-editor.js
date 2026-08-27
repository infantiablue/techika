"use client";

import dynamic from "next/dynamic";
import isPropValid from "@emotion/is-prop-valid";
import { useEffect, useMemo, useState } from "react";
import { StyleSheetManager } from "styled-components";
import { coverSize } from "../lib/media-rules";

const FilerobotImageEditor = dynamic(() => import("react-filerobot-image-editor"), { ssr: false, loading: () => <p className="media-editor-loading">Loading image editor…</p> });
const lightEditorTheme = {};
const darkEditorTheme = { palette: { "bg-stateless": "#121713", "bg-active": "#202a23", "bg-base-light": "#202a23", "bg-base-medium": "#2a352d", "bg-primary": "#121713", "bg-primary-light": "#202a23", "bg-primary-hover": "#2a352d", "bg-primary-active": "#2f4035", "bg-primary-stateless": "#394039", "bg-secondary": "#202a23", "bg-hover": "#2a352d", "txt-primary": "#f1f0e9", "txt-secondary": "#b8b9ae", "txt-placeholder": "#8f968e", "icon-primary": "#b8b9ae", "icons-secondary": "#8db5a0", "icons-placeholder": "#676f68", "icons-muted": "#8f968e", "icons-primary-hover": "#f1f0e9", "accent-primary": "#8db5a0", "accent-primary-hover": "#a9c7b7", "accent-primary-active": "#c2d8cc", "accent-stateless": "#8db5a0", "access-primary": "#121713", "btn-primary-text": "#121713", "btn-secondary-text": "#f1f0e9", "borders-primary": "#566057", "borders-primary-hover": "#8db5a0", "borders-secondary": "#394039", "borders-strong": "#687169", "border-primary-stateless": "#566057", "borders-item": "#394039", "active-secondary": "#202a23", "light-shadow": "rgba(0, 0, 0, .35)" } };

function useDarkTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => { const theme = document.documentElement.dataset.theme; setDark(theme === "dark" || (!theme && media.matches)); };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    media.addEventListener("change", update); update();
    return () => { observer.disconnect(); media.removeEventListener("change", update); };
  }, []);
  return dark;
}

async function savedFile(image, originalFile, cover) {
  const type = image.mimeType || originalFile.type || "image/png";
  let blob;
  if (image.imageCanvas) {
    let canvas = image.imageCanvas;
    if (cover && (canvas.width !== coverSize.width || canvas.height !== coverSize.height)) {
      const resized = document.createElement("canvas");
      resized.width = coverSize.width; resized.height = coverSize.height;
      resized.getContext("2d").drawImage(canvas, 0, 0, coverSize.width, coverSize.height);
      canvas = resized;
    }
    blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("The editor could not export this image.")), type, image.quality));
  }
  else if (image.imageBase64) blob = await fetch(image.imageBase64).then((response) => response.blob());
  else throw new Error("The editor did not return an image file.");
  const extension = image.extension || type.split("/")[1] || "png";
  return new File([blob], `${image.name || originalFile.name.replace(/\.[^.]+$/, "")}.${extension}`, { type: blob.type || type });
}

export function FilerobotEditor({ file, cover = false, onSave, onClose }) {
  const source = useMemo(() => URL.createObjectURL(file), [file]);
  const dark = useDarkTheme();
  const close = () => { URL.revokeObjectURL(source); onClose(); };
  const save = async (image) => { const nextFile = await savedFile(image, file, cover); URL.revokeObjectURL(source); onSave(nextFile); };

  return <div className="media-editor-modal" data-editor-theme={dark ? "dark" : "light"} role="dialog" aria-modal="true" aria-label="Edit image"><StyleSheetManager shouldForwardProp={(prop, target) => typeof target !== "string" || isPropValid(prop)}><FilerobotImageEditor source={source} noCrossOrigin theme={dark ? darkEditorTheme : lightEditorTheme} previewBgColor={dark ? "#0d120e" : "#eef1ef"} Crop={cover ? { ratio: coverSize.width / coverSize.height, ratioTitleKey: "landscape" } : undefined} tabsIds={["Adjust", "Finetune", "Filters", "Annotate", "Watermark", "Resize"]} defaultTabId="Adjust" onSave={save} onClose={close} /></StyleSheetManager></div>;
}
