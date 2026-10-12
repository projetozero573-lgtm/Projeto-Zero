import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from './db.js';
import { slugify } from './data.js';
import { analyze, importNews, normalize } from './services.js';
const app = express();
const production = process.env.NODE_ENV === 'production';
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32)
  throw new Error('Configure JWT_SECRET com ao menos 32 caracteres.');
if (
  production &&
  (/^(development|replace|ci-only|test-secret)/i.test(secret) ||
    process.env.ADMIN_PASSWORD === 'EntreBrasil!2026' ||
    /^replace/i.test(process.env.ADMIN_PASSWORD || ''))
)
  throw new Error('Credenciais de demonstração proibidas em produção.');
if (
  production &&
  db
    .prepare("SELECT password FROM users WHERE role='admin'")
    .all()
    .some((u) => bcrypt.compareSync('EntreBrasil!2026', u.password))
) {
  throw new Error(
    'O banco ainda contém um administrador com senha de demonstração. Rode npm run admin:password.',
  );
}
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(
  helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false, frameguard: false }),
);
app.use(express.json({ limit: '1mb' }));
app.use(
  '/api',
  rateLimit({ windowMs: 60000, limit: 250, standardHeaders: 'draft-8', legacyHeaders: false }),
);
const authLimit = rateLimit({
  windowMs: 15 * 60000,
  limit: 25,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos.' },
});
db.function('normalize', { deterministic: true }, normalize);
app.use((req, res, next) => {
  const token = req.headers.cookie
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('eb_session='))
    ?.slice(11);
  try {
    if (token) req.user = jwt.verify(token, secret);
  } catch {}
  next();
});
const requireUser = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Entre na sua conta para continuar.' });
const requireAdmin = (req, res, next) =>
  req.user?.role === 'admin'
    ? next()
    : res.status(403).json({ error: 'Acesso restrito à equipe editorial.' });
app.use('/api', (req, res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers['sec-fetch-site'] === 'cross-site'
  )
    return res.status(403).json({ error: 'Origem não permitida.' });
  next();
});
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const session = (res, u) => {
  const token = jwt.sign(publicUser(u), secret, { expiresIn: '12h' });
  res.setHeader(
    'Set-Cookie',
    `eb_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200${production ? '; Secure' : ''}`,
  );
};
app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'connected' }));
app.get('/api/meta', (req, res) =>
  res.json({
    regions: db.prepare('SELECT * FROM regions').all(),
    states: db.prepare('SELECT * FROM states ORDER BY name').all(),
    categories: db.prepare('SELECT * FROM categories').all(),
    settings: Object.fromEntries(
      db
        .prepare('SELECT * FROM settings')
        .all()
        .map((s) => [s.key, s.value]),
    ),
  }),
);
app.get('/api/articles', (req, res) => {
  const {
    region,
    category,
    state,
    q,
    date,
    sort = 'recent',
    page = 1,
    limit = 12,
    favorites,
  } = req.query;
  const where = ["status='published'"],
    params = [];
  for (const [k, v] of Object.entries({ region, category, state }))
    if (v && v !== 'all') {
      where.push(`${k}=?`);
      params.push(v);
    }
  if (q) {
    where.push(
      "normalize(title || ' ' || summary || ' ' || content || ' ' || region || ' ' || state || ' ' || city || ' ' || category) LIKE ?",
    );
    params.push('%' + normalize(q).slice(0, 200) + '%');
  }
  if (['day', 'week', 'month'].includes(date)) {
    where.push('published_at>=?');
    params.push(
      new Date(Date.now() - { day: 1, week: 7, month: 30 }[date] * 86400000).toISOString(),
    );
  }
  if (favorites) {
    const ids = String(favorites).split(',').map(Number).filter(Number.isInteger).slice(0, 100);
    if (ids.length) {
      where.push(`id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    } else where.push('0');
  }
  const order =
    { recent: 'published_at DESC', relevance: 'relevance DESC', popular: 'views DESC' }[sort] ||
    'published_at DESC';
  const p = Math.max(1, Number(page) || 1),
    l = Math.max(1, Math.min(50, Number(limit) || 12));
  const clause = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as n FROM articles WHERE ${clause}`).get(...params).n;
  const articles = db
    .prepare(`SELECT * FROM articles WHERE ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...params, l, (p - 1) * l);
  res.json({ articles, total, page: p, pages: Math.ceil(total / l) });
});
app.get('/api/articles/:slug', (req, res) => {
  const a = db
    .prepare("SELECT * FROM articles WHERE slug=? AND status='published'")
    .get(req.params.slug);
  if (!a) return res.status(404).json({ error: 'Matéria não encontrada.' });
  db.prepare('UPDATE articles SET views=views+1 WHERE id=?').run(a.id);
  res.json(a);
});
app.post('/api/auth/login', authLimit, async (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(
    String(req.body.email || '')
      .trim()
      .toLowerCase(),
  );
  if (!u || !(await bcrypt.compare(String(req.body.password || ''), u.password)))
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  session(res, u);
  res.json(publicUser(u));
});
app.post('/api/auth/register', authLimit, async (req, res) => {
  const { email, password, name } = req.body;
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') ||
    !name?.trim() ||
    String(password || '').length < 12
  )
    return res
      .status(400)
      .json({ error: 'Informe nome, e-mail válido e uma senha de no mínimo 12 caracteres.' });
  try {
    const result = db
      .prepare('INSERT INTO users(email,password,name) VALUES(?,?,?)')
      .run(email.trim().toLowerCase(), await bcrypt.hash(password, 12), name.trim().slice(0, 80));
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid);
    session(res, u);
    res.status(201).json(publicUser(u));
  } catch {
    res.status(409).json({ error: 'Este e-mail já possui uma conta.' });
  }
});
app.get('/api/auth/me', (req, res) => res.json(req.user || null));
app.post('/api/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'eb_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0');
  res.json({ ok: true });
});
app.get('/api/favorites', requireUser, (req, res) =>
  res.json(
    db
      .prepare('SELECT article_id FROM favorites WHERE user_id=?')
      .all(req.user.id)
      .map((a) => a.article_id),
  ),
);
app.post('/api/favorites/:id', requireUser, (req, res) => {
  if (!db.prepare("SELECT id FROM articles WHERE id=? AND status='published'").get(req.params.id))
    return res.status(404).json({ error: 'Matéria não encontrada.' });
  db.prepare('INSERT OR IGNORE INTO favorites(user_id,article_id) VALUES(?,?)').run(
    req.user.id,
    req.params.id,
  );
  res.json({ ok: true });
});
app.delete('/api/favorites/:id', requireUser, (req, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id=? AND article_id=?').run(
    req.user.id,
    req.params.id,
  );
  res.json({ ok: true });
});
app.post('/api/newsletter', authLimit, (req, res) => {
  if (!req.body.consent || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email || ''))
    return res
      .status(400)
      .json({ error: 'Informe um e-mail válido e aceite receber a newsletter.' });
  db.prepare('INSERT OR IGNORE INTO newsletter(email) VALUES(?)').run(
    req.body.email.toLowerCase().trim(),
  );
  res.json({
    ok: true,
    message: 'Inscrição registrada! O envio de e-mails será ativado pela equipe editorial.',
  });
});
app.use('/api/admin', requireAdmin);
app.get('/api/admin/stats', (req, res) =>
  res.json({
    articles: db.prepare('SELECT COUNT(*) n FROM articles').get().n,
    published: db.prepare("SELECT COUNT(*) n FROM articles WHERE status='published'").get().n,
    drafts: db.prepare("SELECT COUNT(*) n FROM articles WHERE status='draft'").get().n,
    subscribers: db.prepare('SELECT COUNT(*) n FROM newsletter').get().n,
    ai: !!process.env.AI_API_KEY,
    news: !!process.env.NEWS_API_KEY,
  }),
);
app.get('/api/admin/articles', (req, res) =>
  res.json(db.prepare('SELECT * FROM articles ORDER BY created_at DESC,id DESC').all()),
);
function validateArticle(b) {
  if (!b.title?.trim() || !b.summary?.trim() || !b.content?.trim())
    return 'Título, resumo e texto são obrigatórios.';
  if (
    (b.status === 'published' || b.region) &&
    !db.prepare('SELECT id FROM regions WHERE name=?').get(b.region)
  )
    return 'Selecione uma região válida.';
  if (!db.prepare('SELECT id FROM categories WHERE name=?').get(b.category))
    return 'Selecione uma categoria válida.';
  if (
    b.state &&
    !db.prepare('SELECT id FROM states WHERE name=? AND region=?').get(b.state, b.region)
  )
    return 'Estado não pertence à região selecionada.';
  if (!['draft', 'published'].includes(b.status)) return 'Status inválido.';
  if (!Number.isFinite(Date.parse(b.published_at))) return 'Data inválida.';
  for (const u of [b.image, b.source_url])
    if (u && !/^https?:\/\/\S+$/.test(u) && !(u === b.image && /^\/images\/[\w.-]+$/.test(u)))
      return 'Use URLs http/https válidas ou uma imagem local.';
}
const fields = [
  'title',
  'slug',
  'summary',
  'content',
  'image',
  'category',
  'region',
  'state',
  'city',
  'published_at',
  'source',
  'source_url',
  'status',
  'featured',
  'relevance',
  'is_demo',
];
function articleValues(b) {
  return fields.map((k) =>
    k === 'slug'
      ? slugify(b.title)
      : ['featured', 'is_demo'].includes(k)
        ? Number(!!b[k])
        : k === 'relevance'
          ? Math.max(0, Math.min(100, Number(b[k]) || 50))
          : String(b[k] || '').slice(0, k === 'content' ? 100000 : 2000),
  );
}
app.post('/api/admin/articles', (req, res) => {
  const error = validateArticle(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const r = db
      .prepare(
        `INSERT INTO articles(${fields.join(',')}) VALUES(${fields.map(() => '?').join(',')})`,
      )
      .run(...articleValues(req.body));
    res.status(201).json({ id: r.lastInsertRowid });
  } catch {
    res.status(409).json({ error: 'Uma matéria com este título ou URL de origem já existe.' });
  }
});
app.put('/api/admin/articles/:id', (req, res) => {
  const error = validateArticle(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const r = db
      .prepare(`UPDATE articles SET ${fields.map((k) => k + '=?').join(',')} WHERE id=?`)
      .run(...articleValues(req.body), req.params.id);
    if (!r.changes) return res.status(404).json({ error: 'Matéria não encontrada.' });
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: 'Título ou fonte duplicados.' });
  }
});
app.delete('/api/admin/articles/:id', (req, res) => {
  db.prepare('DELETE FROM articles WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});
app.post('/api/admin/ai', async (req, res) => {
  if (!req.body.title) return res.status(400).json({ error: 'Informe um título para a análise.' });
  try {
    res.json(await analyze(req.body.title, req.body.content || ''));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});
app.post('/api/admin/import', async (req, res) => {
  try {
    res.json(await importNews(String(req.body.query || 'Brasil').slice(0, 150)));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});
const taxonomies = ['categories', 'regions', 'states'];
app.post('/api/admin/taxonomy/:type', (req, res) => {
  const t = req.params.type;
  if (!taxonomies.includes(t)) return res.status(404).json({ error: 'Tipo inválido.' });
  const name = String(req.body.name || '')
    .trim()
    .slice(0, 80);
  if (!name) return res.status(400).json({ error: 'Informe um nome.' });
  try {
    if (t === 'states') {
      if (!db.prepare('SELECT id FROM regions WHERE name=?').get(req.body.region))
        return res.status(400).json({ error: 'Região inválida.' });
      db.prepare('INSERT INTO states(name,region) VALUES(?,?)').run(name, req.body.region);
    } else if (t === 'regions')
      db.prepare('INSERT INTO regions(name,slug,description) VALUES(?,?,?)').run(
        name,
        slugify(name),
        req.body.description || '',
      );
    else db.prepare('INSERT INTO categories(name,slug) VALUES(?,?)').run(name, slugify(name));
    res.status(201).json({ ok: true });
  } catch {
    res.status(409).json({ error: 'Este nome já existe.' });
  }
});
app.put('/api/admin/taxonomy/:type/:id', (req, res) => {
  const t = req.params.type;
  if (!taxonomies.includes(t)) return res.status(404).json({ error: 'Tipo inválido.' });
  const old = db.prepare(`SELECT * FROM ${t} WHERE id=?`).get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Não encontrado.' });
  const name = String(req.body.name || '')
    .trim()
    .slice(0, 80);
  if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
  try {
    db.transaction(() => {
      if (t === 'states') db.prepare('UPDATE states SET name=? WHERE id=?').run(name, old.id);
      else db.prepare(`UPDATE ${t} SET name=?,slug=? WHERE id=?`).run(name, slugify(name), old.id);
      db.prepare(
        `UPDATE articles SET ${{ categories: 'category', regions: 'region', states: 'state' }[t]}=? WHERE ${{ categories: 'category', regions: 'region', states: 'state' }[t]}=?`,
      ).run(name, old.name);
      if (t === 'regions')
        db.prepare('UPDATE states SET region=? WHERE region=?').run(name, old.name);
    })();
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: 'Nome já utilizado.' });
  }
});
app.delete('/api/admin/taxonomy/:type/:id', (req, res) => {
  const t = req.params.type;
  if (!taxonomies.includes(t)) return res.status(404).json({ error: 'Tipo inválido.' });
  const row = db.prepare(`SELECT * FROM ${t} WHERE id=?`).get(req.params.id);
  if (row) {
    const col = { categories: 'category', regions: 'region', states: 'state' }[t];
    if (
      db.prepare(`SELECT id FROM articles WHERE ${col}=? LIMIT 1`).get(row.name) ||
      (t === 'regions' && db.prepare('SELECT id FROM states WHERE region=? LIMIT 1').get(row.name))
    )
      return res
        .status(409)
        .json({ error: 'Há conteúdos ou estados vinculados. Reorganize-os antes de remover.' });
    db.prepare(`DELETE FROM ${t} WHERE id=?`).run(row.id);
  }
  res.json({ ok: true });
});
app.put('/api/admin/settings', (req, res) => {
  for (const key of ['site_name', 'tagline'])
    if (typeof req.body[key] === 'string')
      db.prepare(
        'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      ).run(key, req.body[key].slice(0, 160));
  res.json({ ok: true });
});
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
app.get('/robots.txt', (req, res) =>
  res
    .type('text')
    .send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${process.env.SITE_URL}/sitemap.xml`,
    ),
);
app.get('/sitemap.xml', (req, res) => {
  const base = process.env.SITE_URL || 'http://localhost:5173';
  const paths = [
    '',
    ...db
      .prepare('SELECT slug FROM regions')
      .all()
      .map((r) => '/regiao/' + r.slug),
    ...db
      .prepare("SELECT slug FROM articles WHERE status='published' AND is_demo=0")
      .all()
      .map((a) => '/noticia/' + a.slug),
  ];
  res
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${escape(base + p)}</loc></url>`).join('')}</urlset>`,
    );
});
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));
if (existsSync(resolve('dist/index.html'))) {
  app.use(express.static(resolve('dist'), { index: false, maxAge: '1h' }));
  app.get('/{*path}', (req, res) => {
    let html = readFileSync(resolve('dist/index.html'), 'utf8');
    const slug = req.path.startsWith('/noticia/') ? req.path.split('/')[2] : null;
    const a = slug
      ? db.prepare("SELECT * FROM articles WHERE slug=? AND status='published'").get(slug)
      : null;
    if (slug && !a) return res.status(404).send('Matéria não encontrada.');
    const regionPage = req.path.startsWith('/regiao/')
      ? db.prepare('SELECT * FROM regions WHERE slug=?').get(req.path.split('/')[2])
      : null;
    const title = a
      ? a.title + ' | Entre Brasil'
      : regionPage
        ? regionPage.name + ' | Entre Brasil'
        : 'Entre Brasil — O Brasil acontece aqui.';
    const description = a
      ? a.summary
      : regionPage
        ? regionPage.description
        : 'Jornalismo que conecta o Brasil. Notícias, cultura e informações das cinco regiões.';
    const canonical = (process.env.SITE_URL || '') + req.path;
    const img = a?.image || '/images/rio.jpg';
    const image = img.startsWith('http') ? img : (process.env.SITE_URL || '') + img;
    html = html
      .replace(
        '<!--SEO-->',
        `<meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:image" content="${escape(image)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:type" content="${a ? 'article' : 'website'}"><meta name="twitter:card" content="summary_large_image">${a?.is_demo || ['/admin', '/favoritos'].includes(req.path) ? '<meta name="robots" content="noindex">' : ''}${a && !a.is_demo ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'NewsArticle', headline: a.title, datePublished: a.published_at, image, author: { '@type': 'Organization', name: a.source }, publisher: { '@type': 'Organization', name: 'Entre Brasil' } }).replace(/</g, '\\u003c')}</script>` : ''}`,
      )
      .replace(
        '<title>Entre Brasil — O Brasil acontece aqui.</title>',
        `<title>${escape(title)}</title>`,
      );
    res.send(html);
  });
}
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Não foi possível concluir a operação.' });
});
const port = Number(process.env.PORT) || 3001;
app.listen(port, '0.0.0.0', () => console.log(`Entre Brasil API disponível na porta ${port}`));
