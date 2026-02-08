import { z } from "zod";
import { ZoteroApiInterface, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { logger } from "../utils/logger.js";

export const toolConfig = {
  name: "add_web_item",
  description:
    "Save a web page as a Zotero item of type 'webpage'. Use this for online articles, blog posts, or any web resource that does not have a DOI. Returns the new item key and metadata.",
  inputSchema: {
    url: z.string().url().describe("URL of the web page"),
    title: z.string().describe("Title of the web page or article"),
    website_title: z
      .string()
      .optional()
      .describe(
        'Name of the website or online publication (e.g. "Nature News", "Ars Technica")'
      ),
    date: z
      .string()
      .optional()
      .describe("Publication date (e.g. \"2024-03-15\")"),
    creators: z
      .array(
        z.object({
          firstName: z.string(),
          lastName: z.string(),
        })
      )
      .optional()
      .describe("Authors of the web page"),
    collection_key: z
      .string()
      .optional()
      .describe(
        "Zotero collection key to add the item to. Get this from create_collection or get_collections."
      ),
    tags: z
      .array(z.string())
      .optional()
      .describe("Tags to apply to the item"),
  },
} as const;

const AddWebItemSchema = z.object(toolConfig.inputSchema);

export async function handleAddWebItem(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { url, title, website_title, date, creators, collection_key, tags } =
    AddWebItemSchema.parse(args);

  const itemData: Record<string, unknown> = {
    itemType: "webpage",
    title,
    url,
    accessDate: new Date().toISOString().split("T")[0],
    creators:
      creators?.map((c) => ({
        ...c,
        creatorType: "author",
      })) ?? [],
    collections: collection_key ? [collection_key] : [],
    tags: tags?.map((t) => ({ tag: t })) ?? [],
  };

  if (website_title) {
    itemData.websiteTitle = website_title;
  }

  if (date) {
    itemData.date = date;
  }

  try {
    const response = await zoteroApi
      .library("user", userId)
      .items()
      .post([itemData]);

    if (!response.isSuccess()) {
      const errors = response.getErrors();
      const errorMsg = Object.values(errors).join("; ") || "Unknown error";
      return formatErrorResponse("Failed to create web page item", {
        details: errorMsg,
      });
    }

    const created = response.getData();
    const item = created[0];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              item_key: item.key,
              title: item.title ?? title,
              url,
              website_title: website_title ?? null,
              item_type: "webpage",
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
        tool: "add_web_item",
        status: err.response?.status,
        errorMessage: err.message,
        url: err.response?.url,
      });
    }
    throw err;
  }
}
