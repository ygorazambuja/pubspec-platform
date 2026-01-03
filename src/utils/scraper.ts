import * as https from 'https';
import * as cheerio from 'cheerio';
import { PackagePlatformInfo, CompatibilityConfig } from './types';
import { checkCompatibility } from './compatibility';

/**
 * Fetches package information from pub.dev and extracts platform data
 * @param packageName The name of the package to fetch
 * @param config The compatibility configuration
 * @returns Promise resolving to package platform info
 */
export async function fetchPackagePlatformInfo(packageName: string, config: CompatibilityConfig): Promise<PackagePlatformInfo> {
	const url = `https://pub.dev/packages/${packageName}`;

	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				try {
					const platforms = extractPlatformsFromHtml(data);
					const sdks = extractSDKsFromHtml(data);
					const compatibilityInfo = checkCompatibility(platforms, sdks, config);
					resolve({
						name: packageName,
						platforms,
						sdks,
						...compatibilityInfo
					});
				} catch (error) {
					reject(error);
				}
			});
		}).on('error', (error) => {
			reject(error);
		});
	});
}

/**
 * Extracts supported platforms from pub.dev HTML
 * @param html The HTML content from pub.dev
 * @returns Array of supported platforms
 */
export function extractPlatformsFromHtml(html: string): string[] {
	const $ = cheerio.load(html);
	const platforms: string[] = [];

	// Find the Platform section in the detail-tags
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

/**
 * Extracts supported SDKs from pub.dev HTML
 * @param html The HTML content from pub.dev
 * @returns Array of supported SDKs
 */
export function extractSDKsFromHtml(html: string): string[] {
	const $ = cheerio.load(html);
	const sdks: string[] = [];

	// Find the SDK section in the detail-tags
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
