const imageEndpoint = "https://api.openai.com/v1/images/generations";

function text(value, label, { required = false, max = 600 } = {}) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (required && !normalized) throw new Error(`${label} is required.`);
  if (normalized.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return normalized;
}

export function buildCoverPrompt(input) {
  const title = text(input?.title, "Title", { required: true, max: 180 });
  const description = text(input?.description, "Description", { required: true, max: 600 });
  const direction = text(input?.direction, "Visual direction", { max: 600 });
  const tags = Array.isArray(input?.tags) ? input.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12).join(", ") : "";
  return [
    "Create a distinctive editorial cover illustration for a personal technology and ideas publication.",
    `Article title: ${title}`,
    `Article summary: ${description}`,
    tags && `Topics: ${tags}`,
    direction && `Visual direction from the editor: ${direction}`,
    "Use a clear, thumbnail-readable visual metaphor with a refined editorial feel. Use a landscape 16:9 composition. Do not include words, letters, logos, watermarks, UI, borders, or a collage layout.",
  ].filter(Boolean).join("\n");
}

export async function generateCover(input) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("AI cover generation is not configured.");
  const response = await fetch(imageEndpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-2", prompt: buildCoverPrompt(input), size: "2048x1152", quality: "low", output_format: "png" }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    if (result?.error?.code === "moderation_blocked") throw new Error("This image request could not be completed. Try changing the visual direction.");
    throw new Error("Image generation failed. Try again.");
  }
  const image = (await response.json()).data?.[0]?.b64_json;
  if (typeof image !== "string" || !image) throw new Error("Image generation returned no image.");
  return Buffer.from(image, "base64");
}
