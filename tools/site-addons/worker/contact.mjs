const json = (body, status, headers = {}) => Response.json(body, { status, headers });

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/api/contact') return json({ error: 'not_found' }, 404);
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
    const type = request.headers.get('content-type')?.split(';')[0].trim();
    let body;
    try {
      if (type === 'application/json') body = await request.json();
      else if (type === 'application/x-www-form-urlencoded' || type === 'multipart/form-data') {
        body = Object.fromEntries(await request.formData());
      } else return json({ error: 'unsupported_media_type' }, 415);
    } catch {
      return json({ error: 'invalid_body' }, 400);
    }
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
        !message || message.length > 10000 || name.length > 200) {
      return json({ error: 'invalid_fields' }, 400);
    }
    if (!env.CONTACT_DB) return json({ error: 'contact_unavailable' }, 503);
    try {
      await env.CONTACT_DB.prepare(
        'INSERT INTO contact_messages (id, email, name, message, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(crypto.randomUUID(), email, name, message, new Date().toISOString()).run();
      return json({ ok: true }, 201);
    } catch {
      return json({ error: 'contact_unavailable' }, 503);
    }
  }
};
