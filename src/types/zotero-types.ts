export interface ZoteroCreator {
  firstName?: string;
  lastName?: string;
  name?: string;
  creatorType?: string;
}

export interface ZoteroTag {
  tag: string;
  type?: number;
}

export interface ZoteroNote {
  key: string;
  version: number;
  note: string;
}

export interface ZoteroItemData {
  key?: string;
  version?: number;
  itemType?: string;
  title?: string;
  creators?: ZoteroCreator[];
  abstractNote?: string;
  date?: string;
  dateAdded?: string;
  dateModified?: string;
  DOI?: string;
  url?: string;
  tags?: ZoteroTag[];
  collections?: string[];
  notes?: ZoteroNote[];
  publicationTitle?: string;
  parentCollection?: string;
  numItems?: number;
  name?: string;
}

export interface ZoteroItem {
  key: string;
  version: number;
  library: {
    type: string;
    id: number;
    name: string;
  };
  links: {
    self: {
      href: string;
      type: string;
    };
    alternate: {
      href: string;
      type: string;
    };
  };
  meta: {
    numItems?: number;
    numCollections?: number;
  };
  data: ZoteroItemData;
}

export interface ZoteroRequestConfig {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

export interface ZoteroResponse {
  getData(): ZoteroItemData | ZoteroItemData[];
}

export interface ZoteroWriteResponse {
  isSuccess(): boolean;
  getData(): ZoteroItemData[];
  getErrors(): Record<string, string>;
  getEntityByIndex(index: number): ZoteroItemData;
}

export interface ZoteroApiInterface {
  library(type: string, id: number | string): ZoteroApiInterface;
  collections(key?: string): ZoteroApiInterface;
  items(key?: string): ZoteroApiInterface;
  top(): ZoteroApiInterface;
  trash(): ZoteroApiInterface;
  get(config?: Record<string, unknown>): Promise<ZoteroResponse>;
  post(data: unknown[], opts?: Record<string, unknown>): Promise<ZoteroWriteResponse>;
}

export interface ZoteroApi {
  (key?: string): ZoteroApiInterface;
}

export interface ZoteroApiError extends Error {
  response?: { status: number; url?: string };
}

export function isZoteroApiError(err: unknown): err is ZoteroApiError {
  return err instanceof Error;
}
