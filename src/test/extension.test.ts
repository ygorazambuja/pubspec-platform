import * as assert from 'assert';

// Import functions from our modular utilities
import { parsePubspec, extractDependencies } from '../utils/yaml';
import { extractPlatformsFromHtml, extractSDKsFromHtml } from '../utils/scraper';
import { checkCompatibility } from '../utils/compatibility';

suite('Pubspec Platform Extension Tests', () => {
	suite('YAML Parsing', () => {
		test('parsePubspec parses valid YAML', () => {
			const yamlContent = `
name: test_app
version: 1.0.0
dependencies:
  flutter:
    sdk: flutter
  http: ^1.0.0
  provider: ^6.0.0
dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.0.0
`;
			const result = parsePubspec(yamlContent);

			assert.strictEqual(result.name, 'test_app');
			assert.strictEqual(result.version, '1.0.0');
			assert.ok(result.dependencies, 'Dependencies should exist');
			assert.ok(result.dev_dependencies, 'Dev dependencies should exist');
			assert.strictEqual(result.dependencies!.http, '^1.0.0');
			assert.strictEqual(result.dev_dependencies!.build_runner, '^2.0.0');
		});

		test('extractDependencies separates deps from dev deps', () => {
			const pubspecData = {
				dependencies: {
					flutter: { sdk: 'flutter' },
					http: '^1.0.0',
					provider: '^6.0.0'
				},
				dev_dependencies: {
					flutter_test: { sdk: 'flutter' },
					build_runner: '^2.0.0',
					mockito: '^5.0.0'
				}
			};

			const result = extractDependencies(pubspecData);

			assert.deepStrictEqual(result.dependencies, ['http', 'provider']);
			assert.deepStrictEqual(result.devDependencies, ['build_runner', 'mockito']);
		});

		test('extractDependencies skips Flutter SDK deps', () => {
			const pubspecData = {
				dependencies: {
					flutter: { sdk: 'flutter' },
					http: '^1.0.0'
				},
				dev_dependencies: {
					flutter_test: { sdk: 'flutter' },
					build_runner: '^2.0.0'
				}
			};

			const result = extractDependencies(pubspecData);

			assert.deepStrictEqual(result.dependencies, ['http']);
			assert.deepStrictEqual(result.devDependencies, ['build_runner']);
		});

		test('extractDependencies handles empty sections', () => {
			const pubspecData = {
				name: 'test'
			};

			const result = extractDependencies(pubspecData);

			assert.deepStrictEqual(result.dependencies, []);
			assert.deepStrictEqual(result.devDependencies, []);
		});
	});

	suite('HTML Scraping', () => {
		test('extractPlatformsFromHtml extracts platforms correctly', () => {
			const html = `
<div class="detail-tags">
	<div class="-pub-tag-badge">
		<span class="tag-badge-main">SDK</span>
		<a class="tag-badge-sub" href="/packages?q=sdk%3Adart">Dart</a>
		<a class="tag-badge-sub" href="/packages?q=sdk%3Aflutter">Flutter</a>
	</div>
	<div class="-pub-tag-badge">
		<span class="tag-badge-main">Platform</span>
		<a class="tag-badge-sub" href="/packages?q=platform%3Aandroid">Android</a>
		<a class="tag-badge-sub" href="/packages?q=platform%3Aios">iOS</a>
		<a class="tag-badge-sub" href="/packages?q=platform%3Alinux">Linux</a>
		<a class="tag-badge-sub" href="/packages?q=platform%3Amacos">macOS</a>
		<a class="tag-badge-sub" href="/packages?q=platform%3Aweb">Web</a>
	</div>
</div>
`;
			const platforms = extractPlatformsFromHtml(html);
			assert.deepStrictEqual(platforms.sort(), ['Android', 'iOS', 'Linux', 'macOS', 'Web'].sort());
		});

		test('extractSDKsFromHtml extracts SDKs correctly', () => {
			const html = `
<div class="detail-tags">
	<div class="-pub-tag-badge">
		<span class="tag-badge-main">SDK</span>
		<a class="tag-badge-sub" href="/packages?q=sdk%3Adart">Dart</a>
		<a class="tag-badge-sub" href="/packages?q=sdk%3Aflutter">Flutter</a>
	</div>
</div>
`;
			const sdks = extractSDKsFromHtml(html);
			assert.deepStrictEqual(sdks.sort(), ['Dart', 'Flutter'].sort());
		});

		test('extractPlatformsFromHtml handles empty HTML', () => {
			const html = '<div></div>';
			const platforms = extractPlatformsFromHtml(html);
			assert.deepStrictEqual(platforms, []);
		});

		test('extractSDKsFromHtml handles empty HTML', () => {
			const html = '<div></div>';
			const sdks = extractSDKsFromHtml(html);
			assert.deepStrictEqual(sdks, []);
		});
	});

	suite('Compatibility Checking', () => {
		const defaultConfig = {
			targetPlatforms: ['Android', 'iOS', 'Linux', 'macOS', 'Web'],
			targetSDKs: ['Flutter']
		};

		test('checkCompatibility returns full for complete match', () => {
			const platforms = ['Android', 'iOS', 'Linux', 'macOS', 'Web'];
			const sdks = ['Flutter'];

			const result = checkCompatibility(platforms, sdks, defaultConfig);

			assert.strictEqual(result.compatibilityStatus, 'full');
			assert.deepStrictEqual(result.missingPlatforms, []);
			assert.deepStrictEqual(result.missingSDKs, []);
		});

		test('checkCompatibility returns partial for missing some platforms', () => {
			const platforms = ['Android', 'iOS', 'web', 'Windows']; // Missing Linux, macOS
			const sdks = ['Flutter'];

			const result = checkCompatibility(platforms, sdks, defaultConfig);

			assert.strictEqual(result.compatibilityStatus, 'partial');
			assert.deepStrictEqual(result.missingPlatforms.sort(), ['Linux', 'macOS'].sort());
			assert.deepStrictEqual(result.missingSDKs, []);
		});

		test('checkCompatibility returns partial for missing some SDKs', () => {
			const platforms = ['Android', 'iOS', 'Linux', 'macOS', 'Web'];
			const sdks = ['Dart']; // Missing Flutter

			const result = checkCompatibility(platforms, sdks, defaultConfig);

			assert.strictEqual(result.compatibilityStatus, 'partial');
			assert.deepStrictEqual(result.missingPlatforms, []);
			assert.deepStrictEqual(result.missingSDKs, ['Flutter']);
		});

		test('checkCompatibility returns none for missing all platforms', () => {
			const platforms = ['Windows'];
			const sdks = ['Flutter'];

			const result = checkCompatibility(platforms, sdks, defaultConfig);

			assert.strictEqual(result.compatibilityStatus, 'none');
			assert.strictEqual(result.missingPlatforms.length, 5); // All 5 target platforms missing
			assert.deepStrictEqual(result.missingSDKs, []);
		});

		test('checkCompatibility handles case insensitive platform matching', () => {
			const platforms = ['android', 'ios', 'web', 'windows']; // lowercase
			const sdks = ['Flutter'];
			const config = {
				targetPlatforms: ['Android', 'iOS', 'Web'], // mixed case
				targetSDKs: ['Flutter']
			};

			const result = checkCompatibility(platforms, sdks, config);

			assert.strictEqual(result.compatibilityStatus, 'full');
			assert.deepStrictEqual(result.missingPlatforms, []);
		});

		test('checkCompatibility returns none when missing both platforms and SDKs', () => {
			const platforms = ['Windows'];
			const sdks = ['Dart'];

			const result = checkCompatibility(platforms, sdks, defaultConfig);

			assert.strictEqual(result.compatibilityStatus, 'none');
		});
	});

	suite('Integration Tests', () => {
		test('full workflow: parse YAML -> extract deps -> check compatibility', () => {
			// Sample pubspec.yaml content
			const yamlContent = `
dependencies:
  flutter:
    sdk: flutter
  http: ^1.0.0
  permission_handler: ^10.0.0
dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.0.0
`;

			// Parse YAML
			const pubspecData = parsePubspec(yamlContent);

			// Extract dependencies
			const { dependencies, devDependencies } = extractDependencies(pubspecData);

			assert.deepStrictEqual(dependencies, ['http', 'permission_handler']);
			assert.deepStrictEqual(devDependencies, ['build_runner']);

			// Test compatibility for a known package (simulating scraped data)
			const config = {
				targetPlatforms: ['Android', 'iOS', 'Linux', 'macOS', 'Web'],
				targetSDKs: ['Flutter']
			};

			// Simulate permission_handler data (Android, iOS, web, Windows, Flutter)
			const permissionHandlerPlatforms = ['Android', 'iOS', 'web', 'Windows'];
			const permissionHandlerSDKs = ['Flutter'];

			const compatibility = checkCompatibility(permissionHandlerPlatforms, permissionHandlerSDKs, config);

			assert.strictEqual(compatibility.compatibilityStatus, 'partial');
			assert.deepStrictEqual(compatibility.missingPlatforms.sort(), ['Linux', 'macOS'].sort());
			assert.deepStrictEqual(compatibility.missingSDKs, []);
		});
	});
});
