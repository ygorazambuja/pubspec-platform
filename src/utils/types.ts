export interface PubspecData {
	name?: string;
	version?: string;
	dependencies?: Record<string, any>;
	dev_dependencies?: Record<string, any>;
}

export interface PackagePlatformInfo {
	name: string;
	platforms: string[];
	sdks: string[];
	compatibilityStatus: 'full' | 'partial' | 'none';
	missingPlatforms: string[];
	missingSDKs: string[];
}

export interface CompatibilityConfig {
	targetPlatforms: string[];
	targetSDKs: string[];
}

export interface DependencyAnalysis {
	dependencies: PackagePlatformInfo[];
	devDependencies: PackagePlatformInfo[];
}
