/**
 * Static registry of all 37 regular Zotero item types with their valid fields
 * and creator types. Generated from the Zotero API (/itemTypes, /itemTypeFields,
 * /itemTypeCreatorTypes).
 *
 * Used for data-driven validation in the add_items tool — a single superRefine
 * handles all types via O(1) Set lookups instead of per-type switch-cases.
 */

export const ZOTERO_ITEM_TYPES = [
  "artwork", "audioRecording", "bill", "blogPost", "book", "bookSection",
  "case", "computerProgram", "conferencePaper", "dataset", "dictionaryEntry",
  "document", "email", "encyclopediaArticle", "film", "forumPost", "hearing",
  "instantMessage", "interview", "journalArticle", "letter", "magazineArticle",
  "manuscript", "map", "newspaperArticle", "patent", "podcast", "preprint",
  "presentation", "radioBroadcast", "report", "standard", "statute",
  "thesis", "tvBroadcast", "videoRecording", "webpage",
] as const;

export type ZoteroItemType = typeof ZOTERO_ITEM_TYPES[number];

/**
 * Item types where the "title" field has a different API name.
 * The add_items tool always accepts `title` as a universal required field,
 * then maps it to the correct API field name for these types.
 */
export const TITLE_FIELD_NAME: Partial<Record<ZoteroItemType, string>> = {
  case: "caseName",
  email: "subject",
  statute: "nameOfAct",
};

/** Per-type valid fields — ReadonlySet for O(1) lookup. */
export const ITEM_TYPE_FIELDS: Record<ZoteroItemType, ReadonlySet<string>> = {
  artwork: new Set([
    "title", "abstractNote", "artworkMedium", "artworkSize", "date", "eventPlace",
    "DOI", "citationKey", "url", "accessDate", "archive", "archiveLocation",
    "shortTitle", "language", "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  audioRecording: new Set([
    "title", "abstractNote", "audioRecordingFormat", "seriesTitle", "volume",
    "numberOfVolumes", "label", "place", "date", "runningTime", "ISBN", "DOI",
    "citationKey", "url", "accessDate", "archive", "archiveLocation", "shortTitle",
    "language", "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  bill: new Set([
    "title", "abstractNote", "billNumber", "code", "codeVolume", "section",
    "codePages", "legislativeBody", "session", "history", "date", "DOI",
    "citationKey", "url", "accessDate", "shortTitle", "language", "rights", "extra",
  ]),
  blogPost: new Set([
    "title", "abstractNote", "blogTitle", "websiteType", "date", "DOI",
    "citationKey", "url", "accessDate", "ISSN", "shortTitle", "language",
    "rights", "extra",
  ]),
  book: new Set([
    "title", "abstractNote", "series", "seriesNumber", "volume", "numberOfVolumes",
    "edition", "date", "publisher", "place", "originalDate", "originalPublisher",
    "originalPlace", "format", "numPages", "ISBN", "DOI", "citationKey", "url",
    "accessDate", "ISSN", "archive", "archiveLocation", "shortTitle", "language",
    "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  bookSection: new Set([
    "title", "abstractNote", "bookTitle", "series", "seriesNumber", "volume",
    "numberOfVolumes", "edition", "date", "publisher", "place", "originalDate",
    "originalPublisher", "originalPlace", "format", "pages", "ISBN", "DOI",
    "citationKey", "url", "accessDate", "ISSN", "archive", "archiveLocation",
    "shortTitle", "language", "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  case: new Set([
    "caseName", "abstractNote", "court", "dateDecided", "docketNumber", "reporter",
    "reporterVolume", "firstPage", "history", "DOI", "citationKey", "url",
    "accessDate", "shortTitle", "language", "rights", "extra",
  ]),
  computerProgram: new Set([
    "title", "abstractNote", "seriesTitle", "versionNumber", "date", "system",
    "company", "place", "programmingLanguage", "rights", "citationKey", "url",
    "accessDate", "DOI", "ISBN", "archive", "archiveLocation", "libraryCatalog",
    "callNumber", "shortTitle", "extra",
  ]),
  conferencePaper: new Set([
    "title", "abstractNote", "proceedingsTitle", "conferenceName", "publisher",
    "place", "date", "eventPlace", "volume", "issue", "numberOfVolumes", "pages",
    "series", "seriesNumber", "DOI", "ISBN", "citationKey", "url", "accessDate",
    "ISSN", "archive", "archiveLocation", "shortTitle", "language",
    "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  dataset: new Set([
    "title", "abstractNote", "identifier", "type", "versionNumber", "date",
    "repository", "repositoryLocation", "format", "DOI", "citationKey", "url",
    "accessDate", "archive", "archiveLocation", "shortTitle", "language",
    "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  dictionaryEntry: new Set([
    "title", "abstractNote", "dictionaryTitle", "series", "seriesNumber", "volume",
    "numberOfVolumes", "edition", "date", "publisher", "place", "pages", "ISBN",
    "DOI", "citationKey", "url", "accessDate", "archive", "archiveLocation",
    "shortTitle", "language", "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  document: new Set([
    "title", "abstractNote", "type", "date", "publisher", "place", "DOI",
    "citationKey", "url", "accessDate", "archive", "archiveLocation", "shortTitle",
    "language", "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  email: new Set([
    "subject", "abstractNote", "date", "DOI", "citationKey", "url", "accessDate",
    "shortTitle", "language", "rights", "extra",
  ]),
  encyclopediaArticle: new Set([
    "title", "abstractNote", "encyclopediaTitle", "series", "seriesNumber", "volume",
    "numberOfVolumes", "edition", "date", "publisher", "place", "pages", "ISBN",
    "DOI", "citationKey", "url", "accessDate", "archive", "archiveLocation",
    "shortTitle", "language", "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  film: new Set([
    "title", "abstractNote", "distributor", "place", "date", "genre",
    "videoRecordingFormat", "runningTime", "DOI", "citationKey", "url",
    "accessDate", "archive", "archiveLocation", "shortTitle", "language",
    "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  forumPost: new Set([
    "title", "abstractNote", "forumTitle", "postType", "date", "DOI", "citationKey",
    "url", "accessDate", "shortTitle", "language", "rights", "extra",
  ]),
  hearing: new Set([
    "title", "abstractNote", "committee", "publisher", "numberOfVolumes",
    "documentNumber", "pages", "legislativeBody", "session", "history", "date",
    "place", "DOI", "citationKey", "url", "accessDate", "shortTitle", "language",
    "rights", "extra",
  ]),
  instantMessage: new Set([
    "title", "abstractNote", "date", "DOI", "citationKey", "url", "accessDate",
    "shortTitle", "language", "rights", "extra",
  ]),
  interview: new Set([
    "title", "abstractNote", "interviewMedium", "date", "publisher", "place", "DOI",
    "citationKey", "url", "accessDate", "archive", "archiveLocation", "shortTitle",
    "language", "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  journalArticle: new Set([
    "title", "abstractNote", "publicationTitle", "publisher", "place", "date",
    "volume", "issue", "section", "partNumber", "partTitle", "pages", "series",
    "seriesTitle", "seriesText", "journalAbbreviation", "DOI", "citationKey", "url",
    "accessDate", "PMID", "PMCID", "ISSN", "archive", "archiveLocation",
    "shortTitle", "language", "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  letter: new Set([
    "title", "abstractNote", "letterType", "date", "eventPlace", "DOI",
    "citationKey", "url", "accessDate", "archive", "archiveLocation", "shortTitle",
    "language", "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  magazineArticle: new Set([
    "title", "abstractNote", "publicationTitle", "publisher", "place", "date",
    "volume", "issue", "pages", "ISSN", "DOI", "citationKey", "url", "accessDate",
    "archive", "archiveLocation", "shortTitle", "language", "libraryCatalog",
    "callNumber", "rights", "extra",
  ]),
  manuscript: new Set([
    "title", "abstractNote", "manuscriptType", "institution", "place", "date",
    "numPages", "number", "DOI", "citationKey", "url", "accessDate", "archive",
    "archiveLocation", "shortTitle", "language", "libraryCatalog", "callNumber",
    "rights", "extra",
  ]),
  map: new Set([
    "title", "abstractNote", "mapType", "scale", "seriesTitle", "edition",
    "publisher", "place", "date", "DOI", "ISBN", "citationKey", "url", "accessDate",
    "archive", "archiveLocation", "shortTitle", "language", "libraryCatalog",
    "callNumber", "rights", "extra",
  ]),
  newspaperArticle: new Set([
    "title", "abstractNote", "publicationTitle", "publisher", "place", "date",
    "volume", "issue", "edition", "section", "pages", "ISSN", "DOI", "citationKey",
    "url", "accessDate", "archive", "archiveLocation", "shortTitle", "language",
    "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  patent: new Set([
    "title", "abstractNote", "place", "country", "assignee", "issuingAuthority",
    "patentNumber", "filingDate", "pages", "applicationNumber", "priorityNumbers",
    "issueDate", "priorityDate", "references", "legalStatus", "DOI", "citationKey",
    "url", "accessDate", "shortTitle", "language", "rights", "extra",
  ]),
  podcast: new Set([
    "title", "abstractNote", "seriesTitle", "episodeNumber", "audioFileType", "date",
    "publisher", "place", "runningTime", "DOI", "citationKey", "url", "accessDate",
    "shortTitle", "language", "rights", "extra",
  ]),
  preprint: new Set([
    "title", "abstractNote", "genre", "repository", "archiveID", "place", "date",
    "series", "seriesNumber", "DOI", "citationKey", "url", "accessDate", "archive",
    "archiveLocation", "shortTitle", "language", "libraryCatalog", "callNumber",
    "rights", "extra",
  ]),
  presentation: new Set([
    "title", "abstractNote", "presentationType", "date", "meetingName", "place",
    "series", "sessionTitle", "DOI", "citationKey", "url", "accessDate",
    "shortTitle", "language", "rights", "extra",
  ]),
  radioBroadcast: new Set([
    "title", "abstractNote", "programTitle", "episodeNumber", "audioRecordingFormat",
    "network", "place", "date", "runningTime", "DOI", "citationKey", "url",
    "accessDate", "archive", "archiveLocation", "shortTitle", "language",
    "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  report: new Set([
    "title", "abstractNote", "reportNumber", "reportType", "institution", "place",
    "date", "seriesTitle", "seriesNumber", "pages", "DOI", "ISBN", "citationKey",
    "url", "accessDate", "ISSN", "archive", "archiveLocation", "shortTitle",
    "language", "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  standard: new Set([
    "title", "abstractNote", "organization", "committee", "type", "number",
    "versionNumber", "edition", "status", "date", "publisher", "place", "partNumber",
    "partTitle", "ISBN", "DOI", "citationKey", "url", "accessDate", "archive",
    "archiveLocation", "shortTitle", "numPages", "language", "libraryCatalog",
    "callNumber", "rights", "extra",
  ]),
  statute: new Set([
    "nameOfAct", "abstractNote", "code", "codeNumber", "publicLawNumber",
    "dateEnacted", "pages", "section", "session", "history", "DOI", "citationKey",
    "url", "accessDate", "shortTitle", "language", "rights", "extra",
  ]),
  thesis: new Set([
    "title", "abstractNote", "thesisType", "university", "place", "date", "series",
    "seriesNumber", "numPages", "DOI", "ISBN", "citationKey", "url", "accessDate",
    "ISSN", "archive", "archiveLocation", "shortTitle", "language",
    "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  tvBroadcast: new Set([
    "title", "abstractNote", "programTitle", "episodeNumber", "videoRecordingFormat",
    "network", "place", "date", "runningTime", "DOI", "citationKey", "url",
    "accessDate", "archive", "archiveLocation", "shortTitle", "language",
    "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  videoRecording: new Set([
    "title", "abstractNote", "videoRecordingFormat", "seriesTitle", "volume",
    "numberOfVolumes", "studio", "place", "date", "runningTime", "ISBN", "DOI",
    "citationKey", "url", "accessDate", "archive", "archiveLocation", "shortTitle",
    "language", "libraryCatalog", "callNumber", "rights", "extra",
  ]),
  webpage: new Set([
    "title", "abstractNote", "websiteTitle", "websiteType", "date", "publisher",
    "place", "DOI", "citationKey", "url", "accessDate", "shortTitle", "language",
    "rights", "extra",
  ]),
};

/** Per-type valid creator types — ReadonlySet for O(1) lookup. */
export const ITEM_TYPE_CREATOR_TYPES: Record<ZoteroItemType, ReadonlySet<string>> = {
  artwork: new Set(["artist", "contributor"]),
  audioRecording: new Set(["performer", "composer", "contributor", "originalCreator", "translator", "wordsBy"]),
  bill: new Set(["sponsor", "contributor", "cosponsor"]),
  blogPost: new Set(["author", "commenter", "contributor", "translator"]),
  book: new Set(["author", "contributor", "editor", "seriesEditor", "translator"]),
  bookSection: new Set(["author", "bookAuthor", "contributor", "editor", "seriesEditor", "translator"]),
  case: new Set(["author", "contributor", "counsel"]),
  computerProgram: new Set(["programmer", "contributor"]),
  conferencePaper: new Set(["author", "contributor", "editor", "seriesEditor", "translator"]),
  dataset: new Set(["author", "contributor"]),
  dictionaryEntry: new Set(["author", "contributor", "editor", "seriesEditor", "translator"]),
  document: new Set(["author", "contributor", "editor", "reviewedAuthor", "translator"]),
  email: new Set(["author", "contributor", "recipient", "translator"]),
  encyclopediaArticle: new Set(["author", "contributor", "editor", "seriesEditor", "translator"]),
  film: new Set(["director", "castMember", "contributor", "guest", "host", "narrator", "producer", "scriptwriter", "translator"]),
  forumPost: new Set(["author", "contributor"]),
  hearing: new Set(["contributor"]),
  instantMessage: new Set(["author", "contributor", "recipient"]),
  interview: new Set(["interviewee", "contributor", "interviewer", "translator"]),
  journalArticle: new Set(["author", "contributor", "editor", "reviewedAuthor", "translator"]),
  letter: new Set(["author", "contributor", "recipient", "translator"]),
  magazineArticle: new Set(["author", "contributor", "reviewedAuthor", "translator"]),
  manuscript: new Set(["author", "contributor", "translator"]),
  map: new Set(["cartographer", "contributor", "seriesEditor"]),
  newspaperArticle: new Set(["author", "contributor", "reviewedAuthor", "translator"]),
  patent: new Set(["inventor", "attorneyAgent", "contributor"]),
  podcast: new Set(["podcaster", "castMember", "contributor", "director", "executiveProducer", "guest", "producer", "scriptwriter", "seriesCreator", "translator"]),
  preprint: new Set(["author", "contributor", "editor", "reviewedAuthor", "translator"]),
  presentation: new Set(["presenter", "chair", "contributor", "organizer", "translator"]),
  radioBroadcast: new Set(["creator", "castMember", "contributor", "director", "executiveProducer", "guest", "host", "producer", "scriptwriter", "seriesCreator", "translator"]),
  report: new Set(["author", "contributor", "editor", "seriesEditor", "translator"]),
  standard: new Set(["author", "contributor", "editor"]),
  statute: new Set(["author", "contributor"]),
  thesis: new Set(["author", "contributor"]),
  tvBroadcast: new Set(["director", "castMember", "contributor", "executiveProducer", "guest", "host", "narrator", "producer", "scriptwriter", "seriesCreator", "translator"]),
  videoRecording: new Set(["creator", "castMember", "contributor", "director", "executiveProducer", "guest", "host", "narrator", "producer", "scriptwriter", "translator"]),
  webpage: new Set(["author", "contributor", "translator"]),
};
