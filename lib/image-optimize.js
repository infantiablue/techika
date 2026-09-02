import { coverSize } from "./media-rules.js";

const quality = 0.88;
const minimumSaving = 0.1;
const bodyBounds = { width: 1920, height: 2560 };
const maxImageBytes = 10 * 1024 * 1024;
const outputType = "image/jpeg";

export function optimizedDimensions(width, height, cover = false) {
  const bounds = cover ? coverSize : bodyBounds;
  const scale = Math.min(1, bounds.width / width, bounds.height / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function shouldUseOptimized(originalBytes, optimizedBytes) {
  return optimizedBytes <= originalBytes * (1 - minimumSaving);
}

function jpegName(name) {
  return `${name.replace(/\.[^.]+$/, "") || "image"}.jpg`;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The browser could not optimize this image.")), outputType, quality));
}

export async function optimizeImage(file, { cover = false } = {}) {
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > maxImageBytes) throw new Error("Images must be between 1 byte and 10 MiB.");
  if (file.type === "image/gif") return { file, originalSize: file.size, finalSize: file.size, savedPercent: 0, optimized: false, skipped: true };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Upload a JPEG, PNG, WebP, or GIF image.");

  let image;
  try {
    image = await createImageBitmap(file);
    if (cover && (image.width !== coverSize.width || image.height !== coverSize.height)) throw new Error(`Edit and crop covers to ${coverSize.width} × ${coverSize.height} before publishing.`);
    const dimensions = optimizedDimensions(image.width, image.height, cover);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, dimensions.width, dimensions.height);
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    const blob = await canvasBlob(canvas);
    const optimized = shouldUseOptimized(file.size, blob.size);
    const nextFile = optimized ? new File([blob], jpegName(file.name), { type: blob.type }) : file;
    return { file: nextFile, originalSize: file.size, finalSize: nextFile.size, savedPercent: optimized ? Math.round((1 - nextFile.size / file.size) * 100) : 0, optimized, skipped: false };
  } catch (error) {
    throw new Error(error?.message || "The browser could not optimize this image.");
  } finally {
    image?.close?.();
  }
}

export function optimizationSummary(result) {
  if (result.skipped) return "Animated GIF kept unchanged.";
  if (!result.optimized) return "The original was already efficient.";
  const kb = (bytes) => Math.max(1, Math.ceil(bytes / 1024));
  return `Optimized ${kb(result.originalSize)} KB to ${kb(result.finalSize)} KB (${result.savedPercent}% smaller).`;
}

export const imageOptimizationRules = { bodyBounds, maxImageBytes, minimumSaving, quality, outputType };
