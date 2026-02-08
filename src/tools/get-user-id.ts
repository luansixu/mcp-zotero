import { ZoteroApiInterface } from "../types/zotero-types.js";

export const toolConfig = {
  name: "get_user_id",
  description:
    "Returns the Zotero user ID configured in the server environment. Useful for the inject-citations skill workflow, which needs the userId to generate correct Zotero field codes.",
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
