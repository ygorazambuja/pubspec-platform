// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Import our modular utilities
import { CompatibilityConfig, DependencyAnalysis } from './utils/types';
import { parsePubspec, extractDependencies } from './utils/yaml';
import { fetchPackagePlatformInfo } from './utils/scraper';
import { displayResultsInWebview } from './ui/webview';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Pubspec Platform extension is now active!');

	const disposable = vscode.commands.registerCommand('pubspec-platform.analyzeDependencies', async () => {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('No workspace folder found.');
				return;
			}

			const pubspecPath = path.join(workspaceFolder.uri.fsPath, 'pubspec.yaml');
			if (!fs.existsSync(pubspecPath)) {
				vscode.window.showErrorMessage('pubspec.yaml not found in workspace root.');
				return;
			}

			// Get configuration
			const config = vscode.workspace.getConfiguration('pubspec-platform');
			const targetPlatforms = config.get<string[]>('targetPlatforms', ['Android', 'iOS', 'Linux', 'macOS', 'Web']);
			const targetSDKs = config.get<string[]>('targetSDKs', ['Flutter']);

			const compatibilityConfig: CompatibilityConfig = {
				targetPlatforms,
				targetSDKs
			};

			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Analyzing Pubspec Dependencies',
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 0, message: 'Reading pubspec.yaml...' });

				const pubspecData = parsePubspec(pubspecPath);
				const { dependencies: depNames, devDependencies: devDepNames } = extractDependencies(pubspecData);

				progress.report({ increment: 10, message: 'Fetching platform information...' });

				// Process all dependencies concurrently
				const allPackageNames = [...depNames, ...devDepNames];
				const totalDeps = allPackageNames.length;

				const packagePromises = allPackageNames.map(async (packageName, index) => {
					try {
						const info = await fetchPackagePlatformInfo(packageName, compatibilityConfig);
						return { packageName, info, success: true };
					} catch (error) {
						console.error(`Failed to fetch info for ${packageName}:`, error);
						// Add with empty platforms if fetch fails
						const fallbackInfo = {
							name: packageName,
							platforms: [],
							sdks: [],
							compatibilityStatus: 'none' as const,
							missingPlatforms: targetPlatforms,
							missingSDKs: targetSDKs
						};
						return { packageName, info: fallbackInfo, success: false };
					}
				});

				// Wait for all requests to complete concurrently
				const results = await Promise.all(packagePromises);

				progress.report({ increment: 90, message: 'Processing results...' });

				// Separate results back into dependencies and dev dependencies
				const dependencyInfos: any[] = [];
				const devDependencyInfos: any[] = [];

				results.forEach(({ packageName, info }) => {
					if (depNames.includes(packageName)) {
						dependencyInfos.push(info);
					} else if (devDepNames.includes(packageName)) {
						devDependencyInfos.push(info);
					}
				});

				progress.report({ increment: 100, message: 'Generating report...' });

				const analysisResult: DependencyAnalysis = {
					dependencies: dependencyInfos,
					devDependencies: devDependencyInfos
				};

				displayResultsInWebview(analysisResult, compatibilityConfig, context);
			});

		} catch (error) {
			console.error('Error analyzing dependencies:', error);
			vscode.window.showErrorMessage(`Error analyzing dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
