import { z } from "zod";

export const GetCollectionItemsSchema = z.object({
  collectionKey: z.string(),
});

export const GetItemDetailsSchema = z.object({
  itemKey: z.string(),
});

export const SearchLibrarySchema = z.object({
  query: z.string(),
});

export const GetRecentSchema = z.object({
  limit: z.number().optional().default(10),
});
