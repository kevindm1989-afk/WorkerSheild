# WorkerShield

**WorkerShield** is an AI-powered Ontario labour defense PWA built for **Unifor Local 1285** union stewards and JHSC co-chairs at Saputo Dairy Products Canada G.P. (Halton Hills). It analyzes workplace problems against the Saputo / Unifor Local 1285 Collective Agreement and Ontario law, and produces a complete, citation-grounded defense package — grievances, MOL complaints, Article 4 deadline strategy, and step-by-step enforcement plans.

## What it does

A multi-agent Claude pipeline takes a steward's plain-language problem statement and returns:

- The legal issues (OHSA, ESA, OHRC, WSIA, CBA — with section citations)
- The relevant CBA articles and time limits (Article 4, 5, 9, etc.)
- A drafted grievance, MOL complaint, or correspondence
- An evidence checklist and arbitration risk assessment
- A QC pass that flags weak claims before they leave the app

It also tracks incidents and grievances, calculates Article 4 deadlines, and walks workers through an OHSA s.43 Right-to-Refuse procedure.

## Tech stack

- **Frontend** — Single-page PWA (HTML/CSS/JS), installable, offline-capable via service worker
- **Hosting** — GitHub Pages (`kevindm1989-afk.github.io/WorkerShield`)
- **API** — Cloudflare Worker (`worker.js`)
- **AI** — Anthropic Claude (Sonnet) via the Worker
- **Storage** — Private GitHub repository (`workershield-data`) used as a JSON document store via the GitHub Contents API

## Agents

The pipeline runs these agents in sequence:

1. **Intake** — orchestrator; identifies issues, urgency, required specialists
2. **OHSA** — Occupational Health and Safety Act analysis
3. **CBA** — Collective Agreement / Article 4 grievance analysis
4. **ESA** — Employment Standards Act analysis
5. **OHRC** — Human Rights Code analysis
6. **WSIB** — WSIA / WSIB Form 7, lost-time, return-to-work analysis
7. **Evidence** — documentation and disclosure checklist
8. **Email** — drafts correspondence to the employer
9. **MOL** — drafts Ministry of Labour complaints
10. **Arbitration** — arbitral risk and remedy analysis
11. **QC** — quality control pass over all outputs
12. **Final** — consolidated defense package

## Confidentiality

This application contains confidential union documentation protected by solicitor-client and union-representative privilege. **Authorized union personnel only.** Do not share access, exports, or screenshots outside the bargaining unit's representative chain. Misuse may compromise active grievances and worker rights.
