import type { ZoteroApiInterface } from "./zotero-types.js";

declare module "zotero-api-client/lib/main-node.cjs" {
  interface Creator {
    firstName?: string;
    lastName?: string;
    name?: string;
  }

  interface ZoteroItem {
    key: string;
    version: number;
    library?: {
      type: string;
      id: number;
      name: string;
    };
    links?: {
      self: {
        href: string;
        type: string;
      };
      alternate: {
        href: string;
        type: string;
      };
    };
    meta?: {
      numItems?: number;
      numCollections?: number;
    };
    data: {
      key?: string;
      version?: number;
      itemType?: string;
      title?: string;
      creators?: ZoteroCreator[];
      abstractNote?: string;
      date?: string;
      DOI?: string;
      url?: string;
      tags?: ZoteroTag[];
      collections?: string[];
      dateAdded?: string;
      dateModified?: string;
      publicationTitle?: string;
      volume?: string;
      issue?: string;
      pages?: string;
    };
  }

  interface ZoteroResponse {
    getData(): ZoteroItem | ZoteroItem[];
    getVersion(): number | null;
  }

  interface ZoteroWriteResponse {
    isSuccess(): boolean;
    getData(): ZoteroItem[];
    getErrors(): Record<string, string>;
    getEntityByIndex(index: number): ZoteroItem;
  }

  interface ZoteroClient {
    library(type: string, id: string): ZoteroClient;
    collections(key?: string): ZoteroClient;
    items(key?: string): ZoteroClient;
    version(version: number): ZoteroClient;
    get(params?: Record<string, unknown>): Promise<ZoteroResponse>;
    post(data: unknown[], opts?: Record<string, unknown>): Promise<ZoteroWriteResponse>;
    delete(keysToDelete?: string[]): Promise<{ getVersion(): number }>;
  }

  function api(apiKey: string): ZoteroClient;
  export default api;
}
