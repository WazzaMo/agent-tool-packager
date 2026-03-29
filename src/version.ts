
/** Returns the fixed version string set by the build automation from
 *  the source project-version text file.
 * 
 * @returns version string that is set during build to match text
 *          in the `project-version` file.
 */
export function atp_version() : string {
  return process.env.ATP_VERSION || "0.0.0-dev";
}
