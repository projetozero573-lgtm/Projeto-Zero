import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { slugify, regions, stateGroups } from '../data.js';
const temp = mkdtempSync(join(tmpdir(), 'entre-brasil-test-'));
const base = 'http://127.0.0.1:3099/api';
let server,
  cookie = '',
  logs = '',
  article;
async function call(path, method = 'GET', body, auth = false) {
  const r = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: await r.json(), cookie: r.headers.get('set-cookie') };
}
before(async () => {
  server = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '3099',
      NODE_ENV: 'test',
      DATABASE_PATH: join(temp, 'test.sqlite'),
      JWT_SECRET: 'test-secret-at-least-thirty-two-characters-long',
      ADMIN_EMAIL: 'test@example.com',
      ADMIN_PASSWORD: 'A-secure-test-password-2026',
      AI_API_KEY: '',
      NEWS_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (s) => (logs += s));
  server.stderr.on('data', (s) => (logs += s));
  for (let i = 0; i < 60; i++) {
    try {
      const r = await call('/health');
      if (r.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(logs);
});
after(async () => {
  server?.kill();
  await new Promise((r) => {
    if (server?.exitCode !== null) return r();
    server?.once('exit', r);
  });
  rmSync(temp, { recursive: true, force: true });
});
test('URLs amigáveis e 27 unidades federativas', () => {
  assert.equal(slugify('Educação: São Paulo!'), 'educacao-sao-paulo');
  assert.equal(regions.length, 5);
  assert.equal(Object.values(stateGroups).flat().length, 27);
});
test('Saúde da API e taxonomias iniciais', async () => {
  assert.equal((await call('/health')).data.status, 'ok');
  const { data } = await call('/meta');
  assert.equal(data.regions.length, 5);
  assert.equal(data.states.length, 27);
  assert.equal(data.categories.length, 12);
});
test('Conteúdos publicados e paginação', async () => {
  const { data } = await call('/articles?limit=4');
  assert.equal(data.total, 18);
  assert.equal(data.articles.length, 4);
  assert.equal(data.pages, 5);
  assert.ok(data.articles.every((a) => a.status === 'published'));
});
test('Busca sem acentos e filtros geográficos', async () => {
  const { data } = await call('/articles?q=sao%20paulo');
  assert.ok(data.total >= 1);
  const r = await call('/articles?region=Nordeste&state=Bahia&category=Cultura');
  assert.ok(r.data.articles.length >= 1);
  assert.ok(
    r.data.articles.every(
      (a) => a.region === 'Nordeste' && a.state === 'Bahia' && a.category === 'Cultura',
    ),
  );
});
test('Administrador protegido e login incorreto rejeitado', async () => {
  assert.equal((await call('/admin/articles')).status, 403);
  assert.equal(
    (await call('/auth/login', 'POST', { email: 'test@example.com', password: 'wrong' })).status,
    401,
  );
});
test('Login com cookie HttpOnly e sessão válida', async () => {
  const r = await call('/auth/login', 'POST', {
    email: 'test@example.com',
    password: 'A-secure-test-password-2026',
  });
  assert.equal(r.status, 200);
  assert.match(r.cookie, /HttpOnly/);
  cookie = r.cookie.split(';')[0];
  assert.equal((await call('/auth/me', 'GET', null, true)).data.role, 'admin');
});
test('Classificação local transparente e sem provedor', async () => {
  const r = await call(
    '/admin/ai',
    'POST',
    {
      title: 'Educação e escola na Bahia',
      content: 'Uma escola promove educação em Salvador, Bahia.',
    },
    true,
  );
  assert.equal(r.status, 200);
  assert.equal(r.data.region, 'Nordeste');
  assert.equal(r.data.state, 'Bahia');
  assert.equal(r.data.category, 'Educação');
  assert.equal(r.data.provider, 'local');
  assert.equal(r.data.review_required, true);
});
test('Criação de rascunho e proteção de estados', async () => {
  article = {
    title: 'Teste editorial único 2026',
    summary: 'Resumo de teste.',
    content: 'Texto de teste.\n\nSegundo parágrafo.',
    category: 'Educação',
    region: 'Nordeste',
    state: 'Bahia',
    city: 'Salvador',
    image: '/images/rio.jpg',
    source: 'Testes',
    source_url: '',
    status: 'draft',
    featured: 0,
    relevance: 50,
    is_demo: 0,
    published_at: new Date().toISOString(),
  };
  const invalid = await call('/admin/articles', 'POST', { ...article, state: 'São Paulo' }, true);
  assert.equal(invalid.status, 400);
  const r = await call('/admin/articles', 'POST', article, true);
  assert.equal(r.status, 201);
  article.id = r.data.id;
  assert.equal((await call('/articles?q=Teste%20editorial')).data.total, 0);
});
test('Duplicações bloqueadas e publicação disponível no portal', async () => {
  assert.equal((await call('/admin/articles', 'POST', article, true)).status, 409);
  article.status = 'published';
  assert.equal((await call('/admin/articles/' + article.id, 'PUT', article, true)).status, 200);
  const r = await call('/articles?q=Teste%20editorial');
  assert.equal(r.data.total, 1);
  assert.equal((await call('/articles/teste-editorial-unico-2026')).status, 200);
});
test('Favoritos sincronizados por usuário', async () => {
  assert.equal((await call('/favorites/' + article.id, 'POST', {}, true)).status, 200);
  assert.ok((await call('/favorites', 'GET', null, true)).data.includes(article.id));
  await call('/favorites/' + article.id, 'DELETE', {}, true);
  assert.ok(!(await call('/favorites', 'GET', null, true)).data.includes(article.id));
});
test('Newsletter exige consentimento explícito', async () => {
  assert.equal(
    (await call('/newsletter', 'POST', { email: 'reader@example.com', consent: false })).status,
    400,
  );
  assert.equal(
    (await call('/newsletter', 'POST', { email: 'reader@example.com', consent: true })).status,
    200,
  );
});
test('Categorias podem ser criadas, editadas e removidas', async () => {
  assert.equal(
    (await call('/admin/taxonomy/categories', 'POST', { name: 'Teste categoria' }, true)).status,
    201,
  );
  const c = (await call('/meta')).data.categories.find((x) => x.name === 'Teste categoria');
  assert.equal(
    (await call('/admin/taxonomy/categories/' + c.id, 'PUT', { name: 'Categoria alterada' }, true))
      .status,
    200,
  );
  assert.equal((await call('/admin/taxonomy/categories/' + c.id, 'DELETE', {}, true)).status, 200);
});
test('Configurações persistidas e importação sem chave explicada', async () => {
  await call('/admin/settings', 'PUT', { tagline: 'Texto de teste' }, true);
  assert.equal((await call('/meta')).data.settings.tagline, 'Texto de teste');
  const r = await call('/admin/import', 'POST', {}, true);
  assert.equal(r.status, 502);
  assert.match(r.data.error, /NEWS_API_KEY/);
});
test('Exclusão e logout removem acesso', async () => {
  assert.equal((await call('/admin/articles/' + article.id, 'DELETE', {}, true)).status, 200);
  assert.equal((await call('/articles/teste-editorial-unico-2026')).status, 404);
  assert.equal((await call('/auth/logout', 'POST', {}, true)).status, 200);
});
