import * as vscode from 'vscode';
import { PackagePlatformInfo, CompatibilityConfig, DependencyAnalysis } from '../utils/types';

/**
 * Displays analysis results in a VSCode webview panel
 * @param analysisResult The dependency analysis results
 * @param config The compatibility configuration
 * @param context The extension context
 */
export function displayResultsInWebview(
	analysisResult: DependencyAnalysis,
	config: CompatibilityConfig,
	context: vscode.ExtensionContext
): void {
	const panel = vscode.window.createWebviewPanel(
		'pubspecPlatformAnalysis',
		'Pubspec Platform Analysis',
		vscode.ViewColumn.One,
		{
			enableScripts: true,
			localResourceRoots: []
		}
	);

	// Sort by compatibility status (full first, then partial, then none)
	const sortByCompatibility = (infos: PackagePlatformInfo[]) =>
		[...infos].sort((a, b) => {
			const statusOrder = { full: 0, partial: 1, none: 2 };
			return statusOrder[a.compatibilityStatus] - statusOrder[b.compatibilityStatus];
		});

	const sortedDependencies = sortByCompatibility(analysisResult.dependencies);
	const sortedDevDependencies = sortByCompatibility(analysisResult.devDependencies);

	const html = generateWebviewHTML(sortedDependencies, sortedDevDependencies, config, panel.webview);

	// Handle messages from webview
	panel.webview.onDidReceiveMessage(
		message => {
			switch (message.type) {
				case 'openSettings':
					vscode.commands.executeCommand('workbench.action.openSettings', 'pubspec-platform');
					break;
			}
		},
		undefined,
		context.subscriptions
	);

	panel.webview.html = html;

	// Show summary notification
	const allPackages = [...analysisResult.dependencies, ...analysisResult.devDependencies];
	const fullCompatible = allPackages.filter(p => p.compatibilityStatus === 'full').length;
	const partialCompatible = allPackages.filter(p => p.compatibilityStatus === 'partial').length;
	const totalPackages = allPackages.length;
	const incompatible = totalPackages - fullCompatible - partialCompatible;

	vscode.window.showInformationMessage(
		`Analysis complete! ${fullCompatible} fully compatible, ${partialCompatible} partially compatible, ${incompatible} incompatible packages.`
	);
}

/**
 * Generates the HTML content for the webview
 * @param dependencies Sorted dependencies array
 * @param devDependencies Sorted dev dependencies array
 * @param config The compatibility configuration
 * @param webview The webview instance
 * @returns HTML string for the webview
 */
export function generateWebviewHTML(
	dependencies: PackagePlatformInfo[],
	devDependencies: PackagePlatformInfo[],
	config: CompatibilityConfig,
	webview: vscode.Webview
): string {
	const allPackages = [...dependencies, ...devDependencies];
	const fullCompatible = allPackages.filter(p => p.compatibilityStatus === 'full');
	const partialCompatible = allPackages.filter(p => p.compatibilityStatus === 'partial');
	const incompatible = allPackages.filter(p => p.compatibilityStatus === 'none');

	const depFull = dependencies.filter(p => p.compatibilityStatus === 'full');
	const depPartial = dependencies.filter(p => p.compatibilityStatus === 'partial');
	const depNone = dependencies.filter(p => p.compatibilityStatus === 'none');

	const devDepFull = devDependencies.filter(p => p.compatibilityStatus === 'full');
	const devDepPartial = devDependencies.filter(p => p.compatibilityStatus === 'partial');
	const devDepNone = devDependencies.filter(p => p.compatibilityStatus === 'none');

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'full': return '✅';
			case 'partial': return '⚠️';
			case 'none': return '❌';
			default: return '❓';
		}
	};

	const getStatusClass = (status: string) => {
		switch (status) {
			case 'full': return 'status-full';
			case 'partial': return 'status-partial';
			case 'none': return 'status-none';
			default: return '';
		}
	};

	const renderTableSection = (title: string, packages: PackagePlatformInfo[], status: string, sectionClass: string = '') => {
		if (packages.length === 0) {
			return '';
		}

		return `
			<div class="section ${sectionClass}">
				<h3 class="section-title ${getStatusClass(status)}">
					${getStatusIcon(status)} ${title} (${packages.length})
				</h3>
				<table class="packages-table">
					<thead>
						<tr>
							<th>Package</th>
							<th>Supported Platforms</th>
							<th>Supported SDKs</th>
							<th>Missing Platforms</th>
							<th>Missing SDKs</th>
						</tr>
					</thead>
					<tbody>
						${packages.map(pkg => `
							<tr class="${getStatusClass(pkg.compatibilityStatus)}">
								<td class="package-name">${pkg.name}</td>
								<td>${pkg.platforms.length > 0 ? pkg.platforms.join(', ') : 'None found'}</td>
								<td>${pkg.sdks.length > 0 ? pkg.sdks.join(', ') : 'None found'}</td>
								<td class="missing">${pkg.missingPlatforms.length > 0 ? pkg.missingPlatforms.join(', ') : 'None'}</td>
								<td class="missing">${pkg.missingSDKs.length > 0 ? pkg.missingSDKs.join(', ') : 'None'}</td>
							</tr>
						`).join('')}
					</tbody>
				</table>
			</div>
		`;
	};

	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Pubspec Platform Analysis</title>
			<style>
				body {
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					margin: 0;
					padding: 20px;
					background-color: #1e1e1e;
					color: #cccccc;
				}

				.header {
					background: linear-gradient(135deg, #0e639c 0%, #0d4a7a 100%);
					color: white;
					padding: 20px;
					border-radius: 8px;
					margin-bottom: 20px;
					box-shadow: 0 2px 10px rgba(0,0,0,0.3);
				}

				.header h1 {
					margin: 0 0 10px 0;
					font-size: 24px;
				}

				.config-summary {
					font-size: 14px;
					opacity: 0.9;
				}

				.section {
					background: #2d2d30;
					border-radius: 8px;
					padding: 20px;
					margin-bottom: 20px;
					box-shadow: 0 2px 8px rgba(0,0,0,0.3);
					border: 1px solid #3e3e42;
				}

				.section-title {
					margin: 0 0 15px 0;
					font-size: 18px;
					display: flex;
					align-items: center;
					gap: 8px;
				}

				.status-full { color: #4ade80; }
				.status-partial { color: #fbbf24; }
				.status-none { color: #f87171; }

				.packages-table {
					width: 100%;
					border-collapse: collapse;
					font-size: 14px;
				}

				.packages-table th,
				.packages-table td {
					padding: 12px;
					text-align: left;
					border-bottom: 1px solid #3e3e42;
				}

				.packages-table th {
					background-color: #1e1e1e;
					font-weight: 600;
					color: #cccccc;
				}

				.packages-table tr:hover {
					background-color: #37373d;
				}

				.package-name {
					font-weight: 500;
					font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
					color: #4ec9b0;
				}

				.missing {
					color: #f87171;
					font-weight: 500;
				}

				.summary {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
					gap: 15px;
					margin-bottom: 20px;
				}

				.summary-card {
					background: #2d2d30;
					padding: 15px;
					border-radius: 8px;
					text-align: center;
					box-shadow: 0 2px 8px rgba(0,0,0,0.3);
					border: 1px solid #3e3e42;
				}

				.summary-card h3 {
					margin: 0 0 5px 0;
					font-size: 16px;
					color: #cccccc;
				}

				.summary-card .count {
					font-size: 24px;
					font-weight: bold;
				}

				.count-full { color: #4ade80; }
				.count-partial { color: #fbbf24; }
				.count-none { color: #f87171; }

				.controls {
					background: #2d2d30;
					border-radius: 8px;
					padding: 15px;
					margin-bottom: 20px;
					box-shadow: 0 2px 8px rgba(0,0,0,0.3);
					border: 1px solid #3e3e42;
				}

				.filter-buttons {
					display: flex;
					gap: 10px;
					flex-wrap: wrap;
				}

				.filter-btn {
					padding: 8px 16px;
					border: 1px solid #3e3e42;
					background: #2d2d30;
					color: #cccccc;
					border-radius: 6px;
					cursor: pointer;
					font-size: 14px;
					transition: all 0.2s ease;
				}

				.filter-btn:hover {
					background: #37373d;
					border-color: #569cd6;
				}

				.filter-btn.active {
					background: #0e639c;
					color: white;
					border-color: #0e639c;
				}

				.settings-btn {
					float: right;
					padding: 4px 8px;
					border: 1px solid #3e3e42;
					background: #2d2d30;
					color: #cccccc;
					border-radius: 4px;
					cursor: pointer;
					font-size: 12px;
					margin-top: -5px;
				}

				.settings-btn:hover {
					background: #37373d;
					border-color: #569cd6;
				}

				.section.hidden {
					display: none;
				}

				.dependency-section .section-title::before {
					content: "📦";
					margin-right: 5px;
				}

				.dev-dependency-section .section-title::before {
					content: "🔧";
					margin-right: 5px;
				}
			</style>
		</head>
		<body>
			<div class="header">
				<h1>📱 Pubspec Platform Analysis</h1>
				<div class="config-summary">
					<strong>Target Platforms:</strong> ${config.targetPlatforms.join(', ')}<br>
					<strong>Target SDKs:</strong> ${config.targetSDKs.join(', ')}
					<button id="editSettings" class="settings-btn">⚙️ Edit Settings</button>
				</div>
			</div>

			<div class="summary">
				<div class="summary-card">
					<h3>✅ Fully Compatible</h3>
					<div class="count count-full">${fullCompatible.length}</div>
				</div>
				<div class="summary-card">
					<h3>⚠️ Partially Compatible</h3>
					<div class="count count-partial">${partialCompatible.length}</div>
				</div>
				<div class="summary-card">
					<h3>❌ Incompatible</h3>
					<div class="count count-none">${incompatible.length}</div>
				</div>
			</div>

			<div class="controls">
				<div class="filter-buttons">
					<button class="filter-btn active" data-filter="all">All (${allPackages.length})</button>
					<button class="filter-btn" data-filter="full">✅ Compatible (${fullCompatible.length})</button>
					<button class="filter-btn" data-filter="partial">⚠️ Partial (${partialCompatible.length})</button>
					<button class="filter-btn" data-filter="none">❌ Incompatible (${incompatible.length})</button>
				</div>
			</div>

			${renderTableSection('Fully Compatible Dependencies', depFull, 'full', 'dependency-section')}
			${renderTableSection('Partially Compatible Dependencies', depPartial, 'partial', 'dependency-section')}
			${renderTableSection('Incompatible Dependencies', depNone, 'none', 'dependency-section')}

			${renderTableSection('Fully Compatible Dev Dependencies', devDepFull, 'full', 'dev-dependency-section')}
			${renderTableSection('Partially Compatible Dev Dependencies', devDepPartial, 'partial', 'dev-dependency-section')}
			${renderTableSection('Incompatible Dev Dependencies', devDepNone, 'none', 'dev-dependency-section')}
		</body>
		<script>
			const vscode = acquireVsCodeApi();

			// Edit settings button
			document.getElementById('editSettings').addEventListener('click', () => {
				vscode.postMessage({ type: 'openSettings' });
			});

			// Filter buttons
			document.querySelectorAll('.filter-btn').forEach(button => {
				button.addEventListener('click', () => {
					const filter = button.getAttribute('data-filter');

					// Update active button
					document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
					button.classList.add('active');

					// Show/hide sections
					document.querySelectorAll('.section').forEach(section => {
						if (filter === 'all') {
							section.classList.remove('hidden');
						} else {
							const status = section.querySelector('.section-title').classList.contains(\`status-\${filter}\`);
							section.classList.toggle('hidden', !status);
						}
					});
				});
			});
		</script>
		</html>
	`;
}
