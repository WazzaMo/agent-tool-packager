/**
 * Shared Agent Skills install helpers for {@link AgentProvider} implementations.
 */

export { assembleSkillMdFromPartials } from "./assemble-skill-md.js";
export {
  SKILL_COMPATIBILITY_MAX_LEN,
  SKILL_DESCRIPTION_MAX_LEN,
  SKILL_NAME_MAX_LEN,
  SKILL_ALLOWED_TOOLS_KEY,
} from "./constants.js";
export { finalizeSkillMdContent, assertSafeSkillDirectoryName } from "./finalize-skill-md.js";
export {
  SkillFrontmatterError,
  normaliseSkillYamlDocument,
  serialiseSkillFrontmatterYaml,
  skillNameFromNormalisedFrontmatter,
} from "./normalize-skill-frontmatter.js";
export { patchSkillScriptsPlaceholder } from "./patch-skill-placeholders.js";
export {
  buildSkillInstallProviderActions,
  type SkillInstallPathOptions,
} from "./plan-skill-install.js";
export { removeProviderSkillBundleTrees } from "./remove-skill-bundles.js";
export {
  isAssembledSkillMdBasename,
  isPartialSkillMdBasename,
  isSkillYamlBasename,
  resolvePrimarySkillSource,
} from "./resolve-primary-skill-source.js";
export { longestCommonPathPrefix, resolveSkillBundleRoot, relativeToSkillBundle, toPosixPath } from "./skill-bundle-root.js";
export { trySplitSkillFrontmatter } from "./split-skill-md.js";
