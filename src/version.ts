
export function atp_version() : string {
  return process.env.ATP_VERSION || "0.0.0-dev";
}
