# MCP Zotero

> **Note:** This is an unofficial community project and is not affiliated with, endorsed by, or supported by the Zotero team or the Corporation for Digital Scholarship. "Zotero" is a registered trademark of the Corporation for Digital Scholarship.

## 版本更新 (Bug Fixes)

### v1.0.7 (当前版本)
- **修复**: `add_items_by_doi` 返回 `item_key: "unknown"` 但文献未实际添加到 Zotero 的问题
- **修复**: ISSN/ISBN 字段类型错误导致 API 写入失败 (400 error)

---

## 中文使用教程

本节将详细介绍如何在 Claude Desktop 中配置和使用 Zotero MCP。

### 准备工作

在使用 MCP 之前，您需要准备：

1. **Zotero 账户**
2. **Zotero API 密钥**
3. **Zotero 用户 ID**

### 步骤 1：获取 Zotero API 密钥

1. 登录 Zotero 账户：https://www.zotero.org/
2. 点击右上角的用户头像 → **设置 (Settings)**
3. 在左侧菜单中选择 **设置 (Settings)** → **API 密钥 (API Keys)**
4. 点击 **创建新密钥 (Create new key)**
5. 填写密钥描述（任意名称），勾选以下权限：
   - **库读取 (Library read)**
   - **库写入 (Library write)**
   - **文件读取/写入/创建 (File read/write/create)**
6. 点击 **保存密钥 (Save Key)**
7. **重要**：请立即复制保存生成的 API 密钥，它只会显示一次！

### 步骤 2：获取 Zotero 用户 ID

方法一（推荐）：
1. 登录 Zotero 后，点击右上角头像 → **设置**
2. 在个人资料页面即可看到您的 **用户 ID**（一串数字）

方法二（使用命令行）：
```bash
curl -H "Zotero-API-Key: YOUR_API_KEY" https://api.zotero.org/keys/current
```
返回的 JSON 中 `userID` 字段就是您的用户 ID。

### 步骤 3：在 Claude Desktop 中配置

1. 找到 Claude Desktop 配置文件：
   - **Windows**: `%APPDATA%\Claude\claude.json`
   - **macOS**: `~/Library/Application Support/Claude/claude.json`

2. 添加以下配置（替换为您自己的值）：

```json
{
  "mcpServers": {
    "zotero": {
      "command": "npx",
      "args": ["-y", "@luansixu/mcp-zotero"],
      "env": {
        "ZOTERO_API_KEY": "YOUR_API_KEY",
        "ZOTERO_USER_ID": "YOUR_USER_ID",
        "UNPAYWALL_EMAIL": "your@email.com"
      }
    }
  }
}
```

3. **重启 Claude Desktop** 使配置生效

### 常见问题

**Q: MCP 连接成功但无法添加文献？**
A: 请检查 API 密钥权限，确保勾选了"库写入"权限。

**Q: `add_items_by_doi` 返回 unknown 怎么办？**
A: 这是 v1.0.6 及之前版本的已知 bug，请使用 v1.0.7 或更新版本。

**Q: 如何查看 MCP 服务器日志？**
A: 打开 Claude Desktop 开发者工具菜单查看调试信息。

---

A Model Context Protocol server for Zotero integration. It gives any LLM full access to your Zotero library: search, organize, add papers by DOI, import PDFs, read full-text content, and inject live citations into Word documents.

> Originally based on [mcp-zotero](https://github.com/kaliaboi/mcp-zotero) by Abhishek Kalia.
> This project has since been extensively rewritten with a new architecture, 15 tools (up from 5), citation injection, PDF management, and Claude skill support.

## How it works

The server is designed to be **usable by any LLM without external documentation**. On connection, it sends workflow instructions via the MCP `instructions` field, and each tool description includes cross-references and usage guidance. An LLM that has never seen this server before can discover the full workflow — from adding papers to producing a cited Word document — directly from the tool listing.

For advanced use cases (PDF upload policy, citation style guidance, source transparency), a **Claude skill** is included for Claude.ai Projects. But the skill is optional: the MCP server is fully self-documenting.

## Local vs Remote LLMs

| Scenario | MCP server | Skill needed? |
|---|---|---|
| LLM with filesystem access (Claude Code, LM Studio, etc.) | All 15 tools | No |
| LLM without filesystem access (Claude.ai Projects, Claude Desktop) | API tools (search, add, metadata) | Yes, for citation injection |

LLMs with filesystem access can use all tools directly, including `inject_citations` which reads and writes `.docx` files on disk.

LLMs without filesystem access — including Claude Desktop, which connects to MCP but cannot generate files locally — can use the included **Claude skill** (`skills/zotero-skill-mcp-integrations/`), which runs citation injection entirely inside a sandbox. MCP tools handle all Zotero API operations; the skill handles document assembly.

### Claude Skill Setup (for Claude.ai Projects and Claude Desktop)

1. Download the skill `.zip` from the latest [GitHub Release](https://github.com/luansixu/mcp-zotero/releases)
2. Extract it and upload the folder to your Claude.ai Project as a skill
3. The skill enables citation injection directly inside the sandbox, without requiring local filesystem access

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
   export UNSAFE_OPERATIONS="none"           # Optional: "none" | "items" | "all" (see below)
   ```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ZOTERO_API_KEY` | Yes | API key for Zotero Web API v3. Create one at [zotero.org/settings/keys](https://www.zotero.org/settings/keys) with library read/write and file access permissions. |
| `ZOTERO_USER_ID` | Yes | Your Zotero numeric user ID. Retrieve it with `curl -H "Zotero-API-Key: KEY" https://api.zotero.org/keys/current`. |
| `UNPAYWALL_EMAIL` | No | Email for Unpaywall API requests ([rate-limit policy](https://unpaywall.org/products/api)). Enables OA PDF lookup in `add_items_by_doi` and `find_and_attach_pdfs`. If not set, OA PDF features are silently skipped. |
| `UNSAFE_OPERATIONS` | No | Controls destructive operations (deletion). See [Unsafe Operations](#unsafe-operations) below. Default: `none` (all deletions blocked). |

### Unsafe Operations

By default, the MCP server **does not allow any deletion**. This is a safety measure to prevent an LLM from accidentally deleting items or collections from your library.

To enable deletion, set the `UNSAFE_OPERATIONS` environment variable to one of the following values:

| Value | `delete_items` | `delete_collection` | Use case |
|---|---|---|---|
| `none` (default) | Blocked | Blocked | Safe mode — no deletions possible |
| `items` | **Allowed** | Blocked | Allow deleting items but protect collection structure |
| `all` | **Allowed** | **Allowed** | Full access — items and collections can be deleted |

**Important notes:**

- If `UNSAFE_OPERATIONS` is not set, empty, or set to an unrecognized value, it defaults to `none`.
- The value is **case-insensitive** (e.g. `ALL`, `Items`, `NONE` all work).
- `delete_items` moves items to the Zotero trash (recoverable from the Zotero desktop client).
- `delete_collection` removes the collection (folder) only — items inside it are **not** deleted and remain in your library.
- The `all` value includes both item and collection deletion because managing collections inherently requires item-level access.

**Configuration example:**

```json
{
  "mcpServers": {
    "zotero": {
      "command": "npx",
      "args": ["-y", "@luansixu/mcp-zotero"],
      "env": {
        "ZOTERO_API_KEY": "YOUR_API_KEY",
        "ZOTERO_USER_ID": "YOUR_USER_ID",
        "UNSAFE_OPERATIONS": "items"
      }
    }
  }
}
```

## Integration with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "zotero": {
      "command": "npx",
      "args": ["-y", "@luansixu/mcp-zotero"],
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
| `add_items` | Add items with direct metadata — supports all 37 Zotero item types (books, theses, reports, etc.), batch-capable |
| `create_collection` | Create a new collection, optionally nested under a parent |
| `import_pdf_to_zotero` | Download a PDF from URL, upload to Zotero storage, auto-index full text |
| `find_and_attach_pdfs` | Batch OA PDF lookup and auto-attach via Unpaywall (by item keys or collection) |
| `add_linked_url_attachment` | Attach a URL to an existing item or create a standalone link |

### Deleting content

| Tool | Description |
|---|---|
| `delete_items` | Delete up to 50 items per call (moves to Zotero trash). Requires `UNSAFE_OPERATIONS=items` or `all` |
| `delete_collection` | Delete a collection (folder). Items inside are kept. Requires `UNSAFE_OPERATIONS=all` |

### Citation & documents

| Tool | Description |
|---|---|
| `inject_citations` | Inject live Zotero citations into a Word document. Supports APA, IEEE, Vancouver, Harvard, Chicago. Output is saved in the same folder as the input file with a `_cited` suffix (e.g. `paper.docx` → `paper_cited.docx`) |
| `get_user_id` | Returns the configured Zotero user ID |

## Development

```bash
npm install
npm run build          # Compile TypeScript
npm test               # Run tests (vitest, 377 tests)
npx tsx src/server.ts  # Run directly without building
```

### Debug with MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx tsx src/server.ts
```

## License

MIT - see [LICENSE](LICENSE) for details.
