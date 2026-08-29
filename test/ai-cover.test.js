import assert from "node:assert/strict";
import test from "node:test";
import { buildCoverPrompt, generateCover } from "../lib/ai-cover.js";

test("cover prompts use article context and reject incomplete input", () => {
  const prompt = buildCoverPrompt({ title: "A better queue", description: "How to reason about backlog pressure.", tags: ["systems"], direction: "A quiet transit map" });
  assert.match(prompt, /A better queue/);
  assert.match(prompt, /quiet transit map/);
  assert.throws(() => buildCoverPrompt({ title: "", description: "Missing title" }), /Title is required/);
});

test("cover generation requests a low-quality landscape PNG", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = global.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  let options;
  global.fetch = async (_url, value) => { options = value; return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from("image").toString("base64") }] }), { status: 200 }); };
  try {
    assert.deepEqual(await generateCover({ title: "Title", description: "Description" }), Buffer.from("image"));
    assert.deepEqual(JSON.parse(options.body), { model: "gpt-image-2", prompt: buildCoverPrompt({ title: "Title", description: "Description" }), size: "2048x1152", quality: "low", output_format: "png" });
  } finally { global.fetch = previousFetch; if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey; }
});
