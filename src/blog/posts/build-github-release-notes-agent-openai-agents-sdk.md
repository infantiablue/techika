---
title: Build a GitHub Release-Notes Agent with the OpenAI Agents SDK
description: >-
  Build a small TypeScript agent that reads real merged pull requests from a
  public GitHub repository and drafts release notes with source links. No fake
  database, multi-agent routing, or GitHub write token.
author: Truong Phan
type: article
status: published
image: >-
  /media/build-github-release-notes-agent-openai-agents-sdk/81c03b68-55cf-4694-92b9-b12680f1138e-github-release-agent.png
date: '2026-09-15'
tags:
  - ai
  - agents
  - openai
  - typescript
  - github
publishedAt: '2026-09-23T15:29:33.495Z'
imageAlt: Build a GitHub Release-Notes Agent with the OpenAI Agents SDK
---
When studying about OpenAI Agents API, I had a bad idea for a demo to see how it works in practice. It was a refund-support agent. The agent would inspect an order, decide whether a customer was eligible, then wait for a human to approve the actual refund. The safety lesson was good, however it was not practical in this situation.

A helpful refund demo really benefits from orders, payment status, a refund policy, a stable approval state, protection against duplicate actions, and an audit trail. If I used made-up data for everything, the app might seem more finished than it actually is. Hooking it up to a real payment provider would turn the tutorial into a mini commerce system—and honestly, I can’t just invent all that data out of thin air.

That is too much for a first agent project. I wanted a demo with real data and a constraint I could comprehend the abilities fi the SDK. GitHub gives us both. A public repository already has merged pull requests, labels, authors, dates, and links. An agent can turn those records into a release-note draft. It does not need permission to write to GitHub, and the maintainer still owns the final edit and publication.

This tutorial builds a small TypeScript command-line demo. You pass a public GitHub repository and a date. The agent reads merged pull requests after that date, optionally asks for more detail on a specific pull request, and returns Markdown release notes with source links.

## What we are building

The demo has three read-only tools:

1. `get_repository` checks that the repository exists and gives the agent basic context.
2. `list_merged_pull_requests` returns a capped list of merged pull requests after a date.
3. `get_pull_request` fetches the body and labels for one pull request when the title is not enough.

The model does the editorial part: grouping entries, writing headings, and calling out breaking changes. The tools do the factual part: retrieving repository data.

That division matters. I do not want the model to describe a release based on what it vaguely remembers about a repository. I want it to make claims from the pull requests it was given.

OpenAI describes the SDK path as the one where your server owns tool implementations and state while the SDK runs the agent loop.[[1]](https://developers.openai.com/api/docs/guides/agents/sdk) That is exactly what this example needs. Our script owns the GitHub calls; the SDK decides when to call them and passes their output back to the model.

## Before you start

You need a current LTS Node.js release, an OpenAI API key, and a public GitHub repository. The code uses GitHub without authentication first. That is enough for a small demo, but public API access is rate limited. If you hit that limit, create a fine-grained GitHub token with read-only access to public repositories and set `GITHUB_TOKEN` locally.

Create an empty folder and install the packages:

```bash
mkdir github-release-notes-agent
cd github-release-notes-agent
npm init -y
npm install @openai/agents zod dotenv
npm install --save-dev typescript tsx @types/node
```

Create a `.env` file. Do not commit it.

```bash
OPENAI_API_KEY=your_openai_key_here

# Optional. This raises GitHub's API allowance for your local demo.
# GITHUB_TOKEN=github_pat_...
```

The JavaScript SDK's own repository uses `Agent`, `run`, and Zod-backed tools in its examples.[[2]](https://github.com/openai/openai-agents-js) We will use the same small surface area.

## Write the demo

Create `release-notes.ts` and paste this file in full:

```ts
import "dotenv/config";
import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";

type GitHubPullRequest = {
  number: number;
  title: string;
  html_url: string;
  body: string | null;
  merged_at: string | null;
  user: { login: string } | null;
  labels: Array<{ name: string }>;
};

const repoInput = z.object({
  owner: z.string().regex(/^[A-Za-z0-9-]+$/),
  repo: z.string().regex(/^[A-Za-z0-9._-]+$/),
});

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: "Bearer " + process.env.GITHUB_TOKEN }
    : {}),
};

async function github<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: githubHeaders,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub returned ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

const getRepository = tool({
  name: "get_repository",
  description: "Get basic facts about one public GitHub repository.",
  parameters: repoInput,
  async execute({ owner, repo }) {
    const data = await github<{
      full_name: string;
      description: string | null;
      default_branch: string;
      html_url: string;
    }>(`/repos/${owner}/${repo}`);

    return {
      fullName: data.full_name,
      description: data.description,
      defaultBranch: data.default_branch,
      url: data.html_url,
    };
  },
});

const listMergedPullRequests = tool({
  name: "list_merged_pull_requests",
  description:
    "List up to 30 pull requests merged after an ISO date. Use this before drafting release notes.",
  parameters: repoInput.extend({
    after: z.string().datetime({ offset: true }),
  }),
  async execute({ owner, repo, after }) {
    const pulls = await github<GitHubPullRequest[]>(
      `/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
    );

    const cutoff = new Date(after).getTime();

    return pulls
      .filter((pull) => pull.merged_at)
      .filter((pull) => new Date(pull.merged_at as string).getTime() >= cutoff)
      .slice(0, 30)
      .map((pull) => ({
        number: pull.number,
        title: pull.title,
        mergedAt: pull.merged_at,
        author: pull.user?.login ?? "unknown",
        labels: pull.labels.map((label) => label.name),
        url: pull.html_url,
      }));
  },
});

const getPullRequest = tool({
  name: "get_pull_request",
  description:
    "Get the full title, body, labels, merge date, and URL for one pull request. Use only when the list result does not contain enough detail.",
  parameters: repoInput.extend({
    number: z.number().int().positive(),
  }),
  async execute({ owner, repo, number }) {
    const pull = await github<GitHubPullRequest>(
      `/repos/${owner}/${repo}/pulls/${number}`,
    );

    return {
      number: pull.number,
      title: pull.title,
      body: pull.body,
      mergedAt: pull.merged_at,
      author: pull.user?.login ?? "unknown",
      labels: pull.labels.map((label) => label.name),
      url: pull.html_url,
    };
  },
});

const releaseNotesAgent = new Agent({
  name: "Release Notes Drafting Agent",
  instructions: `
You draft release notes from GitHub pull request data.

Rules:
- Call get_repository first, then list_merged_pull_requests.
- Treat tool results as the only source of repository facts.
- You may call get_pull_request for a small number of ambiguous entries.
- Do not claim a pull request is a feature, fix, or breaking change unless its title, labels, or body supports that classification.
- If no evidence supports a category, omit the category.
- Return Markdown with: title, a one-paragraph summary, grouped entries, and a Sources section.
- Every entry must link to its pull request URL.
- Add a short "Needs human review" section for unclear titles, missing labels, or possible breaking changes.
`,
  tools: [getRepository, listMergedPullRequests, getPullRequest],
});

const [owner, repo, after] = process.argv.slice(2);

if (!owner || !repo || !after) {
  console.error(
    "Usage: npx tsx release-notes.ts <owner> <repo> <ISO-8601-date>",
  );
  process.exit(1);
}

async function main() {
  const result = await run(
    releaseNotesAgent,
    `Draft release notes for ${owner}/${repo}. Include pull requests merged on or after ${after}.`,
  );

  console.log(result.finalOutput);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

There are a few boring details here that save trouble later.

The repository names are validated before they become part of a URL. The pull-request tool limits the list to 30 entries. The agent can ask for details, but the prompt tells it to do that only when a title is unclear. That keeps one request from turning into a long and expensive chain of API calls.

The `after` parameter uses a full ISO date-time rather than a loose date string. This avoids the awkward question of whose midnight we mean.

## Run it against real data

Use the OpenAI Agents SDK repository as the first target:

```bash
npx tsx release-notes.ts openai openai-agents-js 2026-08-01T00:00:00Z
```

The exact output will change as the repository changes. That is expected. What should not change is the evidence trail: each release-note entry should link back to a pull request returned by GitHub.

A good result might group entries under headings such as “New features” and “Fixes.” A better result also admits uncertainty. A pull request called “cleanup” with no label and an empty description does not contain enough information for a confident user-facing sentence. The agent should put that entry under “Needs human review,” or leave it out.

That is not the model being weak. It is the system refusing to manufacture detail that GitHub did not provide.

## Check the tool boundary

This is the most important part of the demo. The model should write prose. It should not be the source of repository facts.

Try these checks after the first run:

### Ask for a repository that does not exist

```bash
npx tsx release-notes.ts this-owner-does-not-exist no-such-repo 2026-08-01T00:00:00Z
```

The GitHub request should fail. Do not catch that error and replace it with a friendly invented release note. Surface it clearly in a production UI.

### Use a recent cutoff with no merged pull requests

Pick a future date:

```bash
npx tsx release-notes.ts openai openai-agents-js 2030-01-01T00:00:00Z
```

The agent should say it found no qualifying pull requests. It should not produce a generic changelog because a response was expected.

### Look at the source links

Open a few links from the generated Sources section. Check the title, labels, and date against GitHub. This is the fastest useful evaluation for a demo like this. You are checking whether the agent's claims trace back to the records that were available to it.

OpenAI's tools guide includes function tools as a primary tool category.[[3]](https://openai.github.io/openai-agents-js/guides/tools/) The interesting work is not registering one. It is deciding what the tool is allowed to return, how much it can return, and what the model must do when the evidence is incomplete.

## What this demo does not solve

This script is a draft generator, not a release system.

It does not know which pull requests belong to a particular tag unless you give it a date boundary that approximates that release window. It only reads the first page of closed pull requests, so a busy repository may need pagination. It does not handle GitHub rate-limit responses gracefully. It also does not know whether a maintainer considers a change breaking unless the pull request says so.

Those are not reasons to add more agents. They are reasons to make the input contract better.

A production version could accept two tags, compare their commit ranges, cache GitHub responses, and save the reviewer’s edits. I would still keep the agent read-only. A maintainer should copy or approve the final Markdown before it becomes a release.

## Where to take it next

Once this version works, there are two sensible directions.

The first is a small web UI: a repository field, a date field, a generated Markdown panel, and a visible list of the pull requests the agent used. That turns the command-line proof into something a maintainer can use.

The second is the more difficult tutorial I originally wanted to write: allow the agent to propose a GitHub release, but force a human approval before the write tool runs. The approval feature is part of the SDK’s human-in-the-loop flow, which pauses a tool call and later resumes the run from its saved state.[[4]](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/)

That belongs after the read-only version. First prove that the agent can gather and organize evidence. Then decide whether it has earned permission to change anything.

## Bottom line

A useful first agent demo does not need a fake business database or a scary autonomous action. Just give the agent real public data, and see how it process step by step, so that we can comprehend its fundamental capabilities.

## Sources

- OpenAI, [Agents SDK](https://developers.openai.com/api/docs/guides/agents/sdk) — describes the SDK deployment model where an application owns tools and state while the SDK runs the agent loop.
- OpenAI, [OpenAI Agents SDK for JavaScript](https://github.com/openai/openai-agents-js) — SDK repository and TypeScript examples.
- OpenAI, [Tools](https://openai.github.io/openai-agents-js/guides/tools/) — function-tool category and SDK tool patterns.
- OpenAI, [Human-in-the-loop](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/) — approval interruptions and resuming a paused run.
