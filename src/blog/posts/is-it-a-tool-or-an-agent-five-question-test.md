---
title: Is It a Tool or an Agent? A Five-Question Test
description: >-
  "Agent" is a marketing label, not an engineering category. Here's a
  five-question test you can run against any system to figure out what it
  actually is, and how much guarding it deserves.
author: Truong Phan
type: article
status: draft
image: ''
date: '2026-09-06'
tags:
  - ai
  - agents
  - architecture
imageAlt: Is It a Tool or an Agent? A Five-Question Test
---
Every product brief I read these days calls something an agent. A code autocomplete is an agent. An assistant that rewrites your subject line is an agent. A bot that files your Jira tickets is, apparently, an agent.

I don't think this is a vocabulary quibble. It changes how much monitoring you owe a system, and it changes how much ceremony you're allowed to skip. But the label is doing bad work.

Here's the part nobody says out loud: **agent is not a property of the model. It's a property of the system you wrapped around the model.** The same model can sit inside a tool on Monday and an agent on Tuesday. What changes is not intelligence. It's how much the system can do on its own and how hard it is to take back.

## Why the label is useless

The strongest version of the "it's an agent" argument comes from Yuval Noah Harari in *Nexus*. He writes that a knife doesn't decide what to cut, but AI can process information and make decisions by itself. His conclusion is blunt: "AI isn't a tool, it's an agent."

On capability, he's right. The model does make decisions. But the jump from "can decide" to "is an agent" is where the market does its favorite trick: it collapses a whole spectrum into one word. In practice that same model powers suggestions in your editor, a command palette in your terminal, and a system that moves real money at 3am. Calling all three "agents" tells you nothing about how to build or govern them. The behavior tells you.

## The five questions

So drop the label and ask five things you can actually observe. Each one answers a different part of the "how much trouble could this get into" question.

**1. Can it set its own goals?**
A tool does exactly what you ask, when you ask. An agent can take a fuzzy objective like "improve our test coverage" and break it into steps it picks itself. The test: if you run the same thing twice, does it decide to do the same thing, or does it choose its own path?

**2. Does it change the world, or just read it?**
A suggestion in your editor lives in your buffer until you commit to it. A bot that opens a branch, pushes it, and files a PR has already changed the state of your repo. Money, files, database rows, messages, deployments. The question is where the side effects land and whether they were already durable before you checked them.

**3. Does it look around before it acts?**
A tool sees what you typed. An agent can read the repo, check the current market price, look at the lint output, and read the last three messages in the thread before it decides. Perception is what lets a system react to things you never told it about. That's powerful, and it's also the thing that makes behavior harder to predict.

**4. Does it keep going on its own?**
One-and-done systems return a result and stop. Looping systems keep working until some condition is met, and they often decide for themselves when to stop. The difference matters: a loop can do a lot more than any single pass, and it can do it while you're asleep.

**5. How much does it cost to undo?**
This is the one that should drive the design. Text in a diff you review is effectively free to undo. A deployed change might be easy. A financial trade, a physical flight, or an email to ten thousand customers is a different shape of undo: you either can't, or the undo costs more than the thing it fixes.

The five questions collapse into three things that actually matter: how much autonomy it has, how much of the world it can touch, and how reversible the damage is. That's the real axis. Everything else is decoration.

## Scoring five real systems

Let me run the test on a few things you've seen around, from lowest to highest blast radius.

| System | Goals | Mutates state | Perceives | Loops | Reversible |
| --- | --- | --- | --- | --- | --- |
| GitHub Copilot autocomplete | Fixed | No | Cursor context only | No | Fully, in your buffer |
| Editor "agent" (build mode) | Sets subgoals | Yes, writes files | Reads the repo | Yes | Via git, if you review |
| Automated PR agent | Sets subgoals | Yes, branches + pushes | Reads repo + CI | Yes | Medium, git revert |
| Auto-rebalancing portfolio | Sets its own trades | Yes, moves money | Reads market prices | Yes | Low, trades settle |
| Autonomous drone | Sets mission objectives | Yes, physically moves | Reads the physical world | Yes | Essentially none |

**GitHub Copilot autocomplete** is a tool. It has no goals beyond finishing your line, it doesn't change anything you haven't approved, it doesn't loop. Reversible by definition. You review it, you keep it or you don't. The lightest possible guarding is correct here, and it's a waste of everyone's time to build an approval chain around it.

**The editor "agent"** is the interesting middle case. It can pick its own subtasks, it writes files, and it will happily run your test suite or install a dependency. The reason people call it an agent is real. But note: it's an agent with a generous undo mechanism, because git is right there. Guarding it should live in the boundary: sandbox what it can touch, force a diff review, and don't hand it production credentials or a way to merge on its own. The danger isn't that it writes bad code. It's that it runs things you didn't ask it to run.

**The automated PR agent** is the editor agent with CI feedback and a goal. It picks its own subtasks, loops until the checks pass, and it has a real undo path in git. Its score lives and dies on one switch: can it merge? If it only opens branches and files pull requests, it's still a leashed assistant, because a human decides whether it ships. If you give it auto-merge on a green build, you've removed the only person who was going to check the work. At that point it's publishing to production on its own reading of a fuzzy goal, and "git revert" becomes an excuse rather than a safeguard, because nobody sees the change until it's already live.

**The auto-rebalancing portfolio** is where the answer stops being academic. It has a fuzzy goal (keep this allocation), it perceives current prices, and it moves real money. A bad decision can't be un-traded. This is the closest everyday analog to the EU AI Act's "high-risk" systems, and the legal framework is explicitly not asking whether you call it an agent. It's asking whether the system can take irreversible actions and how much oversight sits on top of it. The answer determines whether you need an audit log, a human approval before each trade, a kill switch, and hard action limits. Not the word you used in the deck.

**The autonomous drone** is the far end. It sets its own objectives within rules, it perceives a messy physical world, and once it's airborne the undo problems become physical. This is the case where "agent-grade" guarding is every bit as important as the label suggests, and then some.

## Match the safeguards to the score

Once you've scored a system, the design follows three bands:

**Tool.** Low autonomy, minimal state change, fully reversible. Guard it by reviewing the output. An approval gate here is overhead with no upside.

**Leashed assistant.** It acts and it loops, but the surface it touches is bounded and the undo path is cheap. Guard the boundary, not every step: restrict the permissions it gets, force the diff review, keep it off anything irreversible (prod, money, the mailing list), and let revert be the mechanism of last resort.

**High blast radius agent.** It acts autonomously and the undo is expensive or impossible. This is where you spend real money on the frame around it: traceability logging so you can reconstruct what it did, human approval before any irreversible action, a kill switch, rate and action limits, and a deliberate cap on how much it's allowed to do in one run. This is also the shape the EU AI Act's high-risk obligations assume: risk management, logging for traceability, clear documentation, and human oversight assigned to someone with the actual authority to intervene.

The useful realization is that reversibility, not autonomy, should set your patience for risk. A fully autonomous agent whose only output is text deserves less guarding than a barely-autonomous bot that moves money. Autonomy tells you what it might do. Reversibility tells you how fast you'd have to stop it.

## Bottom line

The label isn't worth arguing over. If someone hands you a deck that calls something an agent, run the five questions, give it a score, and put your effort into the frame around it based on two things: how much it can do on its own, and what it costs to take back.

That's the part worth spending money on. Review gates and sandboxing are cheap to add and hard to justify for a tool. For a system that moves money or ships to customers while nobody's watching, they're not ceremony. They're the difference between catching a mistake and explaining one.

## Sources

- Yuval Noah Harari, *Nexus: A Brief History of Information Networks from the Stone Age to AI* (2024) — the "AI isn't a tool, it's an agent" framing.
- European Commission, [Regulatory Framework for AI (AI Act)](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai) — high-risk AI obligations including risk management, traceability logging, documentation, and human oversight.
- European Commission, [Navigating the AI Act — Human Oversight Obligations](https://digital-strategy.ec.europa.eu/en/faqs/navigating-ai-act) — oversight must be assigned to people equipped and enabled to intervene.
