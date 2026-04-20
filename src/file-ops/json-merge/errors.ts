/**
 * Errors for generic JSON document merge helpers (task 3.8 strategies).
 */

export class JsonDocumentMergeInvalidPointerError extends Error {
  readonly code = "JSON_DOCUMENT_MERGE_INVALID_POINTER" as const;

  constructor(message: string) {
    super(message);
    this.name = "JsonDocumentMergeInvalidPointerError";
  }
}

export class JsonDocumentMergeInvalidPayloadError extends Error {
  readonly code = "JSON_DOCUMENT_MERGE_INVALID_PAYLOAD" as const;

  constructor(message: string) {
    super(message);
    this.name = "JsonDocumentMergeInvalidPayloadError";
  }
}
