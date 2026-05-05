declare global {
  const LOCALCODE_VERSION: string
  const LOCALCODE_CHANNEL: string
}

export const InstallationVersion = typeof LOCALCODE_VERSION === "string" ? LOCALCODE_VERSION : "local"
export const InstallationChannel = typeof LOCALCODE_CHANNEL === "string" ? LOCALCODE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
