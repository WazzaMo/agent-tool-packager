/**
 * Feature 4: Multi-type package part authoring (newpart, per-part usage/components/bundles).
 *
 * Implementation is split under `./part-authoring/`; this file re-exports the public API.
 */

export { packageNewpart } from "./part-authoring/newpart.js";
export {
  packagePartBundleAdd,
  packagePartBundleRemove,
} from "./part-authoring/bundle.js";
export {
  packagePartComponentAdd,
  packagePartComponentRemove,
} from "./part-authoring/component.js";
export { packagePartRemove } from "./part-authoring/remove-part.js";
export { packagePartAddUsage, packagePartUsage } from "./part-authoring/usage.js";
