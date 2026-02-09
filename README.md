# MCP Zotero

A Model Context Protocol server for Zotero integration. It gives any LLM full access to your Zotero library: search, organize, add papers by DOI, import PDFs, read full-text content, and inject live citations into Word documents.

> Originally based on [mcp-zotero](https://github.com/kaliaboi/mcp-zotero) by Abhishek Kalia.
> This project has since been extensively rewritten with a new architecture, 13 tools (up from 5), citation injection, PDF management, and Claude skill support.

## How it works

The server is designed to be **usable by any LLM without external documentation**. On connection, it sends workflow instructions via the MCP `instructions` field, and each tool description includes cross-references and usage guidance. An LLM that has never seen this server before can discover the full workflow — from adding papers to producing a cited Word document — directly from the tool listing.

For advanced use cases (PDF upload policy, citation style guidance, source transparency), a **Claude skill** is included for Claude.ai Projects. But the skill is optional: the MCP server is fully self-documenting.

## Local vs Remote LLMs

| Scenario | MCP server | Skill needed? |
|---|---|---|
| Local LLM (Claude Code, LM Studio, etc.) | All 13 tools | No |
| Remote/sandboxed LLM (Claude.ai Projects) | API tools (search, add, metadata) | Yes, for citation injection |

Local LLMs with filesystem access can use all tools directly, including `inject_citations` which reads and writes `.docx` files on disk.

Remote LLMs without filesystem access can use the included **Claude skill** (`skills/zotero-skill-mcp-integrations/`), which runs citation injection entirely inside the sandbox. MCP tools handle all Zotero API operations; the skill handles document assembly.

## Setup

1. Get your Zotero credentials:

   ```bash
   # Create an API key at https://www.zotero.org/settings/keys
   # (enable library read/write + file access)
   # Then retrieve your user ID:
   curl -H "Zotero-API-Key: YOUR_API_KEY" https://api.zotero.org/keys/current
   ```

2. Set environment variables:

   ```bash
   export ZOTERO_API_KEY="your-api-key"
   export ZOTERO_USER_ID="user-id-from-curl"
   export UNPAYWALL_EMAIL="your@email.edu"   # Optional: enables OA PDF lookup via Unpaywall
   ```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ZOTERO_API_KEY` | Yes | API key for Zotero Web API v3. Create one at [zotero.org/settings/keys](https://www.zotero.org/settings/keys) with library read/write and file access permissions. |
| `ZOTERO_USER_ID` | Yes | Your Zotero numeric user ID. Retrieve it with `curl -H "Zotero-API-Key: KEY" https://api.zotero.org/keys/current`. |
| `UNPAYWALL_EMAIL` | No | Email for Unpaywall API requests ([rate-limit policy](https://unpaywall.org/products/api)). Enables OA PDF lookup in `add_items_by_doi` and `find_and_attach_pdfs`. If not set, OA PDF features are silently skipped. |

## Integration with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "zotero": {
      "command": "npx",
      "args": ["tsx", "path/to/src/server.ts"],
      "env": {
        "ZOTERO_API_KEY": "YOUR_API_KEY",
        "ZOTERO_USER_ID": "YOUR_USER_ID",
        "UNPAYWALL_EMAIL": "YOUR_EMAIL"
      }
    }
  }
}
```

## Integration with Claude Code

```bash
claude mcp add-json "zotero" '{"command":"npx","args":["tsx","src/server.ts"],"env":{"ZOTERO_API_KEY":"...","ZOTERO_USER_ID":"..."}}'
```

## Available Tools

### Library browsing

| Tool | Description |
|---|---|
| `get_collections` | List all collections (folders) with keys, names, and parent relationships |
| `get_collection_items` | Get items in a specific collection with keys, titles, authors, dates |
| `search_library` | Search by query, or list items sorted by field (date, title, etc.) |
| `get_items_details` | Batch metadata retrieval for multiple items in a single call |
| `get_item_fulltext` | Get full-text content of a PDF attachment via Zotero's fulltext index |

### Adding content

| Tool | Description |
|---|---|
| `add_items_by_doi` | Add papers by DOI with automatic metadata resolution. Auto-attaches OA PDFs via Unpaywall |
| `add_web_item` | Save a web page as a Zotero item (for articles without DOI) |
| `create_collection` | Create a new collection, optionally nested under a parent |
| `import_pdf_to_zotero` | Download a PDF from URL, upload to Zotero storage, auto-index full text |
| `find_and_attach_pdfs` | Batch OA PDF lookup and auto-attach via Unpaywall (by item keys or collection) |
| `add_linked_url_attachment` | Attach a URL to an existing item or create a standalone link |

### Citation & documents

| Tool | Description |
|---|---|
| `inject_citations` | Inject live Zotero citations into a Word document. Supports APA, IEEE, Vancouver, Harvard, Chicago |
| `get_user_id` | Returns the configured Zotero user ID |

## Development

```bash
npm install
npm run build          # Compile TypeScript
npm test               # Run tests (vitest, 299 tests)
npx tsx src/server.ts  # Run directly without building
```

### Debug with MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx tsx src/server.ts
```

## License

MIT - see [LICENSE](LICENSE) for details.
