import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ZoteroApiInterface } from "../types/zotero-types.js";
import { handleGetCollections, toolConfig as collectionsConfig } from "./get-collections.js";
import { handleGetCollectionItems, toolConfig as collectionItemsConfig } from "./get-collection-items.js";
import { handleGetItemsDetails, toolConfig as itemsDetailsConfig } from "./get-items-details.js";
import { handleSearchLibrary, toolConfig as searchConfig } from "./search-library.js";
import { handleCreateCollection, toolConfig as createCollectionConfig } from "./create-collection.js";
import { handleAddItemsByDoi, toolConfig as addItemsByDoiConfig } from "./add-items-by-doi.js";
import { handleInjectCitations, toolConfig as injectCitationsConfig } from "./inject-citations.js";
import { handleGetItemFulltext, toolConfig as getItemFulltextConfig } from "./get-item-fulltext.js";
import { handleGetUserId, toolConfig as getUserIdConfig } from "./get-user-id.js";
import { handleAddLinkedUrlAttachment, toolConfig as addLinkedUrlAttachmentConfig } from "./add-linked-url-attachment.js";
import { handleAddItems, toolConfig as addItemsConfig } from "./add-items.js";
import { handleImportPdfToZotero, toolConfig as importPdfToZoteroConfig } from "./import-pdf-to-zotero.js";
import { handleFindAndAttachPdfs, toolConfig as findAndAttachPdfsConfig } from "./find-and-attach-pdfs.js";

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type ToolHandler = (
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
) => Promise<CallToolResult>;

const handlers: Record<string, ToolHandler> = {
  get_collections: handleGetCollections,
  get_collection_items: handleGetCollectionItems,
  get_items_details: handleGetItemsDetails,
  search_library: handleSearchLibrary,
  create_collection: handleCreateCollection,
  add_items_by_doi: handleAddItemsByDoi,
  inject_citations: handleInjectCitations,
  get_item_fulltext: handleGetItemFulltext,
  get_user_id: handleGetUserId,
  add_linked_url_attachment: handleAddLinkedUrlAttachment,
  add_items: handleAddItems,
  import_pdf_to_zotero: handleImportPdfToZotero,
  find_and_attach_pdfs: handleFindAndAttachPdfs,
};

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  zoteroApi: ZoteroApiInterface,
  userId: string
): Promise<CallToolResult> {
  const handler = handlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return handler(zoteroApi, userId, args);
}

const toolConfigs = [
  { config: collectionsConfig, handler: handleGetCollections },
  { config: collectionItemsConfig, handler: handleGetCollectionItems },
  { config: itemsDetailsConfig, handler: handleGetItemsDetails },
  { config: searchConfig, handler: handleSearchLibrary },
  { config: createCollectionConfig, handler: handleCreateCollection },
  { config: addItemsByDoiConfig, handler: handleAddItemsByDoi },
  { config: injectCitationsConfig, handler: handleInjectCitations },
  { config: getItemFulltextConfig, handler: handleGetItemFulltext },
  { config: getUserIdConfig, handler: handleGetUserId },
  { config: addLinkedUrlAttachmentConfig, handler: handleAddLinkedUrlAttachment },
  { config: addItemsConfig, handler: handleAddItems },
  { config: importPdfToZoteroConfig, handler: handleImportPdfToZotero },
  { config: findAndAttachPdfsConfig, handler: handleFindAndAttachPdfs },
];

export function registerAllTools(
  server: McpServer,
  zoteroApi: ZoteroApiInterface,
  userId: string
): void {
  for (const { config, handler } of toolConfigs) {
    server.registerTool(config.name, {
      description: config.description,
      inputSchema: config.inputSchema,
    }, async (args: Record<string, unknown>) => {
      return handler(zoteroApi, userId, args);
    });
  }
}
