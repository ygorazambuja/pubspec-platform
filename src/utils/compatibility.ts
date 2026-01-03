import { CompatibilityConfig } from './types';

/**
 * Checks compatibility of package platforms and SDKs against target requirements
 * @param platforms Array of platforms supported by the package
 * @param sdks Array of SDKs supported by the package
 * @param config The compatibility configuration with target platforms and SDKs
 * @returns Object containing compatibility status and missing items
 */
export function checkCompatibility(
	platforms: string[],
	sdks: string[],
	config: CompatibilityConfig
): {
	compatibilityStatus: 'full' | 'partial' | 'none';
	missingPlatforms: string[];
	missingSDKs: string[];
} {
	// Normalize platform names to lowercase for case-insensitive comparison
	const normalizedPlatforms = platforms.map(p => p.toLowerCase());

	const missingPlatforms = config.targetPlatforms.filter(p =>
		!normalizedPlatforms.includes(p.toLowerCase())
	);
	const missingSDKs = config.targetSDKs.filter(s => !sdks.includes(s));

	let compatibilityStatus: 'full' | 'partial' | 'none';
	if (missingPlatforms.length === 0 && missingSDKs.length === 0) {
		compatibilityStatus = 'full';
	} else if (missingPlatforms.length < config.targetPlatforms.length || missingSDKs.length < config.targetSDKs.length) {
		compatibilityStatus = 'partial';
	} else {
		compatibilityStatus = 'none';
	}

	return { compatibilityStatus, missingPlatforms, missingSDKs };
}
