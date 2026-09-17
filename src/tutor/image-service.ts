import dns from 'node:dns/promises';
import logger from '../utils/logger.js';

export interface EducationalImageResult {
  id: string;
  fileId: string;
  title: string;
  description: string;
  sourceUrl: string;
  sourceDomain?: string;
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * SSRF Guard: Verifies that an IP or hostname is strictly public
 * and not loopback, private RFC 1918, link-local, or cloud metadata.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // Normalize IPv6 mapped IPv4 e.g. ::ffff:127.0.0.1
  const cleanIp = ip.replace(/^::ffff:/, '');

  // IPv4 checks
  const parts = cleanIp.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    const [p0, p1] = parts;
    if (p0 === 127) return true; // Loopback
    if (p0 === 10) return true;  // Private 10.0.0.0/8
    if (p0 === 172 && p1 !== undefined && p1 >= 16 && p1 <= 31) return true; // Private 172.16.0.0/12
    if (p0 === 192 && p1 === 168) return true; // Private 192.168.0.0/16
    if (p0 === 169 && p1 === 254) return true; // Link-local / Cloud metadata (AWS/GCP/Azure)
    if (p0 === 0) return true;   // Current network
    return false;
  }

  // IPv6 checks
  const lower = cleanIp.toLowerCase();
  if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }

  return false;
}

/**
 * Validates a URL against SSRF vulnerabilities before fetching.
 */
export async function validateSafeUrl(targetUrl: string): Promise<URL> {
  const parsed = new URL(targetUrl);

  if (parsed.protocol !== 'https:') {
    throw new Error(`SSRF Guard: Insecure protocol "${parsed.protocol}". Only HTTPS is allowed.`);
  }

  const hostname = parsed.hostname;
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error(`SSRF Guard: Hostname "${hostname}" is restricted.`);
  }

  // Check if hostname is an IP literal
  if (isPrivateOrReservedIp(hostname)) {
    throw new Error(`SSRF Guard: IP address "${hostname}" is private/reserved.`);
  }

  // Resolve hostname via DNS to verify target IP is public
  try {
    const addresses = await dns.resolve(hostname);
    for (const addr of addresses) {
      if (isPrivateOrReservedIp(addr)) {
        throw new Error(`SSRF Guard: Hostname "${hostname}" resolves to private IP "${addr}".`);
      }
    }
  } catch (err: any) {
    if (err.message.includes('SSRF Guard')) throw err;
    logger.warn(`DNS resolution check non-fatal warning for ${hostname}:`, err.message);
  }

  return parsed;
}

/**
 * Fetches an image securely with SSRF checks, MIME verification, and size caps.
 * Uses browser-grade headers so image CDNs (e.g., Pinterest pinimg, Vecteezy, etc.) allow downloads.
 */
export async function fetchSafeImageDataUrl(imageUrl: string): Promise<{ dataUrl: string; mimeType: string; bufferSize: number }> {
  const parsed = await validateSafeUrl(imageUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': `${parsed.protocol}//${parsed.hostname}/`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP fetch failed with status ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    const matchedMime = validMimes.find(m => contentType.toLowerCase().includes(m)) ||
      (imageUrl.match(/\.png(\?|$)/i) ? 'image/png' :
       imageUrl.match(/\.jpe?g(\?|$)/i) ? 'image/jpeg' :
       imageUrl.match(/\.webp(\?|$)/i) ? 'image/webp' :
       imageUrl.match(/\.svg(\?|$)/i) ? 'image/svg+xml' : '');

    if (!matchedMime) {
      throw new Error(`Invalid image content-type: "${contentType}". Only JPEG, PNG, WEBP, and SVG allowed.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Enforce 5MB limit
    const MAX_BYTES = 5 * 1024 * 1024;
    if (buffer.length > MAX_BYTES) {
      throw new Error(`Image size ${buffer.length} bytes exceeds 5MB limit.`);
    }

    const base64 = buffer.toString('base64');
    const dataUrl = `data:${matchedMime};base64,${base64}`;

    return {
      dataUrl,
      mimeType: matchedMime,
      bufferSize: buffer.length,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Normalizes canvas image dimensions proportionally so it fits neatly beside whiteboard diagrams.
 */
function normalizeImageDimensions(origW: number = 420, origH: number = 320, maxW: number = 480, maxH: number = 360): { width: number; height: number } {
  let w = origW || 420;
  let h = origH || 320;
  if (w > maxW) {
    h = Math.round((h * maxW) / w);
    w = maxW;
  }
  if (h > maxH) {
    w = Math.round((w * maxH) / h);
    h = maxH;
  }
  return { width: Math.max(180, w), height: Math.max(140, h) };
}

/**
 * Searches the open web using DuckDuckGo Image Search.
 * Discovers educational diagrams, infographics, and illustrations from Pinterest, blogs, Wikimedia, and open web portals.
 */
export async function searchDuckDuckGoImages(query: string, options?: { preferPinterest?: boolean }): Promise<EducationalImageResult | null> {
  const cleanTopic = query.replace(/[^\w\s-]/gi, ' ').trim().slice(0, 70);
  if (!cleanTopic) return null;

  const searchQuery = options?.preferPinterest || cleanTopic.toLowerCase().includes('pinterest')
    ? `${cleanTopic} diagram site:pinterest.com`
    : `${cleanTopic} diagram OR illustration OR infographic`;

  try {
    const pageResp = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!pageResp.ok) return null;
    const html = await pageResp.text();
    const vqdMatch = html.match(/vqd=([0-9-]+)/) || html.match(/vqd="([^"]+)"/);
    if (!vqdMatch) return null;

    const vqd = vqdMatch[1];
    const imgApiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(searchQuery)}&vqd=${vqd}&f=,,,&p=1`;

    const imgResp = await fetch(imgApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/',
      },
    });

    if (!imgResp.ok) return null;
    const data: any = await imgResp.json();
    const candidates: any[] = Array.isArray(data.results) ? data.results : [];

    for (const item of candidates.slice(0, 6)) {
      const candidateUrl = item.image;
      if (!candidateUrl || !candidateUrl.startsWith('https://')) continue;

      try {
        const { dataUrl, mimeType } = await fetchSafeImageDataUrl(candidateUrl);
        const { width, height } = normalizeImageDimensions(item.width, item.height);
        const fileId = `file_ddg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        
        let host = 'open web';
        try {
          host = new URL(item.url || candidateUrl).hostname.replace(/^www\./, '');
        } catch {}

        return {
          id: `img_${Date.now()}`,
          fileId,
          title: item.title || `${cleanTopic} Real-World Diagram`,
          description: `Authentic diagram of ${cleanTopic} sourced from ${host}.`,
          sourceUrl: candidateUrl,
          sourceDomain: host,
          dataUrl,
          mimeType,
          width,
          height,
        };
      } catch (err: any) {
        logger.debug(`Skipping candidate ${candidateUrl}: ${err.message}`);
        continue;
      }
    }
  } catch (err: any) {
    logger.warn(`DuckDuckGo image search error for "${query}":`, err.message);
  }

  return null;
}

/**
 * Searches Openverse API for open-access CC-licensed educational images across Flickr, Wikimedia, museums, etc.
 */
export async function searchOpenverseImages(query: string): Promise<EducationalImageResult | null> {
  const cleanTopic = query.replace(/[^\w\s-]/gi, ' ').trim().slice(0, 60);
  if (!cleanTopic) return null;

  try {
    const ovResp = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(cleanTopic + ' diagram')}&page_size=5`, {
      headers: {
        'User-Agent': 'GraphicalAITutor/2.0 (Educational AI Tutor; open-search@example.org)',
      },
    });

    if (!ovResp.ok) return null;
    const data: any = await ovResp.json();
    const results: any[] = Array.isArray(data.results) ? data.results : [];

    for (const item of results) {
      const candidateUrl = item.url || item.thumbnail;
      if (!candidateUrl || !candidateUrl.startsWith('https://')) continue;

      try {
        const { dataUrl, mimeType } = await fetchSafeImageDataUrl(candidateUrl);
        const { width, height } = normalizeImageDimensions(item.width, item.height);
        const fileId = `file_ov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        return {
          id: `img_${Date.now()}`,
          fileId,
          title: item.title || `${cleanTopic} Illustration`,
          description: `Educational illustration from Openverse (${item.creator ? `by ${item.creator}` : 'CC Commons'}).`,
          sourceUrl: candidateUrl,
          sourceDomain: 'openverse.org',
          dataUrl,
          mimeType,
          width,
          height,
        };
      } catch (err: any) {
        continue;
      }
    }
  } catch (err: any) {
    logger.warn(`Openverse search error for "${query}":`, err.message);
  }

  return null;
}

/**
 * Searches Wikipedia and Wikimedia Commons for peer-reviewed academic and scientific illustrations.
 */
export async function searchWikipediaAndCommons(query: string): Promise<EducationalImageResult | null> {
  const cleanQuery = query.replace(/[^\w\s-]/gi, ' ').trim().slice(0, 60);
  if (!cleanQuery) return null;

  try {
    // 1. Wikipedia Page Summary
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanQuery.replace(/\s+/g, '_'))}`;
    try {
      const wikiResp = await fetch(wikiUrl, {
        headers: { 'User-Agent': 'GraphicalAITutor/2.0 (Educational AI Tutor)' },
      });
      if (wikiResp.ok) {
        const wikiData: any = await wikiResp.json();
        if (wikiData.thumbnail && wikiData.thumbnail.source) {
          const imgUrl = wikiData.originalimage?.source || wikiData.thumbnail.source;
          const { dataUrl, mimeType } = await fetchSafeImageDataUrl(imgUrl);
          const { width, height } = normalizeImageDimensions(wikiData.thumbnail.width, wikiData.thumbnail.height);
          const fileId = `file_wiki_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

          return {
            id: `img_${Date.now()}`,
            fileId,
            title: wikiData.title || cleanQuery,
            description: wikiData.description || wikiData.extract?.slice(0, 150) || `${cleanQuery} scientific diagram`,
            sourceUrl: imgUrl,
            sourceDomain: 'wikipedia.org',
            dataUrl,
            mimeType,
            width,
            height,
          };
        }
      }
    } catch {}

    // 2. Wikimedia Commons
    const commonsSearchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(cleanQuery + ' diagram OR illustration OR structure')}&gsrlimit=3&prop=imageinfo&iiprop=url|size|mime&format=json&origin=*`;
    const commonsResp = await fetch(commonsSearchUrl, {
      headers: { 'User-Agent': 'GraphicalAITutor/2.0 (Educational AI Tutor)' },
    });

    if (commonsResp.ok) {
      const commonsData: any = await commonsResp.json();
      const pages = commonsData.query?.pages;
      if (pages) {
        for (const pageId of Object.keys(pages)) {
          const page = pages[pageId];
          const info = page.imageinfo?.[0];
          if (info && info.url && (info.mime?.startsWith('image/') || info.url.match(/\.(png|jpe?g|webp|svg)$/i))) {
            try {
              const { dataUrl, mimeType } = await fetchSafeImageDataUrl(info.url);
              const { width, height } = normalizeImageDimensions(info.width, info.height);
              const fileId = `file_commons_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

              return {
                id: `img_${Date.now()}`,
                fileId,
                title: page.title?.replace(/^File:/, '') || cleanQuery,
                description: `${cleanQuery} educational illustration from Wikimedia Commons`,
                sourceUrl: info.url,
                sourceDomain: 'wikimedia.org',
                dataUrl,
                mimeType,
                width,
                height,
              };
            } catch {}
          }
        }
      }
    }
  } catch (err: any) {
    logger.warn(`Wikipedia/Commons search error: ${err.message}`);
  }

  return null;
}

/**
 * Unified Multi-Source Internet Image Discovery Engine:
 * 1. DuckDuckGo Image Search across the entire web (including Pinterest, blogs, educational portals).
 * 2. Openverse API across Flickr, museums, WordPress, Behance.
 * 3. Wikipedia & Wikimedia Commons scientific diagrams.
 *
 * All results undergo SSRF verification, size caps (5MB), and MIME validation.
 */
export async function searchInternetImage(query: string, options?: { preferPinterest?: boolean }): Promise<EducationalImageResult | null> {
  const isPinterestRequested = options?.preferPinterest || /pinterest/i.test(query);

  // 1. DuckDuckGo Open Web Search (queries Pinterest, educational sites, diagrams)
  try {
    const webResult = await searchDuckDuckGoImages(query, { preferPinterest: isPinterestRequested });
    if (webResult) {
      logger.info(`Found open web image for "${query}" from ${webResult.sourceDomain}: ${webResult.title}`);
      return webResult;
    }
  } catch (e: any) {
    logger.warn(`DuckDuckGo image search fallback:`, e.message);
  }

  // 2. Openverse API Search
  try {
    const ovResult = await searchOpenverseImages(query);
    if (ovResult) {
      logger.info(`Found Openverse image for "${query}": ${ovResult.title}`);
      return ovResult;
    }
  } catch (e: any) {
    logger.warn(`Openverse image search fallback:`, e.message);
  }

  // 3. Wikipedia / Wikimedia Commons Search
  try {
    const wikiResult = await searchWikipediaAndCommons(query);
    if (wikiResult) {
      logger.info(`Found Wikipedia/Commons image for "${query}": ${wikiResult.title}`);
      return wikiResult;
    }
  } catch (e: any) {
    logger.warn(`Wikimedia image search fallback:`, e.message);
  }

  return null;
}

/**
 * Backwards compatible alias for existing endpoints and tests.
 */
export const searchEducationalImage = searchInternetImage;
