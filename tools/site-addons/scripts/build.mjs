import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { load } from 'cheerio';

const generated = '_site-addons';
const escape = text => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === generated || entry.name === 'node_modules') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}
function lines(text, width, count) {
  const result = [];
  let line = '';
  for (const char of text.replace(/\s+/g, ' ').trim()) {
    line += char;
    if (Array.from(line).length >= width) { result.push(line); line = ''; }
  }
  if (line) result.push(line);
  const visible = result.slice(0, count);
  if (result.length > count) visible[count - 1] = visible[count - 1].slice(0, -1) + '…';
  return visible;
}

// Runs on an existing static build output. It never edits the site's source tree.
export async function build({ siteDir, siteUrl, analyticsToken = '' }) {
  const base = new URL(siteUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.search || base.hash) throw new Error('siteUrl must be an HTTP(S) base URL');
  if (analyticsToken && !/^[a-f0-9]{32}$/i.test(analyticsToken)) throw new Error('Invalid CF_WEB_ANALYTICS_TOKEN');
  const root = path.resolve(siteDir);
  const files = await walk(root);
  const result = { pages: 0, convertedImages: 0, analytics: analyticsToken ? 'configured' : 'BLOCKED: CF_WEB_ANALYTICS_TOKEN missing' };
  const variants = new Map();
  for (const file of files.filter(f => /\.(png|jpe?g)$/i.test(f))) {
    const info = await sharp(file).metadata();
    if (info.pages > 1) continue; // Preserve animation; never flatten it silently.
    for (const format of ['avif', 'webp']) {
      // Retain the full original filename to avoid collisions between x.png and x.jpg.
      const output = `${file}.${format}`;
      await sharp(file)[format]({ quality: format === 'avif' ? 55 : 80 }).toFile(output);
    }
    variants.set(file, true);
    result.convertedImages++;
  }
  await mkdir(path.join(root, generated, 'og'), { recursive: true });
  for (const file of files.filter(f => /\.html$/i.test(f))) {
    const $ = load(await readFile(file, 'utf8'));
    const title = $('title').first().text().trim();
    if (!title) throw new Error(`Page is missing a title: ${path.relative(root, file)}`);
    const description = $('meta[name="description"]').attr('content') || '';
    const relative = path.relative(root, file).split(path.sep).join('/');
    const id = createHash('sha256').update(relative).digest('hex').slice(0, 16);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#fff"/><g font-family="sans-serif" fill="#111">${lines(title, 26, 3).map((s, i) => `<text x="64" y="${130 + i * 70}" font-size="52">${escape(s)}</text>`).join('')}${lines(description, 55, 3).map((s, i) => `<text x="64" y="${405 + i * 40}" font-size="26">${escape(s)}</text>`).join('')}</g></svg>`;
    const ogPath = `${generated}/og/${id}.png`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(root, ogPath));
    const ogUrl = new URL(ogPath, base.href.endsWith('/') ? base : `${base}/`).href;
    for (const [property, content] of Object.entries({ 'og:image': ogUrl, 'og:image:width': '1200', 'og:image:height': '630', 'og:image:type': 'image/png' })) {
      $(`meta[property="${property}"]`).remove();
      $('head').append($('<meta>').attr({ property, content }));
    }
    for (const element of $('img').toArray()) {
      const img = $(element);
      if (img.closest('picture').length || img.attr('srcset')) continue;
      const src = img.attr('src');
      if (!src || /^(?:[a-z]+:|\/\/|#)/i.test(src)) continue;
      let local;
      try {
        local = decodeURIComponent(src.split(/[?#]/)[0]);
      } catch { continue; }
      const imagePath = local.startsWith('/') ? path.join(root, local) : path.resolve(path.dirname(file), local);
      if (!variants.has(imagePath)) continue;
      const suffix = src.slice(src.split(/[?#]/)[0].length);
      const original = src.split(/[?#]/)[0];
      img.wrap('<picture data-site-addons="image"></picture>');
      const picture = img.parent();
      for (const format of ['avif', 'webp']) picture.append($('<source>').attr({ type: `image/${format}`, srcset: `${original}.${format}${suffix}` }));
      picture.append(img); // source elements precede the original fallback.
    }
    $('script[data-site-addons="analytics"]').remove();
    if (analyticsToken && !$('script[src*="static.cloudflareinsights.com/beacon.min.js"]').length) {
      $('body').append($('<script>').attr({ defer: '', src: 'https://static.cloudflareinsights.com/beacon.min.js', 'data-site-addons': 'analytics', 'data-cf-beacon': JSON.stringify({ token: analyticsToken }) }));
    }
    await writeFile(file, $.html());
    result.pages++;
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [siteDir, siteUrl] = process.argv.slice(2);
  if (!siteDir || !siteUrl) throw new Error('Usage: npm run build -- <static-build-directory> <site-base-url>');
  console.log(JSON.stringify(await build({ siteDir, siteUrl, analyticsToken: process.env.CF_WEB_ANALYTICS_TOKEN || '' }), null, 2));
}
