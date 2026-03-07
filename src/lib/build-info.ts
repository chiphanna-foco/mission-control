/**
 * Build and deployment information
 * Populated at build time from package.json and git
 */

export interface BuildInfo {
  version: string;
  gitHash: string;
  deployNumber: string;
  timestamp: string;
}

// These will be replaced at build time or read from environment
let buildInfo: BuildInfo | null = null;

/**
 * Get current build information (version, git hash, deploy number)
 */
export function getBuildInfo(): BuildInfo {
  if (buildInfo) {
    return buildInfo;
  }

  // Try to get from environment variables first
  const envVersion = process.env.NEXT_PUBLIC_VERSION || '1.0.1';
  const envGitHash = process.env.NEXT_PUBLIC_GIT_HASH || 'unknown';
  const envDeployNum = process.env.NEXT_PUBLIC_DEPLOY_NUM || '1';

  buildInfo = {
    version: envVersion,
    gitHash: envGitHash,
    deployNumber: envDeployNum,
    timestamp: new Date().toISOString(),
  };

  return buildInfo;
}

/**
 * Get short deploy badge text (e.g., "v1.0.1-c1a4a0e")
 */
export function getDeployBadge(): string {
  const info = getBuildInfo();
  const shortHash = info.gitHash.slice(0, 7);
  return `${info.version}-${shortHash}`;
}
