import { z } from "zod";
import { ZoteroApiInterface, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { injectCitations } from "../citation-injector/injector.js";
import { logger } from "../utils/logger.js";

export const toolConfig = {
  name: "inject_citations",
  description: `Replace <zcite> placeholder tags in a .docx file with native Zotero field codes that Zotero for Word can recognize and manage.

EXPECTED INPUT FORMAT:
The .docx file must contain citation placeholders as literal text in the format:
  <zcite keys="ITEMKEY"/>
where ITEMKEY is a valid Zotero item key (obtained from add_items_by_doi or search_library).

IMPORTANT: Each <zcite> tag MUST be placed in its own dedicated TextRun when generating the .docx with docx-js. Do NOT mix the tag with other text in the same TextRun.

Supported tag variations:
  - Single citation: <zcite keys="ABC12345"/>
  - Multiple items: <zcite keys="ABC12345,DEF67890"/>
  - With page locator: <zcite keys="ABC12345" locator="pp. 12-15"/>
  - With prefix: <zcite keys="ABC12345" prefix="see "/>
  - With suffix: <zcite keys="ABC12345" suffix=", emphasis added"/>

OUTPUT:
A new .docx file (original filename with _cited suffix) where each <zcite> tag is replaced with a Zotero field code, and a ZOTERO_BIBL bibliography field code is appended at the end. Opening the file in Word with the Zotero plugin installed will show live, manageable citations.`,
  inputSchema: {
    file_path: z
      .string()
      .describe(
        'Absolute path to the .docx file containing <zcite keys="..."/> placeholder tags'
      ),
    style: z
      .enum(["apa", "ieee", "vancouver", "harvard", "chicago"])
      .optional()
      .default("apa")
      .describe(
        "Citation style for the visible placeholder text. Zotero will reformat on refresh. Default: apa"
      ),
  },
} as const;

const InjectCitationsSchema = z.object(toolConfig.inputSchema);

export async function handleInjectCitations(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { file_path, style } = InjectCitationsSchema.parse(args);

  if (!file_path.endsWith(".docx")) {
    return formatErrorResponse("File must be a .docx file", {
      file_path,
    });
  }

  try {
    const result = await injectCitations(file_path, zoteroApi, userId, style);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              output_path: result.outputPath,
              citations_found: result.found,
              citations_injected: result.injected,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (err) {
    if (isZoteroApiError(err)) {
      logger.error("Tool execution failed", {
        tool: "inject_citations",
        status: err.response?.status,
        errorMessage: err.message,
        url: err.response?.url,
      });
    }
    throw err;
  }
}
