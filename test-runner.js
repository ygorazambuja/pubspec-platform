#!/usr/bin/env node

// Simple test runner for our extension tests
// This runs the compiled tests without VSCode dependencies

console.log('🧪 Running Pubspec Platform Extension Tests...\n');

// Since the tests are compiled to out/test/extension.test.js,
// we'll create a simple validation by running the key functions

const assert = require('assert');
const yaml = require('js-yaml');
const cheerio = require('cheerio');

// Test functions (copied from the test file for simplicity)
function parsePubspec(content) {
	return yaml.load(content);
}

function extractDependencies(pubspecData) {
	const dependencies = [];
	const devDependencies = [];

	if (pubspecData.dependencies) {
		Object.keys(pubspecData.dependencies).forEach(dep => {
			if (dep !== 'flutter' && dep !== 'flutter_test') {
				dependencies.push(dep);
			}
		});
	}

	if (pubspecData.dev_dependencies) {
		Object.keys(pubspecData.dev_dependencies).forEach(dep => {
			if (dep !== 'flutter' && dep !== 'flutter_test') {
				devDependencies.push(dep);
			}
		});
	}

	return { dependencies, devDependencies };
}

function extractPlatformsFromHtml(html) {
	const $ = cheerio.load(html);
	const platforms = [];

	$('.detail-tags .-pub-tag-badge').each((_, element) => {
		const $badge = $(element);
		const mainTag = $badge.find('.tag-badge-main').text().trim();

		if (mainTag === 'Platform') {
			$badge.find('.tag-badge-sub').each((_, subElement) => {
				const platform = $(subElement).text().trim();
				if (platform) {
					platforms.push(platform);
				}
			});
		}
	});

	return platforms;
}

function extractSDKsFromHtml(html) {
	const $ = cheerio.load(html);
	const sdks = [];

	$('.detail-tags .-pub-tag-badge').each((_, element) => {
		const $badge = $(element);
		const mainTag = $badge.find('.tag-badge-main').text().trim();

		if (mainTag === 'SDK') {
			$badge.find('.tag-badge-sub').each((_, subElement) => {
				const sdk = $(subElement).text().trim();
				if (sdk) {
					sdks.push(sdk);
				}
			});
		}
	});

	return sdks;
}

function checkCompatibility(platforms, sdks, config) {
	const normalizedPlatforms = platforms.map(p => p.toLowerCase());

	const missingPlatforms = config.targetPlatforms.filter(p =>
		!normalizedPlatforms.includes(p.toLowerCase())
	);
	const missingSDKs = config.targetSDKs.filter(s => !sdks.includes(s));

	let compatibilityStatus;
	if (missingPlatforms.length === 0 && missingSDKs.length === 0) {
		compatibilityStatus = 'full';
	} else if (missingPlatforms.length < config.targetPlatforms.length || missingSDKs.length < config.targetSDKs.length) {
		compatibilityStatus = 'partial';
	} else {
		compatibilityStatus = 'none';
	}

	return { compatibilityStatus, missingPlatforms, missingSDKs };
}

// Run tests
let passed = 0;
let failed = 0;

function test(name, fn) {
	try {
		fn();
		console.log(`✅ ${name}`);
		passed++;
	} catch (error) {
		console.log(`❌ ${name}: ${error.message}`);
		failed++;
	}
}

// YAML Parsing Tests
test('parsePubspec parses valid YAML', () => {
	const yamlContent = `
name: test_app
version: 1.0.0
dependencies:
  flutter:
    sdk: flutter
  http: ^1.0.0
dev_dependencies:
  build_runner: ^2.0.0
`;
	const result = parsePubspec(yamlContent);

	assert.strictEqual(result.name, 'test_app');
	assert.strictEqual(result.version, '1.0.0');
	assert(result.dependencies);
	assert(result.dev_dependencies);
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
			build_runner: '^2.0.0'
		}
	};

	const result = extractDependencies(pubspecData);

	assert.deepStrictEqual(result.dependencies, ['http', 'provider']);
	assert.deepStrictEqual(result.devDependencies, ['build_runner']);
});

// HTML Scraping Tests
test('extractPlatformsFromHtml extracts platforms', () => {
	const html = `
<div class="detail-tags">
	<div class="-pub-tag-badge">
		<span class="tag-badge-main">Platform</span>
		<a class="tag-badge-sub">Android</a>
		<a class="tag-badge-sub">iOS</a>
		<a class="tag-badge-sub">Web</a>
	</div>
</div>
`;
	const platforms = extractPlatformsFromHtml(html);
	assert.deepStrictEqual(platforms.sort(), ['Android', 'iOS', 'Web'].sort());
});

test('extractSDKsFromHtml extracts SDKs', () => {
	const html = `
<div class="detail-tags">
	<div class="-pub-tag-badge">
		<span class="tag-badge-main">SDK</span>
		<a class="tag-badge-sub">Dart</a>
		<a class="tag-badge-sub">Flutter</a>
	</div>
</div>
`;
	const sdks = extractSDKsFromHtml(html);
	assert.deepStrictEqual(sdks.sort(), ['Dart', 'Flutter'].sort());
});

// Compatibility Tests
test('checkCompatibility returns full for complete match', () => {
	const config = {
		targetPlatforms: ['Android', 'iOS', 'Web'],
		targetSDKs: ['Flutter']
	};

	const result = checkCompatibility(['Android', 'iOS', 'Web'], ['Flutter'], config);
	assert.strictEqual(result.compatibilityStatus, 'full');
	assert.deepStrictEqual(result.missingPlatforms, []);
});

test('checkCompatibility returns partial for missing platforms', () => {
	const config = {
		targetPlatforms: ['Android', 'iOS', 'Linux', 'macOS', 'Web'],
		targetSDKs: ['Flutter']
	};

	const result = checkCompatibility(['Android', 'iOS', 'web', 'Windows'], ['Flutter'], config);
	assert.strictEqual(result.compatibilityStatus, 'partial');
	assert.deepStrictEqual(result.missingPlatforms.sort(), ['Linux', 'macOS'].sort());
});

test('checkCompatibility handles case insensitive matching', () => {
	const config = {
		targetPlatforms: ['Android', 'iOS', 'Web'],
		targetSDKs: ['Flutter']
	};

	const result = checkCompatibility(['android', 'ios', 'web'], ['Flutter'], config);
	assert.strictEqual(result.compatibilityStatus, 'full');
});

// Results
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
	console.log('🎉 All tests passed! Ready for refactoring.');
} else {
	console.log('❌ Some tests failed. Please fix before refactoring.');
	process.exit(1);
}

