export {
  JsonDocumentMergeInvalidPayloadError,
  JsonDocumentMergeInvalidPointerError,
} from "./errors.js";
export { parseJsonPointer } from "./json-pointer.js";
export { deepMergePlainObjects } from "./deep-merge-plain-objects.js";
export {
  mergeJsonDocumentWithStrategy,
  type JsonMergeStrategy,
  type JsonDocumentStrategyMergeResult,
} from "./json-document-merge-strategies.js";
export {
  applyJsonDocumentMergeWithStrategyToFile,
  type ApplyJsonDocumentStrategyMergeResult,
  type ApplyJsonDocumentStrategyOptions,
  type ApplyJsonDocumentStrategyStatus,
} from "./apply-json-document-merge.js";
