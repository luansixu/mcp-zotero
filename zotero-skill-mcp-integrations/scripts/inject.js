#!/usr/bin/env node

// Standalone citation injection script for Claude skill usage.
// Reads a .docx with <zcite> tags and a metadata.json, injects Zotero field codes.
//
// Usage: node inject.js <input.docx> <output.docx> <metadata.json> <userId> [style]
//
// Dependencies: jszip (npm install jszip)

import JSZip from "jszip";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.length < 4) {
  console.error(
    "Usage: node inject.js <input.docx> <output.docx> <metadata.json> <userId> [style]"
  );
  process.exit(1);
}

const [inputPath, outputPath, metadataPath, userId, style = "apa"] = args;

// ---------------------------------------------------------------------------
// Zotero itemType → CSL type mapping
// ---------------------------------------------------------------------------

const ZOTERO_TO_CSL_TYPE = {
  journalArticle: "article-journal",
  book: "book",
  bookSection: "chapter",
  conferencePaper: "paper-conference",
  report: "report",
  thesis: "thesis",
  webpage: "webpage",
  document: "dataset",
};

// ---------------------------------------------------------------------------
// Metadata conversion: simplified JSON → CSL-JSON
// ---------------------------------------------------------------------------

/**
 * Parse an author string like "John Smith, Jane Doe" into CslName[].
 * Each name token is split on whitespace; the last word is `family`, the rest is `given`.
 * @param {string} authorString
 * @returns {Array<{family: string, given: string}>}
 */
function parseAuthors(authorString) {
  if (!authorString) return [];
  return authorString.split(",").map((name) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return { family: parts[0], given: "" };
    const family = parts[parts.length - 1];
    const given = parts.slice(0, -1).join(" ");
    return { family, given };
  });
}

/**
 * Parse a date string (e.g. "2017", "2017-03", "2017-03-15") into a CslDate.
 * @param {string} dateString
 * @returns {{[key: string]: unknown} | undefined}
 */
function parseDate(dateString) {
  if (!dateString) return undefined;
  const parts = dateString
    .split("-")
    .map(Number)
    .filter((n) => !isNaN(n));
  if (parts.length === 0) return undefined;
  return { "date-parts": [parts] };
}

/**
 * Convert a single metadata entry (simplified format) to CSL-JSON.
 * Excludes `abstract` to keep field codes small.
 * @param {Record<string, unknown>} meta
 * @returns {Record<string, unknown>}
 */
function metadataToCsl(meta) {
  const cslType = ZOTERO_TO_CSL_TYPE[meta.itemType] ?? "article-journal";
  const authors = parseAuthors(meta.authors);
  const issued = parseDate(meta.date);

  /** @type {Record<string, unknown>} */
  const csl = { type: cslType };

  if (meta.title) csl.title = meta.title;
  if (authors.length > 0) csl.author = authors;
  if (issued) csl.issued = issued;
  if (meta.DOI) csl.DOI = meta.DOI;
  if (meta.containerTitle) csl["container-title"] = meta.containerTitle;
  if (meta.volume) csl.volume = meta.volume;
  if (meta.issue) csl.issue = meta.issue;
  if (meta.page) csl.page = meta.page;
  if (meta.publisher) csl.publisher = meta.publisher;
  if (meta.publisherPlace) csl["publisher-place"] = meta.publisherPlace;
  if (meta.URL) csl.URL = meta.URL;

  return csl;
}

/**
 * Convert the full metadata object to a Map<itemKey, CslItemData>.
 * @param {Record<string, Record<string, unknown>>} metadata
 * @returns {Map<string, Record<string, unknown>>}
 */
function convertMetadataToCsl(metadata) {
  const map = new Map();
  for (const [key, meta] of Object.entries(metadata)) {
    map.set(key, metadataToCsl(meta));
  }
  return map;
}

// ---------------------------------------------------------------------------
// XML utilities (ported from xml-utils.ts)
// ---------------------------------------------------------------------------

/**
 * @param {string} text
 * @returns {string}
 */
function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * @param {string} text
 * @returns {string}
 */
function regexEscape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Citation text formatter (ported from citation-formatter.ts)
// ---------------------------------------------------------------------------

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {string} citationStyle
 * @param {string} [num]
 * @returns {string}
 */
function formatCitationText(items, citationStyle, num) {
  if (citationStyle === "ieee" || citationStyle === "vancouver") {
    return num ? `[${num}]` : "[?]";
  }

  const parts = items.map((item) => {
    const authors = item.author;
    const firstAuthor = authors?.[0]?.family ?? "Unknown";
    const year =
      item.issued?.["date-parts"]?.[0]?.[0]?.toString() ?? "n.d.";

    let authorText;
    if (!authors || authors.length === 0) {
      authorText = "Unknown";
    } else if (authors.length > 2) {
      authorText = `${firstAuthor} et al.`;
    } else if (authors.length === 2) {
      authorText = `${firstAuthor} & ${authors[1].family}`;
    } else {
      authorText = firstAuthor;
    }

    return `${authorText}, ${year}`;
  });

  return `(${parts.join("; ")})`;
}

// ---------------------------------------------------------------------------
// Field code generation (ported from field-codes.ts)
// ---------------------------------------------------------------------------

/**
 * @param {Array<Record<string, unknown>>} citationItems
 * @param {string} formattedText
 * @returns {string}
 */
function generateZoteroFieldCode(citationItems, formattedText) {
  const citationId = randomUUID().slice(0, 8);

  const cslCitation = {
    citationID: citationId,
    properties: { formattedCitation: formattedText },
    citationItems,
    schema:
      "https://github.com/citation-style-language/schema/raw/master/csl-citation.json",
  };

  const instrText = ` ADDIN ZOTERO_ITEM CSL_CITATION ${JSON.stringify(cslCitation)} `;
  const escapedInstrText = escapeXml(instrText);

  return [
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r>',
    `<w:r><w:instrText xml:space="preserve">${escapedInstrText}</w:instrText></w:r>`,
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>',
    `<w:r><w:rPr><w:noProof/></w:rPr><w:t>${escapeXml(formattedText)}</w:t></w:r>`,
    '<w:r><w:fldChar w:fldCharType="end"/></w:r>',
  ].join("");
}

/**
 * @returns {string}
 */
function generateBibliographyFieldCode() {
  return [
    "<w:p>",
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r>',
    '<w:r><w:instrText xml:space="preserve">',
    ' ADDIN ZOTERO_BIBL {&quot;uncited&quot;:[],&quot;omitted&quot;:[],&quot;custom&quot;:[]} CSL_BIBLIOGRAPHY ',
    "</w:instrText></w:r>",
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>',
    "<w:r><w:rPr><w:noProof/></w:rPr><w:t>[Bibliography will be generated by Zotero]</w:t></w:r>",
    '<w:r><w:fldChar w:fldCharType="end"/></w:r>',
    "</w:p>",
  ].join("");
}

// ---------------------------------------------------------------------------
// Zcite parsing (ported from injector.ts)
// ---------------------------------------------------------------------------

/**
 * @param {string} documentXml
 * @returns {Array<{fullMatch: string, keys: string[], locator?: string, prefix?: string, suffix?: string, num?: string}>}
 */
function parseZciteMatches(documentXml) {
  const zciteRegex =
    /&lt;zcite\s+keys=&quot;([^&]*)&quot;(?:\s+locator=&quot;([^&]*)&quot;)?(?:\s+prefix=&quot;([^&]*)&quot;)?(?:\s+suffix=&quot;([^&]*)&quot;)?(?:\s+num=&quot;([^&]*)&quot;)?\s*\/&gt;/g;

  const matches = [];
  let match;

  while ((match = zciteRegex.exec(documentXml)) !== null) {
    matches.push({
      fullMatch: match[0],
      keys: match[1].split(","),
      locator: match[2] || undefined,
      prefix: match[3] || undefined,
      suffix: match[4] || undefined,
      num: match[5] || undefined,
    });
  }

  return matches;
}

/**
 * @param {{fullMatch: string, keys: string[], locator?: string, prefix?: string, suffix?: string, num?: string}} match
 * @param {Map<string, Record<string, unknown>>} cslData
 * @param {string} uid
 * @returns {Array<Record<string, unknown>>}
 */
function buildCitationItems(match, cslData, uid) {
  return match.keys.map((key, idx) => {
    const itemData = cslData.get(key) ?? { type: "article-journal" };
    const item = {
      id: idx,
      uris: [`http://zotero.org/users/${uid}/items/${key}`],
      uri: [`http://zotero.org/users/${uid}/items/${key}`],
      itemData,
    };
    if (match.locator) item.locator = match.locator;
    if (match.prefix) item.prefix = match.prefix;
    if (match.suffix) item.suffix = match.suffix;
    return item;
  });
}

/**
 * @param {string} xml
 * @param {string} escapedZciteTag
 * @param {string} fieldCodeXml
 * @returns {string}
 */
function replaceZciteInXml(xml, escapedZciteTag, fieldCodeXml) {
  // Case A (preferred): tag is the sole content of a <w:r>
  const soloRunRegex = new RegExp(
    `<w:r>(?:<w:rPr>.*?</w:rPr>)?<w:t[^>]*>${regexEscape(escapedZciteTag)}</w:t></w:r>`
  );

  if (soloRunRegex.test(xml)) {
    return xml.replace(soloRunRegex, fieldCodeXml);
  }

  // Case B (fallback): tag is inline with other text
  const inlineRegex = new RegExp(
    `(<w:r>(?:<w:rPr>(.*?)</w:rPr>)?<w:t[^>]*>)(.*?)${regexEscape(escapedZciteTag)}(.*?)(</w:t></w:r>)`
  );

  const inlineMatch = xml.match(inlineRegex);
  if (inlineMatch) {
    const rPr = inlineMatch[2]
      ? `<w:rPr>${inlineMatch[2]}</w:rPr>`
      : "";
    const textBefore = inlineMatch[3];
    const textAfter = inlineMatch[4];

    let replacement = "";
    if (textBefore) {
      replacement += `<w:r>${rPr}<w:t xml:space="preserve">${textBefore}</w:t></w:r>`;
    }
    replacement += fieldCodeXml;
    if (textAfter) {
      replacement += `<w:r>${rPr}<w:t xml:space="preserve">${textAfter}</w:t></w:r>`;
    }

    return xml.replace(inlineRegex, replacement);
  }

  return xml;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main() {
  // 1. Read input .docx
  const fileBuffer = await readFile(inputPath);
  const zip = await JSZip.loadAsync(fileBuffer);

  const documentEntry = zip.file("word/document.xml");
  if (!documentEntry) {
    throw new Error("Invalid .docx file: word/document.xml not found");
  }

  let documentXml = await documentEntry.async("string");

  // 2. Read metadata.json
  const metadataRaw = await readFile(metadataPath, "utf-8");
  const metadata = JSON.parse(metadataRaw);

  // 3. Convert metadata to CSL-JSON map
  const cslData = convertMetadataToCsl(metadata);

  // 4. Parse <zcite> tags
  const matches = parseZciteMatches(documentXml);

  if (matches.length === 0) {
    // No citations found — write unmodified
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    await writeFile(outputPath, buffer);
    console.log(
      JSON.stringify({ output: outputPath, found: 0, injected: 0 })
    );
    return;
  }

  // 5. Replace each zcite tag with a field code
  let injected = 0;
  for (const match of matches) {
    const citationItems = buildCitationItems(match, cslData, userId);
    const itemDataList = match.keys.map(
      (k) => cslData.get(k) ?? { type: "article-journal" }
    );
    const formattedText = formatCitationText(itemDataList, style, match.num);
    const fieldCodeXml = generateZoteroFieldCode(citationItems, formattedText);

    const newXml = replaceZciteInXml(documentXml, match.fullMatch, fieldCodeXml);
    if (newXml !== documentXml) {
      documentXml = newXml;
      injected++;
    }
  }

  // 6. Append bibliography before </w:body>
  const biblXml = generateBibliographyFieldCode();
  documentXml = documentXml.replace("</w:body>", `${biblXml}</w:body>`);

  // 7. Write output .docx
  zip.file("word/document.xml", documentXml);
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await writeFile(outputPath, buffer);

  console.log(
    JSON.stringify({
      output: outputPath,
      found: matches.length,
      injected,
    })
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
