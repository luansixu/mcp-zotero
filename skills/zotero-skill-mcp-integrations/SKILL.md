---
name: zotero-mcp-integrations
description: Inject Zotero-compatible citation field codes into a .docx document. Use when the user wants to generate a Word document with live Zotero citations and bibliography, or when writing an academic paper with references.
---

# Zotero Citation Injection Skill

Inject Zotero field codes into a .docx document entirely within Claude's sandbox. No filesystem round-trips through MCP needed.

## When to use

- User asks to write an academic paper, literature review, or report with Zotero citations
- User wants a Word document with live, Zotero-manageable bibliography
- Any .docx generation that references papers in the user's Zotero library

> **Writing a scientific article?** This skill handles citation *injection* — the technical step that turns placeholders into Zotero field codes. It does NOT replace the research workflow. If you are writing an academic paper, follow the `scientific-writing` skill (`scientific-writing/SKILL.md`) **first**: it enforces full-text reading before citing, source triage, and evidence-based writing. Come back here only at Phase 5 (Deliver) to inject the citations.

## Fallback — if this skill is NOT available

If Claude does NOT have access to this skill, the injection cannot happen in the sandbox. In that case:

1. Generate the .docx with `<zcite>` tags as placeholders
2. Present the file to the user for download
3. Tell the user: **"I generated the document with citation placeholders. To complete the injection, save the file on your PC, tell me the full path, and I'll use the `inject_citations` MCP tool to finalize it."**
4. Once the user provides the path, call the MCP tool `inject_citations`
5. Remind the user to do **Zotero → Refresh** in Word

## Dependencies

```bash
npm install docx jszip --registry https://registry.npmjs.org
```

**Always use `--registry https://registry.npmjs.org`** — the sandbox may default to a blocked registry.

**Important:** `jszip` must be resolvable from the working directory where you run `inject.js`. If the skill directory is read-only (e.g. `/mnt/skills/...`), copy the script to your working directory first:

```bash
cp <skill_path>/scripts/inject.js ./inject.js
```

The script has a built-in fallback: if the ESM import fails, it tries `createRequire(process.cwd() + "/package.json")` to resolve `jszip` from the current working directory's `node_modules`.

## Workflow

### Step 1 — Ask citation style

> **CRITICAL:** Before doing anything else, ask the user which citation style they prefer: **APA** (author-year, default), **IEEE** (numbered [1]), or **Vancouver** (numbered [1]). If the user chooses **IEEE or Vancouver**, every `<zcite>` tag generated in Step 4 MUST include the `num` attribute with the correct sequential citation number. Omitting `num` produces `[?]` placeholders. This choice affects the entire workflow — do not skip this step.

### Step 2 — Search / add papers

> **Document access:** If you cannot access or retrieve a document from the internet (e.g., behind a paywall, blocked URL, PDF not available), inform the user and ask them to provide the document content directly in the chat. The user can paste text, upload a PDF, or provide the relevant excerpts. For paywalled journals, the abstract is acceptable for specific factual claims — see Step 2b for details. Available PDFs **must** still be uploaded to Zotero.

Use MCP tools to find or add papers:
- `search_library` — search existing Zotero library
- `add_items_by_doi` — add new papers by DOI, returns item keys
- `get_collections` / `get_collection_items` — browse collections

Note every `item_key` returned — these are needed for citations.

### Step 2b — Import PDFs and read sources

> **HARD GATE — VERIFY THEN UPLOAD: MANDATORY FOR EVERY AVAILABLE PDF**
>
> For every source cited in the document, you MUST verify and upload the PDF to Zotero
> if it is obtainable through ANY free channel (open access, PMC, Europe PMC, preprints,
> publisher OA). The two steps are inseparable — never upload without verifying first:
>
> 1. **VERIFY** — before calling `import_pdf_to_zotero`, read the PDF content via `web_fetch`
>    and confirm: (a) the title matches the expected article, (b) the authors match,
>    (c) the content is the actual paper, not a login page, CAPTCHA, or a different article.
>    Repositories (especially Europe PMC) can serve wrong PDFs for a given accession ID.
> 2. **UPLOAD** — only after verification passes, call `import_pdf_to_zotero`.
> 3. **VALIDATE** — after upload, call `get_item_fulltext` and spot-check the first few
>    hundred characters to confirm the indexed content matches the expected paper.
>
> This obligation is unconditional:
> - It applies even if you already read the content via `web_fetch`
> - It applies even if the source will only be used for a single claim
> - It applies even for "abstract-only" paywalled sources IF a preprint or OA version exists
> - Skipping verification or upload to save time is NOT acceptable
> - Uploading an unverified PDF pollutes the user's Zotero library — treat it as a bug
>
> Only after exhausting all free PDF channels (5 attempts) AND failing, fall back to
> `add_linked_url_attachment`. The user's Zotero library must contain every available PDF,
> and every uploaded PDF must have been verified.

After adding items, import PDFs and read each source **before** using it in the document.
A citation without reading is just decoration — it doesn't support any claim.

#### Per-source checklist

For **every** source, complete these steps in order before citing it in the document:

- [ ] **Verify PDF** — read the PDF content via `web_fetch` and confirm title, authors, and content match the expected article. NEVER skip this step.
- [ ] **Import PDF** — only after verification, upload to Zotero via `import_pdf_to_zotero`. If the PDF is freely available, this is **mandatory** even if you've already read the content through other means.
- [ ] **Validate post-upload** — call `get_item_fulltext` and spot-check the indexed content matches the expected paper.
- [ ] **Fallback** — if import fails after 5 attempts, attach URL via `add_linked_url_attachment`
- [ ] **Read full text** — use `get_item_fulltext` or `web_fetch` to read the actual content (not just the abstract)
- [ ] **Only then cite** — use the source in Step 4 only after you have read and understood it

> **Do NOT skip to Step 4.** A `<zcite>` tag for a source you haven't read produces a technically valid citation but a scientifically useless one.

#### Paywalled sources (Lancet, NEJM, Nature, JAMA, etc.)

For sources behind a paywall where you cannot access the full text:

- **The abstract IS a legitimate source** for specific factual claims: quantitative results, study design, sample size, and the main conclusion as stated by the authors.
- **Do NOT use abstract-only sources** for interpretive claims, methodological details, or subgroup analyses not mentioned in the abstract.
- **Mark the source as "abstract-only"** and limit its use accordingly.
- **If the user has institutional access**, ask them to provide the PDF or paste relevant sections. If they provide it, upload it to Zotero.
- **PDF archiving is NON-NEGOTIABLE** when the PDF is available through any free channel (open access, PMC, preprint, OA version of a paywalled article). You MUST call `import_pdf_to_zotero`. The softened policy applies ONLY to *citability*, NEVER to the duty to archive. See the hard gate above.

#### Read first, upload after

**NEVER upload a PDF to Zotero without verifying its content first.**
Repositories (especially Europe PMC) can occasionally serve the wrong PDF for a
given accession ID. Uploading unverified PDFs pollutes the user's Zotero library.

**Procedure for each source:**

1. **Find a PDF URL** — try these sources in order:
   - Publisher open access (JMIR, Frontiers, PLOS, BMC, MDPI are fully OA)
   - Europe PMC: `https://europepmc.org/backend/ptpmcrender.fcgi?accid=PMC{id}&blobtype=pdf`
   - PubMed Central: `https://pmc.ncbi.nlm.nih.gov/articles/PMC{id}/pdf/`
   - Preprint servers (BioRxiv, MedRxiv, arXiv)
   - Publisher direct PDF (varies by publisher)

2. **Read and verify content** — use `web_fetch` on the URL and confirm:
   - Title matches the expected article
   - Authors match
   - Content is the actual paper, not a login page or different article

3. **Import to Zotero** — once verified, call `import_pdf_to_zotero` with:
   - `url`: the verified PDF URL
   - `parent_item`: the Zotero item key from Step 2
   - `filename`: descriptive name (e.g., `Author_Year_ShortTitle.pdf`)

4. **Validate post-upload** — if the server supports auto-indexing, call
   `get_item_fulltext` and spot-check the first few hundred characters to
   confirm the indexed content matches the expected paper.

#### Handling import failures (max 5 attempts)

If `import_pdf_to_zotero` fails, retry with alternative URLs:

| Attempt | Source | Notes |
|---|---|---|
| 1 | Publisher direct PDF | Best quality, but often blocked by bot protection |
| 2 | Europe PMC | Good for PMC-indexed articles, but verify content |
| 3 | PubMed Central direct | Sometimes blocked by redirect |
| 4 | Preprint version | May differ from published version |
| 5 | Alternative publisher URL | Try different URL patterns for same publisher |

**After 5 failed attempts**, fall back to `add_linked_url_attachment`:
- Attach the PDF URL as a linked reference
- The user can download it manually later
- This preserves the reference without polluting the library with bad files

#### Known publisher URL patterns for direct PDF access

| Publisher | Pattern |
|---|---|
| Frontiers | `https://public-pages-files-2025.frontiersin.org/journals/{journal}/articles/{doi}/pdf` |
| JMIR | `https://{subdomain}.jmir.org/{year}/{issue}/{article_id}/PDF` |
| PLOS | `https://journals.plos.org/{journal}/article/file?id={doi}&type=printable` |
| BMC / Springer OA | `https://link.springer.com/content/pdf/{doi}.pdf` (may require OA) |
| MDPI | `https://www.mdpi.com/{path}/pdf` |
| Europe PMC | `https://europepmc.org/backend/ptpmcrender.fcgi?accid=PMC{id}&blobtype=pdf` |

### Step 3 — Collect metadata (batch)

Call `get_items_details` with ALL item keys in a single call:

```
get_items_details({ item_keys: ["KEY1", "KEY2", "KEY3", ...] })
```

Save the result as `metadata.json` in the sandbox. The response is a key → metadata map.

**No remapping required.** The inject script accepts the MCP response field names directly (e.g. lowercase `doi`, `url`, `publicationTitle`). You can pass the MCP response as-is.

The script also accepts the canonical inject.js field names (uppercase `DOI`, `URL`, `containerTitle`), so either format works:

| inject.js canonical | MCP response (also accepted) |
|---|---|
| `itemType` | `itemType` |
| `title` | `title` |
| `authors` | `authors` |
| `date` | `date` |
| `DOI` | `doi` |
| `containerTitle` | `publicationTitle` |
| `volume` | `volume` |
| `issue` | `issue` |
| `page` | `pages` |
| `publisher` | `publisher` |
| `URL` | `url` |

**Do NOT include `abstract`** — it bloats field codes.

#### Authors format

The `authors` field is a **comma-separated string** of `"FirstName LastName"` names, e.g.:

```
"John Smith, Jane Doe, Paulo Caetano da Silva"
```

This is the exact format returned by `get_items_details`. The inject script parses each comma-separated token by splitting on whitespace — the **last word** becomes the family name, everything before it becomes the given name. For example, `"Paulo Caetano da Silva"` → `{ family: "Silva", given: "Paulo Caetano da" }`.

#### Example metadata.json

```json
{
  "EUHUT5K3": {
    "title": "Attention Is All You Need",
    "authors": "Ashish Vaswani, Noam Shazeer, Niki Parmar",
    "date": "2017",
    "doi": "10.48550/arXiv.1706.03762",
    "itemType": "journalArticle",
    "publicationTitle": "Advances in Neural Information Processing Systems",
    "url": "https://arxiv.org/abs/1706.03762"
  },
  "F9UQM7N2": {
    "title": "BERT: Pre-training of Deep Bidirectional Transformers",
    "authors": "Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova",
    "date": "2019",
    "doi": "10.18653/v1/N19-1423",
    "itemType": "conferencePaper",
    "publicationTitle": "Proceedings of NAACL-HLT 2019",
    "url": null
  }
}
```

### Step 4 — Generate the .docx

Generate a .docx using the `docx` npm package. Insert citation placeholders as literal text:

```
<zcite keys="ITEMKEY"/>
```

**Critical rule:** Each `<zcite>` tag MUST be in its own dedicated `TextRun`. Never mix it with surrounding text.

```javascript
new Paragraph({
  children: [
    new TextRun("The transformer architecture "),
    new TextRun('<zcite keys="EUHUT5K3"/>'),   // dedicated TextRun
    new TextRun(" revolutionized NLP."),
  ]
})
```

Supported attributes:

| Attribute | Example | Notes |
|---|---|---|
| `keys` | `"ABC12345"` or `"ABC,DEF"` | Required. Comma-separated for multiple |
| `num` | `"1"` or `"1,2"` | **Required for IEEE/Vancouver.** Without it, citations render as `[?]` |
| `locator` | `"pp. 12-15"` | Page locator |
| `prefix` | `"see "` | Text before citation |
| `suffix` | `", emphasis added"` | Text after citation |

> **Warning:** When using IEEE or Vancouver style, you MUST include the `num` attribute on every `<zcite>` tag with the correct sequential citation number. Omitting `num` produces `[?]` placeholders.

Attribute order in the tag must be: `keys`, then any of `locator`, `prefix`, `suffix`, `num` (the regex expects this order).

### Step 5 — Run injection

First, get the Zotero user ID by calling the MCP tool `get_user_id`. This returns the numeric user ID needed for field code URIs.

Then execute the injection script bundled with this skill:

```bash
node <skill_path>/scripts/inject.js input.docx output.docx metadata.json <userId> [style]
```

Where:
- `<skill_path>` is the path to this skill's directory (use the location from the skill metadata)
- `userId` is the Zotero user ID from `get_user_id`
- `style` is one of: `apa` (default), `ieee`, `vancouver`, `harvard`, `chicago`

The script outputs JSON to stdout:
```json
{ "output": "output.docx", "found": 3, "injected": 3 }
```

### Step 6 — Present result

Copy the output .docx to `/mnt/user-data/outputs/` and present it. **Always** remind the user:

> Open the file in Microsoft Word with the Zotero plugin installed, then click **Zotero → Refresh** to finalize citations and generate the bibliography.
