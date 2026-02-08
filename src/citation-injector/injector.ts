import JSZip from "jszip";
import { readFile, writeFile } from "node:fs/promises";
import { ZoteroApiInterface, ZoteroItemData } from "../types/zotero-types.js";
import { CslItemData, ZoteroCitationItem } from "../types/csl-types.js";
import { generateZoteroFieldCode, generateBibliographyFieldCode } from "./field-codes.js";
import { formatCitationText } from "./citation-formatter.js";
import { regexEscape } from "./xml-utils.js";
import { zoteroItemToCsl } from "../utils/csl-to-zotero.js";

export interface InjectionResult {
  outputPath: string;
  found: number;
  injected: number;
  warnings: string[];
}

interface ZciteMatch {
  fullMatch: string;
  keys: string[];
  locator?: string;
  prefix?: string;
  suffix?: string;
  num?: string;
}

function parseZciteMatches(documentXml: string): ZciteMatch[] {
  // Attributes can appear in any order after keys
  const zciteRegex =
    /&lt;zcite\s+keys=&quot;([^&]*)&quot;(?:\s+locator=&quot;([^&]*)&quot;)?(?:\s+prefix=&quot;([^&]*)&quot;)?(?:\s+suffix=&quot;([^&]*)&quot;)?(?:\s+num=&quot;([^&]*)&quot;)?\s*\/&gt;/g;

  const matches: ZciteMatch[] = [];
  let match: RegExpExecArray | null;

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

async function fetchCslData(
  keys: Set<string>,
  zoteroApi: ZoteroApiInterface,
  userId: string
): Promise<Map<string, CslItemData>> {
  const cslData = new Map<string, CslItemData>();

  for (const key of keys) {
    const response = await zoteroApi
      .library("user", userId)
      .items(key)
      .get();
    const zoteroItem = response.getData() as ZoteroItemData;
    cslData.set(key, zoteroItemToCsl(zoteroItem));
  }

  return cslData;
}

function buildCitationItems(
  match: ZciteMatch,
  cslData: Map<string, CslItemData>,
  userId: string
): ZoteroCitationItem[] {
  return match.keys.map((key, idx) => {
    const itemData = cslData.get(key) ?? { type: "article-journal" };
    const item: ZoteroCitationItem = {
      id: idx,
      uris: [`http://zotero.org/users/${userId}/items/${key}`],
      uri: [`http://zotero.org/users/${userId}/items/${key}`],
      itemData,
    };
    if (match.locator) item.locator = match.locator;
    if (match.prefix) item.prefix = match.prefix;
    if (match.suffix) item.suffix = match.suffix;
    return item;
  });
}

function replaceZciteInXml(
  xml: string,
  escapedZciteTag: string,
  fieldCodeXml: string
): string {
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

export async function injectCitations(
  filePath: string,
  zoteroApi: ZoteroApiInterface,
  userId: string,
  style: string
): Promise<InjectionResult> {
  const fileBuffer = await readFile(filePath);
  const zip = await JSZip.loadAsync(fileBuffer);

  const documentEntry = zip.file("word/document.xml");
  if (!documentEntry) {
    throw new Error("Invalid .docx file: word/document.xml not found");
  }

  let documentXml = await documentEntry.async("string");

  const matches = parseZciteMatches(documentXml);

  if (matches.length === 0) {
    const outputPath = filePath.replace(".docx", "_cited.docx");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    await writeFile(outputPath, buffer);
    return { outputPath, found: 0, injected: 0, warnings: [] };
  }

  // Warn if using a numbered style but tags are missing the num attribute
  const warnings: string[] = [];
  if (style === "ieee" || style === "vancouver") {
    const withNum = matches.filter((m) => m.num !== undefined).length;
    if (withNum < matches.length) {
      warnings.push(
        `Style '${style}' requires 'num' attribute on <zcite> tags. Found ${withNum}/${matches.length} tags with num.`
      );
    }
  }

  // Collect all unique item keys
  const uniqueKeys = new Set(matches.flatMap((m) => m.keys));

  // Fetch CSL data from Zotero
  const cslData = await fetchCslData(uniqueKeys, zoteroApi, userId);

  // Replace each zcite tag with a field code
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

  // Append bibliography before </w:body>
  const biblXml = generateBibliographyFieldCode();
  documentXml = documentXml.replace("</w:body>", `${biblXml}</w:body>`);

  // Save
  zip.file("word/document.xml", documentXml);
  const outputPath = filePath.replace(".docx", "_cited.docx");
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await writeFile(outputPath, buffer);

  return { outputPath, found: matches.length, injected, warnings };
}
