---
title: 'How to Migrate Agent Memory from Honcho to Hindsight Safely'
description: >-
  A practical, reversible guide to moving durable agent knowledge, isolated
  profiles, and optional conversation history from Honcho or another memory
  provider into Hindsight.
author: Truong Phan
type: article
status: published
date: '2026-09-05'
tags:
  - ai-agents
  - agent-memory
  - honcho
  - hindsight
  - hermes-agent
---
Changing an agent's memory provider looks like a data-transfer problem. It is not.

The difficult part is deciding what deserves to survive.

Honcho, Hindsight, Mem0, flat Markdown files, and custom vector stores do not share one memory model. Honcho organises conversations around workspaces, peers, sessions, messages, conclusions, and peer representations. Hindsight retains documents into banks, extracts memory units, and builds its own observations and relationships.[[1]](https://honcho.dev/docs/v3/guides/integrations/hermes)[[2]](https://hindsight.vectorize.io/sdks/integrations/hermes)

Copying rows from one database to another would preserve bytes while losing meaning. Importing every old assistant response is worse: outdated advice, mistakes, repeated facts, and private data can all become “memories” again.

The safe approach is a staged migration:

```text
Inventory → Back up → Curate → Map banks → Configure → Retain → Verify → Retire
```

I learned this while moving a Hermes setup with several profiles from Honcho to local embedded Hindsight. Some profiles had independent memory. Two profiles accidentally shared the same Honcho identity, so their old histories were already mixed. That discovery changed the migration plan: curated summaries became the source of truth, while raw conversations became an optional archive.

This tutorial explains that process. The Hermes commands are concrete, but the migration design also works for other agent-memory systems.

## The five invariants

Before touching a configuration file, write down these rules:

1. **One logical agent profile maps to one stable Hindsight bank.**
2. **Secrets and obsolete facts never cross the boundary.**
3. **The old provider remains intact until recall is verified.**
4. **Every raw import has a stable source ID, timestamp, and origin.**
5. **A rerun replaces the same document instead of creating another copy.**

These rules matter more than the migration script.

Hindsight uses `document_id` for traceability. Retaining new content with the same ID replaces the old document and its extracted facts, which makes a controlled rerun possible.[[3]](https://hindsight.vectorize.io/developer/api/documents)

## Step 1: Inventory the current memory

Do this while Honcho is still active.

List the Hermes profiles:

```bash
hermes profile list
```

Then inspect memory for every profile:

```bash
hermes -p default memory status
hermes -p writer memory status
hermes -p researcher memory status
```

Use your actual profile names. The display name may not be the CLI name: a profile displayed as `Jarvis (default)` still uses `default` in commands.

Record four things for each profile:

| Question | Why it matters |
| --- | --- |
| Which provider is active? | A built-in-only profile has no external history to export. |
| Which Honcho workspace does it use? | Workspaces are the top-level source boundary. |
| Which user and AI peer IDs does it use? | The AI peer is usually the best profile-to-bank mapping key. |
| Does another profile use the same peer/session identity? | Shared identities mean the old history may already be mixed. |

Honcho's current model stores messages on sessions and derives conclusions and representations about peers. It exposes sessions, messages, conclusions, peer cards, and representations separately.[[4]](https://honcho.dev/docs/v3/api-reference/introduction)

Do not treat “provider installed” as “provider contains data.” A profile may have the Honcho plugin available while using only `MEMORY.md` and `USER.md`.

Create the destination map before importing anything:

| Hermes profile | Source identity | Hindsight bank |
| --- | --- | --- |
| `default` | general agent peer | `jarvis` |
| `writer` | writing agent peer | `writer` |
| `researcher` | no external memory | `researcher` |

Use lowercase bank IDs and keep them stable. `Sheldon` and `sheldon` may select different banks. Changing the ID later does not rename a bank; it points the profile at another memory namespace.

The bank ID is infrastructure, not personality. Put the agent's purpose in `SOUL.md` or the Hindsight bank mission.

## Step 2: Make a reversible backup

Create a private folder:

```bash
mkdir -p ~/Documents/hermes-memory-migration-backup
chmod 700 ~/Documents/hermes-memory-migration-backup
```

Export each profile:

```bash
hermes profile export default \
  -o ~/Documents/hermes-memory-migration-backup/default.tar.gz

hermes profile export writer \
  -o ~/Documents/hermes-memory-migration-backup/writer.tar.gz

hermes profile export researcher \
  -o ~/Documents/hermes-memory-migration-backup/researcher.tar.gz
```

Copy the Honcho configuration if you may need to reconnect:

```bash
cp -p ~/.hermes/honcho.json \
  ~/Documents/hermes-memory-migration-backup/honcho.json

chmod 600 ~/Documents/hermes-memory-migration-backup/*
```

Treat the backup as sensitive. A provider configuration can contain an API key even when a profile export excludes authentication files.

If export fails on `gateway.sock` or another Unix socket, stop that profile's gateway and retry. Sockets are live runtime endpoints, not memory:

```bash
hermes -p PROFILE_NAME gateway stop
hermes profile export PROFILE_NAME \
  -o ~/Documents/hermes-memory-migration-backup/PROFILE_NAME.tar.gz
hermes -p PROFILE_NAME gateway start
```

Do not delete the sockets while the gateway is running. If a stale socket remains after a clean stop, verify that it is actually a socket with `ls -l` before removing that exact file.

Also leave the Honcho workspace, account, API key, and server-side data alone. A provider switch in Hermes changes which integration is active; it does not migrate or delete remote Honcho data.

## Step 3: Build a curated migration snapshot

This is the primary migration. For most users, it is enough.

While Honcho is active, ask each profile to use its Honcho context and tools to write a compact `MEMORY.md` handover:

```bash
hermes -p writer chat -q \
  "Use the available Honcho profile, context, search, and reasoning tools to create a concise, deduplicated migration snapshot in this profile's MEMORY.md. Preserve stable preferences, active projects, important decisions, recurring workflows, technical setup, and open tasks. Exclude secrets, credentials, raw chat logs, unrelated profile knowledge, and obsolete facts. Mark uncertain or conflicting facts for review instead of guessing."
```

Repeat it for every profile that has external memory. Change the scope in the prompt: a research agent should retain research sources and workflows; a writing agent should retain voice, editorial rules, and publication processes.

Do not create a Honcho snapshot for a profile that never used Honcho. Its existing `MEMORY.md` and `USER.md` are already the migration source.

Hermes treats external providers as additive to its built-in Markdown memory, so switching providers does not replace those files.[[5]](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers)

Inspect every snapshot before cutover:

```bash
hermes -p writer chat -q \
  "Read MEMORY.md. List its headings, fact count, possible secrets, contradictions, and claims that may be obsolete. Do not modify the file."
```

Then read the file yourself. Check for:

- API keys, tokens, email addresses, private paths, account IDs, and personal data;
- preferences that were temporary rather than durable;
- old project statuses presented as current;
- an assistant's past guess presented as a user fact;
- knowledge belonging to another profile;
- two facts that conflict without dates or provenance.

Fix the snapshot now. Hindsight should derive its own memory graph from clean source material, not inherit another provider's conclusions blindly.

## Step 4: Configure Hindsight with Hermes

Use the wizard instead of copying a configuration example from the internet:

```bash
hermes -p default memory setup
hermes -p writer memory setup
hermes -p researcher memory setup
```

Choose **Hindsight**, then **Local / Embedded** for a local setup. Hermes installs the required Hindsight package for the chosen mode. Local Hindsight uses embedded PostgreSQL and requires an LLM provider key for memory extraction and synthesis.[[2]](https://hindsight.vectorize.io/sdks/integrations/hermes)

Configuration schemas evolve. If the wizard writes `local_embedded`, do not replace it with `local` because an older guide shows that value. Inspect the generated file rather than inventing keys:

```bash
cat ~/.hermes/hindsight/config.json
```

For named profiles, inspect the path reported by `hermes -p PROFILE_NAME memory status`.

Give every profile its planned bank ID. If the generated schema includes both a top-level `bank_id` and a `banks` block, keep the identifier consistent in both places.

With Hermes-managed embedded mode, separate **banks**, not ports. Let Hermes manage the local daemon unless you intentionally operate several standalone Hindsight servers. Hindsight documents `9077` as the default Hermes local API port, but the generated configuration is the source of truth for your installation.[[2]](https://hindsight.vectorize.io/sdks/integrations/hermes)

Send one message to each freshly configured profile. The embedded daemon starts on first use and its first PostgreSQL initialization can take more than a minute. Then check:

```bash
hermes -p default memory status
hermes -p writer memory status
hermes -p researcher memory status
```

If the local service does not start, inspect:

```bash
cat ~/.hermes/logs/hindsight-embed.log
```

Do not disable `MEMORY.md` or `USER.md` during migration. They are the rollback bridge. You can reconsider duplicate built-in memory only after the new provider is proven.

## Step 5: Retain the curated snapshot

Start a new chat for each profile and give one explicit migration instruction:

```text
Read this profile's MEMORY.md and retain its durable facts into Hindsight.
Treat the file as a one-time migration snapshot. Preserve useful dates and
scope. Do not retain secrets, uncertain claims, obsolete items, or instructions
that belong to another profile. Report what you retained and what you skipped.
```

The new chat matters. It tests that the new provider is active instead of relying on the old conversation's context.

After retention, ask direct questions whose answers appear only in the snapshot:

```text
What writing rules should you follow for my technical tutorials?

Which active projects do you remember, and what is the current status of each?

What information did you intentionally skip during the migration?
```

Close that chat and ask the same questions in another new session. Hindsight's Hermes integration automatically retains conversations after responses and recalls relevant memories before future LLM calls.[[2]](https://hindsight.vectorize.io/sdks/integrations/hermes)

Test isolation too:

- ask the writing profile for a research-only fact;
- ask the research profile for a writing-only rule;
- ask both profiles for a shared user preference.

The correct result is not “both agents remember everything.” The correct result is that shared facts appear where intended and profile-specific facts remain isolated.

## Step 6: Optionally import raw Honcho sessions

Stop here unless you have a real reason to preserve searchable conversation history.

The curated snapshot contains the durable knowledge an agent needs. Raw history is useful when you must recover exact past decisions, quote old conversations, or retain provenance that a summary cannot express.

The first migration script I considered was wrong for several reasons:

- it called `get_messages()` on a peer even though messages belong to sessions;
- it described raw messages as “conclusions,” which are a separate Honcho resource;
- it discarded authors, timestamps, session boundaries, and source IDs;
- it sent one isolated message per retain call;
- it created duplicates on every rerun.

Honcho's current Python package is `honcho-ai`. Its SDK exposes `honcho.sessions()` and `session.messages()`, and iteration follows pagination across all pages.[[6]](https://github.com/plastic-labs/honcho/tree/main/sdks/python) Hindsight's Python client accepts timestamps, metadata, context, and stable document IDs.[[7]](https://hindsight.vectorize.io/sdks/python)

Create a temporary directory and install the clients:

```bash
mkdir honcho-hindsight-migration
cd honcho-hindsight-migration
python3 -m venv .venv
source .venv/bin/activate
pip install "honcho-ai==2.4.0" "hindsight-client>=0.4.22"
```

The version pin documents the API used by this tutorial. Review the SDK changelog before upgrading it.

Create `migrate_honcho.py`:

```python
import argparse
import os

from honcho import Honcho
from hindsight_client import Hindsight


# Exact Honcho AI peer ID -> stable Hindsight bank ID.
# Do not include the shared human peer here.
SOURCE_PEER_TO_BANK = {
    "writer-agent": "writer",
    "research-agent": "researcher",
}


def choose_bank(messages):
    authors = {message.peer_id for message in messages}
    matches = {
        bank
        for peer_id, bank in SOURCE_PEER_TO_BANK.items()
        if peer_id in authors
    }
    return next(iter(matches)) if len(matches) == 1 else None


def make_transcript(messages):
    return "\n\n".join(
        f"[{message.created_at.isoformat()}] {message.peer_id}:\n"
        f"{message.content.strip()}"
        for message in messages
        if message.content.strip()
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write to Hindsight. Without this flag, only print the plan.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Stop after this many importable sessions; 0 means all.",
    )
    args = parser.parse_args()

    workspace_id = os.environ["HONCHO_WORKSPACE_ID"]
    honcho = Honcho(
        api_key=os.environ["HONCHO_API_KEY"],
        base_url=os.environ.get("HONCHO_URL"),
        workspace_id=workspace_id,
    )

    imported = 0
    skipped = 0

    with Hindsight(
        base_url=os.environ["HINDSIGHT_URL"],
        timeout=120.0,
    ) as hindsight:
        print(f"Hindsight API: {hindsight.get_version().api_version}")

        for session in honcho.sessions(size=100):
            messages = list(session.messages(size=100))
            bank_id = choose_bank(messages)

            if not messages or bank_id is None:
                skipped += 1
                print(f"SKIP {session.id}: empty, unmapped, or ambiguous")
                continue

            transcript = make_transcript(messages)
            if not transcript:
                skipped += 1
                print(f"SKIP {session.id}: no text content")
                continue

            document_id = f"honcho-{workspace_id}-{session.id}"
            print(
                f"{'IMPORT' if args.apply else 'PLAN'} "
                f"{session.id} -> {bank_id} "
                f"({len(messages)} messages, {len(transcript)} characters)"
            )

            if args.apply:
                hindsight.retain(
                    bank_id=bank_id,
                    content=transcript,
                    context=(
                        "Historical agent conversation imported from Honcho. "
                        "Preserve speaker attribution and treat assistant claims "
                        "as historical responses, not verified user facts."
                    ),
                    timestamp=messages[0].created_at,
                    document_id=document_id,
                    metadata={
                        "source": "honcho-migration",
                        "honcho_workspace_id": workspace_id,
                        "honcho_session_id": str(session.id),
                    },
                    retain_async=False,
                )

            imported += 1
            if args.limit and imported >= args.limit:
                break

    print(f"Done: {imported} importable, {skipped} skipped")


if __name__ == "__main__":
    main()
```

Replace the example peer IDs with the exact Honcho AI peer IDs from your inventory. If two profiles shared the same source AI peer, do not map that peer to two banks. The script will not be able to infer which profile owns a mixed session. Use the curated snapshot for those profiles or classify the sessions manually.

Set the connection values without putting the Honcho key in shell history:

```bash
read -rsp "Honcho API key: " HONCHO_API_KEY
export HONCHO_API_KEY
echo

export HONCHO_WORKSPACE_ID="your-workspace"
export HINDSIGHT_URL="http://127.0.0.1:9077"
```

Use the actual Hindsight URL from your generated configuration.

Run a dry plan first:

```bash
python migrate_honcho.py --limit 3
```

The default is intentionally read-only. Review every `PLAN` and `SKIP` line. Temporarily change the bank values in `SOURCE_PEER_TO_BANK` to names such as `writer-migration-test`, then import three sessions:

```bash
python migrate_honcho.py --limit 3 --apply
```

Test recall in those temporary banks. Only after the content and isolation look correct should you restore the final bank IDs and run the full import:

```bash
python migrate_honcho.py --apply
```

The stable `document_id` makes the import traceable and safe to rerun: retaining the same Honcho session again replaces the corresponding Hindsight document rather than creating another source.[[3]](https://hindsight.vectorize.io/developer/api/documents)

Keep `retain_async=False` during migration so an error is reported before the script moves on. Background retention is useful in normal agent traffic; it makes a one-time data migration harder to audit.

## How to adapt this to another memory provider

The Hindsight half stays the same. Replace the Honcho reader with an adapter that yields complete source sessions.

For each source session, preserve:

```text
source provider
source namespace or profile
stable session/document ID
created timestamp
speaker or role for every message
ordered content
source metadata needed for audit
```

Then retain one coherent session or document at a time. Do not flatten an entire account into one enormous string, and do not retain isolated sentences without their speaker and context.

Use this decision rule:

| Source capability | Migration method |
| --- | --- |
| Curated profile, facts, or conclusions | Review and convert them into a clean snapshot first. |
| Session/message export with stable IDs | Normalize each session and retain it with the same source identity. |
| Only semantic search or recall is available | Query by durable categories, review the answers, and build a snapshot. |
| Only an undocumented internal database exists | Avoid copying tables; use the supported API or keep the old provider as an archive. |

Provider-specific embeddings, vector indexes, confidence scores, and internal graph edges should normally stay behind. They are implementation details. Hindsight needs the source content and provenance so it can build its own representation.

## Step 7: Verify before retiring Honcho

A successful HTTP response proves that data arrived. It does not prove that the agent remembers well.

Run a small acceptance test for every bank:

1. Ask for three durable facts that should be present.
2. Ask for one obsolete fact that should have been excluded.
3. Ask for one secret that must not be retrievable.
4. Ask a question that requires combining two memories.
5. Start another session and repeat the important questions.
6. Ask a different profile for the same facts to test isolation.
7. Add one new fact, open another session, and confirm normal auto-retain works.

Record expected and actual answers. Memory quality is behavioural; memory count alone is not a pass condition.

Keep Honcho intact for at least a week or two of normal work. If Hindsight misses something important, retrieve it from Honcho, add it to the reviewed snapshot, and retain the snapshot again with the same document ID.

Only retire the old provider when:

- every active profile points to the intended bank;
- cross-session recall works;
- profile-specific memories do not leak across banks;
- new conversations are retained;
- the old configuration and profile exports can restore service;
- you no longer need Honcho as a reference archive.

## What I would do differently next time

I would define memory ownership before creating the second agent profile.

The hardest problem in this migration was not Python, PostgreSQL, or an API port. It was discovering that two agents had shared one source identity. Once histories are mixed, no migration tool can reliably reconstruct ownership from names alone.

The durable design is simple:

```text
one agent purpose
  → one source identity
  → one destination bank
  → one reviewed migration snapshot
```

Use raw history only when the product genuinely needs raw history. For a personal agent, a short, accurate memory is usually more useful than a perfect archive of everything the model once said.

## Sources

1. [Honcho: Hermes Agent integration](https://honcho.dev/docs/v3/guides/integrations/hermes)
2. [Hindsight: Hermes integration and embedded configuration](https://hindsight.vectorize.io/sdks/integrations/hermes)
3. [Hindsight documents and stable document IDs](https://hindsight.vectorize.io/developer/api/documents)
4. [Honcho API reference](https://honcho.dev/docs/v3/api-reference/introduction)
5. [Hermes Agent memory providers](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers)
6. [Honcho Python SDK](https://github.com/plastic-labs/honcho/tree/main/sdks/python)
7. [Hindsight Python client](https://hindsight.vectorize.io/sdks/python)
