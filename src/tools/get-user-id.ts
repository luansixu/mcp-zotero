import { ZoteroApiInterface } from "../types/zotero-types.js";

export const toolConfig = {
  name: "get_user_id",
  description:
    "Returns the Zotero user ID configured in the server environment. Needed by the standalone inject-citations skill script (inject.js) to generate Zotero field code URIs. Not needed when using the inject_citations MCP tool, which reads the userId internally.",
  inputSchema: {},
} as const;

export async function handleGetUserId(
  _zoteroApi: ZoteroApiInterface,
  userId: string,
  _args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  return {
    content: [
      { type: "text", text: JSON.stringify({ user_id: userId }) },
    ],
  };
}
