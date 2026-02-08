---
name: scientific-writing
description: >
  Use this skill whenever the user asks to write a scientific article, literature review,
  research paper, case report, systematic review, or any academic/scholarly document.
  Triggers include: "write a paper", "write an article", "literature review", "review article",
  "case report", "research paper", "scientific article", "academic paper", or requests to
  produce documents citing scientific literature. This skill enforces a rigorous research
  workflow: sources must be retrieved and READ IN FULL before writing begins. Never write
  from abstracts alone. Also use when the user asks to summarize, synthesize, or compare
  multiple scientific papers into a written deliverable.
---

# Scientific Article Writing Skill

## Core Principle

**NEVER write a scientific article based only on abstracts or metadata.**

Every claim in the article must be traceable to content the author has actually read.
This means full-text retrieval is a mandatory step, not an optional enhancement.
If full text is unavailable for a source, that limitation must be disclosed and the
source must be used only for claims that can be supported by the abstract alone
(typically limited to the main conclusion).

However, abstracts with specific quantitative data (sample sizes, effect sizes, p-values,
confidence intervals) ARE a legitimate source for those specific factual claims.
Many high-impact journals (Lancet, NEJM, Nature, JAMA) are behind paywalls,
and excluding them entirely would impoverish the evidence base. The key distinction
is between *writing from abstracts* (unacceptable — shallow paraphrasing) and
*citing specific data reported in an abstract* (acceptable — factual and verifiable).

---

## Workflow Overview

The workflow has 5 mandatory phases executed in strict order.
No phase can be skipped. Each phase has explicit entry/exit criteria.

```
Phase 1: SCOPE → Phase 2: SEARCH → Phase 3: READ → Phase 4: WRITE → Phase 5: DELIVER
```

See `references/workflow-detail.md` for the complete phase specifications.

---

## Phase 1: SCOPE — Define the Article

**Goal**: Understand exactly what needs to be written before searching anything.

**Actions**:
1. Identify article type (review, research, case report, systematic review, meta-analysis, editorial, letter, etc.)
2. Determine target audience and field
3. Determine approximate length and section structure
4. Identify citation style (Vancouver, APA, IEEE, etc.)
5. Clarify key questions the article must answer
6. Agree on scope boundaries — what is IN and what is OUT

**Exit criteria**: Clear written specification of what will be produced.

**Anti-pattern**: Starting to search before knowing what you're looking for.
This leads to unfocused literature retrieval and wasted effort.

---

## Phase 2: SEARCH — Find Sources

**Goal**: Build a comprehensive, relevant bibliography.

**Actions**:
1. Construct search queries based on the scope (use PubMed, web search, or whatever tools are available)
2. Cast a wide initial net — search for more sources than you'll ultimately cite
3. Triage results: categorize by relevance (essential / supporting / background)
4. For each essential source, locate the full text (see Full-Text Retrieval Strategy below)
5. Record all sources with their identifiers (DOI, PMID, URL)

**Search strategy by article type**:

| Article Type | Minimum Sources | Search Depth |
|---|---|---|
| Narrative review | 15-30 | Broad, thematic |
| Systematic review | Exhaustive per protocol | Protocol-driven, reproducible |
| Research article | 10-25 | Focused on methods + context |
| Case report | 5-15 | Similar cases + guidelines |
| Short communication | 5-10 | Targeted, recent |

**Exit criteria**: A ranked list of sources with full-text access confirmed for all essential sources.

**Anti-pattern**: Stopping at 10 PubMed results without checking full-text availability.

---

## Phase 3: READ — Actually Read the Sources

**This is the most critical phase and the one most likely to be skipped.**

**Goal**: Develop genuine understanding of the source material before writing.

### Full-Text Retrieval Strategy

Try these sources in order for each article:

1. **Open access repositories**: PubMed Central (PMC), Europe PMC (`europepmc.org/backend/ptpmcrender.fcgi?accid=PMC{id}&blobtype=pdf`), BioRxiv, MedRxiv
2. **Publisher open access**: JMIR, PLOS, BMC, Frontiers, MDPI journals are fully open access
3. **web_fetch on DOI URL**: Often resolves to full HTML text on publisher sites
4. **Preprint versions**: Authors often deposit preprints on BioRxiv, MedRxiv, arXiv, SSRN
5. **Author repositories**: University institutional repositories, ResearchGate (limited)
6. **Paywalled journals** (Lancet, NEJM, Nature, JAMA, etc.): Full text is behind a paywall — this is expected, not a failure. Use the abstract for specific factual claims (quantitative results, study design, sample size). If the user has institutional access, ask them to provide the PDF or paste relevant sections.
7. **If all fail**: Use abstract + structured data only, but MARK the source as "abstract-only" and limit claims accordingly

### What "Reading" Means

For each essential source, extract and record:

- **Study design and methods** (not just "it was a phase 3 trial" — what were the arms, doses, endpoints, population?)
- **Key quantitative results** (exact numbers, confidence intervals, p-values, effect sizes)
- **Authors' own interpretation and caveats** (what limitations did they acknowledge?)
- **How it relates to other sources** (does it confirm, contradict, or extend prior work?)

### Reading Checklist

For each source read, you should be able to answer:

- [ ] What was the study question?
- [ ] How was it designed? (sample size, population, intervention, comparator, follow-up)
- [ ] What were the primary and secondary endpoints?
- [ ] What were the main numerical findings?
- [ ] What were the stated limitations?
- [ ] How does this fit into the broader evidence base?

If you cannot answer these questions, you have not read the source adequately.

**Exit criteria**: Notes or mental model for each essential source covering the checklist above.

**Anti-pattern**: Skimming abstracts and immediately starting to write. This produces
superficial articles that paraphrase abstract conclusions without understanding the
underlying evidence. Another anti-pattern is reading only the abstract and results,
missing crucial methodological details and limitations.

---

## Phase 4: WRITE — Compose the Article

**Goal**: Produce a well-structured scientific article grounded in the sources you've read.

### Structure by Article Type

See `references/article-structures.md` for detailed templates.

**General principles that apply to all types**:

1. **Introduction**: Establish context → Identify the gap/need → State the objective
2. **Body**: Organize by theme, chronology, or methodology — NOT by source.
   Never write "Smith et al. found X. Jones et al. found Y. Lee et al. found Z."
   Instead: "Multiple studies have demonstrated X [refs], although the effect varies
   by population [ref1, ref2]."
3. **Discussion/Synthesis**: Integrate findings, identify patterns, acknowledge conflicts
4. **Conclusions**: Answer the question posed in the introduction

### Writing Rules

- **Every factual claim needs a citation**. No exceptions.
- **Use specific data from the full text**, not vague summaries. Say "92.5% maintained
  viral suppression at 48 weeks" not "most patients responded well."
- **Acknowledge contradictions** in the literature. Don't cherry-pick.
- **Distinguish between what the data shows and what it suggests**. Use language
  appropriately: "demonstrated" vs "suggested" vs "may indicate."
- **State limitations explicitly**, both of individual studies and of the review itself.
- **Track citation numbers** carefully if using numbered styles (Vancouver, IEEE).
  Each unique source gets one number, assigned in order of first appearance.

### Citation Placement

- Citations go AFTER the claim, BEFORE the period: "...maintained suppression [4]."
- Multiple citations: [4,5] or [4-6] for ranges
- Don't cite sources you haven't engaged with. If you only have the abstract,
  you can cite it for specific factual claims directly stated in the abstract
  (e.g., quantitative results, study design, sample size). Do NOT use abstract-only
  sources for interpretive or methodological claims that require full-text context.

**Exit criteria**: Complete draft with all citations placed.

**Anti-pattern**: Writing the full text and then "sprinkling" citations afterward.
Citations should be integral to the writing process, not a post-hoc decoration.

---

## Phase 5: DELIVER — Produce the Final Document

**Goal**: Generate a polished, properly formatted deliverable.

**Actions**:
1. Generate the document in the requested format (.docx, .pdf, .md, etc.)
2. If Zotero integration is available, inject citation field codes
3. If bibliography management is available, attach PDFs to the reference library
4. Validate the document
5. Present to user with clear instructions for any post-processing (e.g., Zotero Refresh)

**Exit criteria**: Downloadable document with working citations.

---

## Tool-Agnostic Principles

This skill works regardless of which tools are available. The workflow is the same whether you have:

- PubMed MCP tools + Zotero MCP tools + web_search
- Only web_search + web_fetch
- Only web_search
- No search tools at all (user provides sources)

The key insight is: **the workflow is about the PROCESS, not the tools.**

| If you have... | Use it for... |
|---|---|
| `pubmed_search_articles` | Phase 2: Structured literature search |
| `pubmed_fetch_contents` | Phase 2: Get abstracts and metadata (NOT a substitute for full text) |
| `web_search` | Phase 2: Find sources; Phase 3: Locate full text |
| `web_fetch` | Phase 3: Read full-text HTML from publisher sites or PMC |
| `import_pdf_to_zotero` | Phase 3→5: Archive verified PDFs (see zotero-mcp-integrations skill for workflow) |
| `get_item_fulltext` | Phase 3: Read indexed full text + validate post-upload content |
| `add_linked_url_attachment` | Phase 5: Fallback when PDF import fails (see zotero-mcp-integrations skill) |
| `inject_citations` / skill | Phase 5: Create live Zotero citations in .docx |
| `add_items_by_doi` | Phase 5: Build bibliography in Zotero |
| None of the above | Ask the user to provide source material directly |

**Critical**: `pubmed_fetch_contents` returns abstracts. Abstracts are for TRIAGE (Phase 2),
not for WRITING (Phase 4). Always attempt full-text retrieval in Phase 3.

**Zotero integration**: If the `zotero-mcp-integrations` skill is available, follow its
Step 2b (PDF import workflow) during Phase 3 to build a verified reference library with
full-text PDFs alongside the article. That skill handles content verification, retry
logic (up to 5 attempts), and fallback to linked URL attachments. For citation injection,
follow its Steps 4-6 during Phase 5.

---

## Quality Checklist

Before delivering the final document, verify:

- [ ] Every essential source was read beyond the abstract
- [ ] Every factual claim has a citation
- [ ] Specific numbers (percentages, sample sizes, CIs) come from the full text, not paraphrased from abstracts
- [ ] Contradictions in the literature are acknowledged
- [ ] Limitations are stated
- [ ] The article answers the question defined in Phase 1
- [ ] Citations are numbered/formatted correctly for the chosen style
- [ ] Sources marked as "abstract-only" are used appropriately (general claims only)
- [ ] Every source with a freely available PDF has been verified and uploaded to Zotero (hard gate — no exceptions)
- [ ] No PDF was uploaded without prior content verification (title, authors, actual content)

---

## Common Failure Modes

| Failure | Cause | Prevention |
|---|---|---|
| Shallow content | Writing from abstracts only | Phase 3 enforcement — read full text |
| Missing context | Skipping Phase 1 scoping | Always define scope before searching |
| Uncritical synthesis | Not reading methods/limitations | Use reading checklist |
| Citation errors | Post-hoc citation insertion | Cite while writing, not after |
| Narrow perspective | Too few sources | Search broadly in Phase 2 |
| Parroting abstracts | No genuine understanding | Extract specific data, not conclusions |
| Inaccessible sources | Not trying multiple access routes | Follow full-text retrieval strategy |
| Wrong PDF in Zotero | Uploading without content verification | Hard gate: verify (title+authors+content) → upload → validate with get_item_fulltext |

---

## Paywalled Sources

Many high-impact journals (Lancet, NEJM, Nature, JAMA, Cell, Science) restrict
full-text access to subscribers. This is a normal part of scientific literature,
not a workflow failure.

**What you CAN do with abstract-only paywalled sources:**
- Cite specific quantitative results reported in the abstract (e.g., "HR 0.67, 95% CI 0.54-0.82")
- Reference the study design and sample size stated in the abstract
- Cite the main conclusion as stated by the authors

**What you CANNOT do:**
- Describe methodology details not in the abstract
- Discuss subgroup analyses, secondary endpoints, or limitations not mentioned in the abstract
- Use the source as a primary reference for interpretive or mechanistic claims

### Hard Gate — Verify Then Upload

> **NON-NEGOTIABLE:** If a PDF is obtainable through ANY free channel (open access, PMC,
> Europe PMC, preprints, publisher OA, OA version of a paywalled article), you MUST
> **verify its content first**, then upload it to Zotero via `import_pdf_to_zotero`.
>
> **Verify before upload:** Read the PDF via `web_fetch` and confirm (a) title matches,
> (b) authors match, (c) content is the actual paper — not a login page, CAPTCHA, or
> wrong article. Repositories can serve incorrect PDFs. Uploading unverified PDFs
> pollutes the user's Zotero library.
>
> **Validate after upload:** Call `get_item_fulltext` and spot-check that indexed content
> matches the expected paper.
>
> This applies unconditionally:
> - Even if you already read the content via `web_fetch`
> - Even if the source is used for a single claim
> - Even for sources you classify as "abstract-only" — if a preprint or OA version exists, upload it
> - If the user provides a PDF (institutional access), upload it
>
> The softened citability policy for paywalled sources does NOT relax the duty to archive.
> Every available PDF must end up in Zotero — verified.

---

## Dependencies

This skill has no hard dependencies. It works with whatever tools are available.
For optimal results, the following tools enhance the workflow:

- **PubMed MCP server**: Structured biomedical literature search
- **Zotero MCP server**: Reference management and citation injection
- **web_search / web_fetch**: General source discovery and full-text retrieval
- **docx skill**: Professional document generation
- **pdf skill**: PDF reading and generation
