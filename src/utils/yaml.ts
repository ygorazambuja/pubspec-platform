import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { PubspecData } from './types';

/**
 * Parses YAML content from a pubspec.yaml file
 * @param filePath Path to the pubspec.yaml file
 * @returns Parsed PubspecData object
 */
export function parsePubspec(filePath: string): PubspecData {
	const content = fs.readFileSync(filePath, 'utf8');
	return yaml.load(content) as PubspecData;
}

/**
 * Extracts dependencies and dev dependencies from pubspec data
 * @param pubspecData The parsed pubspec data
 * @returns Object containing separate arrays for dependencies and dev dependencies
 */
export function extractDependencies(pubspecData: PubspecData): { dependencies: string[], devDependencies: string[] } {
	const dependencies: string[] = [];
	const devDependencies: string[] = [];

	// Extract regular dependencies
	if (pubspecData.dependencies) {
		Object.keys(pubspecData.dependencies).forEach(dep => {
			if (dep !== 'flutter' && dep !== 'flutter_test') { // Skip Flutter SDK dependencies
				dependencies.push(dep);
			}
		});
	}

	// Extract dev dependencies
	if (pubspecData.dev_dependencies) {
		Object.keys(pubspecData.dev_dependencies).forEach(dep => {
			if (dep !== 'flutter' && dep !== 'flutter_test') { // Skip Flutter SDK dependencies
				devDependencies.push(dep);
			}
		});
	}

	return { dependencies, devDependencies };
}
