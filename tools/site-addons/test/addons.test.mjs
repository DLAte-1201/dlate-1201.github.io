import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { load } from 'cheerio';
import { Miniflare } from 'miniflare';
import worker from '../worker/contact.mjs';
import { build } from '../scripts/build.mjs';

const token = 'a'.repeat(32);
test('static output: OG per page, valid formats, original fallback, analytics, repeat build', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 't5-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'assets'));
  await mkdir(path.join(root, 'nested'));
  const original = await sharp({ create: { width: 64, height: 32, channels: 4, background: '#369' } }).png().toBuffer();
  await writeFile(path.join(root, 'assets', 'test.png'), original);
  const html = '<!doctype html><html lang="ko"><head><title>문의 &amp; Glance</title><meta name="description" content="기존 페이지 설명"></head><body><img alt="existing" src="../assets/test.png?v=1"><img src="https://example.org/a.png"></body></html>';
  await writeFile(path.join(root, 'nested', 'index.html'), html);
  await writeFile(path.join(root, 'index.html'), html.replace('../assets/', '/assets/'));
  const options = { siteDir: root, siteUrl: 'https://example.org/', analyticsToken: token };
  assert.deepEqual(await build(options), { pages: 2, convertedImages: 1, analytics: 'configured' });
  assert.deepEqual(await readFile(path.join(root, 'assets', 'test.png')), original);
  for (const format of ['avif', 'webp']) {
    const meta = await sharp(path.join(root, 'assets', `test.png.${format}`)).metadata();
    assert.equal(meta.width, 64);
    assert.equal(meta.height, 32);
    assert.equal(meta.format, format === 'avif' ? 'heif' : format);
  }
  const ogFiles = await readdir(path.join(root, '_site-addons', 'og'));
  assert.equal(ogFiles.length, 2);
  for (const file of ogFiles) {
    const meta = await sharp(path.join(root, '_site-addons', 'og', file)).metadata();
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 630);
  }
  await build(options);
  const $ = load(await readFile(path.join(root, 'nested', 'index.html'), 'utf8'));
  assert.equal($('title').text(), '문의 & Glance');
  assert.equal($('picture').length, 1);
  assert.deepEqual($('picture').children().map((_, el) => el.tagName).get(), ['source', 'source', 'img']);
  assert.equal($('source').first().attr('srcset'), '../assets/test.png.avif?v=1');
  assert.equal($('picture img').attr('alt'), 'existing');
  assert.equal($('img[src^="https:"]').length, 1);
  assert.equal($('meta[property="og:image"]').length, 1);
  assert.match($('meta[property="og:image"]').attr('content'), /^https:\/\/example.org\/_site-addons\/og\//);
  assert.equal($('script').length, 1);
  assert.equal(JSON.parse($('script').attr('data-cf-beacon')).token, token);
  const result = await build({ siteDir: root, siteUrl: options.siteUrl });
  assert.match(result.analytics, /^BLOCKED/);
  assert.equal(load(await readFile(path.join(root, 'index.html'), 'utf8'))('script').length, 0);
});

test('contact persists JSON and form messages in actual local D1', async t => {
  const mf = new Miniflare({
    modules: true, scriptPath: path.resolve('worker/contact.mjs'),
    compatibilityDate: '2025-10-11', d1Databases: ['CONTACT_DB']
  });
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('CONTACT_DB');
  await db.exec(await readFile('migrations/0001_contact_messages.sql', 'utf8').then(s => s.replace(/\n/g, ' ')));
  const payload = { email: ' test@example.org ', name: "O'Reilly", message: "문의 '); DROP TABLE contact_messages;--" };
  let response = await mf.dispatchFetch('http://localhost/api/contact', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true });
  response = await mf.dispatchFetch('http://localhost/api/contact', { method: 'POST', body: new URLSearchParams(payload) });
  assert.equal(response.status, 201);
  const { results } = await db.prepare('SELECT * FROM contact_messages').all();
  assert.equal(results.length, 2);
  assert.equal(results[0].email, 'test@example.org');
  assert.equal(results[0].message, payload.message);
  assert.equal(results[0].name, payload.name);
  assert.ok(!Number.isNaN(Date.parse(results[0].created_at)));
  assert.notEqual(results[0].id, results[1].id);
});

test('contact errors: invalid input, method, route, missing DB and DB failure', async () => {
  const send = (body, env = {}, headers = { 'content-type': 'application/json' }) => worker.fetch(new Request('https://example.org/api/contact', { method: 'POST', headers, body }), env);
  for (const body of ['null', '{', JSON.stringify({ email: 'bad', message: 'hello' }), JSON.stringify({ email: 'a@b.co', message: ' ' })]) {
    assert.equal((await send(body)).status, 400);
  }
  assert.equal((await send('x', {}, { 'content-type': 'text/plain' })).status, 415);
  const valid = JSON.stringify({ email: 'a@b.co', message: 'hello' });
  assert.equal((await send(valid)).status, 503);
  assert.equal((await send(valid, { CONTACT_DB: { prepare() { throw new Error('private detail'); } } })).status, 503);
  const get = await worker.fetch(new Request('https://example.org/api/contact'), {});
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  assert.equal((await worker.fetch(new Request('https://example.org/unknown'), {})).status, 404);
});
