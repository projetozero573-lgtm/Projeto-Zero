import { test, expect } from '@playwright/test';
test('Página inicial com destaques, notícias e regiões', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.hero-card')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'O Brasil acontece aqui.' })).toBeVisible();
  await expect(page.locator('.region-card')).toHaveCount(5);
  await expect(page.locator('.news-card').first()).toBeVisible();
  expect(errors).toEqual([]);
});
test('Região e categoria filtram o acervo', async ({ page }) => {
  await page.goto('/regiao/nordeste');
  await expect(page.locator('.hero-card')).toBeVisible();
  await page.getByRole('button', { name: 'Cultura', exact: true }).click();
  await expect(page.locator('.news-card')).toHaveCount(1);
  await expect(page.locator('.news-card')).toContainText('A cultura que vem da rua');
});
test('Busca completa sem acentos', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Buscar notícias, cidades e estados' }).fill('sao paulo');
  await page.getByRole('textbox', { name: 'Buscar notícias, cidades e estados' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Resultados da busca.' })).toBeVisible();
  await expect(page.locator('.news-card').first()).toContainText('São Paulo');
});
test('Tema escuro persistido e favoritos locais', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero-card')).toBeVisible();
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.hero-card').getByRole('button', { name: 'Salvar matéria' }).click();
  await page.goto('/favoritos');
  await expect(page.locator('.news-card')).toHaveCount(1);
  await page.locator('.news-card').getByRole('button', { name: 'Remover dos favoritos' }).click();
  await expect(page.locator('.empty')).toBeVisible();
});
test('Leitura, resumo e tamanho de fonte', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero-card')).toBeVisible();
  await page.locator('.hero-card h2').click();
  await expect(page.locator('.article-body')).toBeVisible();
  await expect(page.locator('.article-demo')).toBeVisible();
  await page.getByRole('button', { name: 'Leitura rápida' }).click();
  await expect(page.locator('.reading-summary')).toBeVisible();
  await page.getByRole('button', { name: 'Aumentar fonte' }).click();
  await expect(page.locator('.article-body')).toHaveCSS('font-size', '22px');
});
test('Responsividade em celular e tablet sem overflow', async ({ page }) => {
  for (const width of [360, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.locator('.hero-card')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Buscar notícias, cidades e estados' }),
  ).toBeVisible();
});
test('Painel administrativo, IA local e publicação de rascunho', async ({ page }) => {
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.ADMIN_EMAIL || 'admin@entrebrasil.local');
  await page
    .getByLabel('Senha', { exact: true })
    .fill(process.env.ADMIN_PASSWORD || 'EntreBrasil!2026');
  await page.getByRole('dialog').getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Painel editorial.' })).toBeVisible();
  await page.getByRole('button', { name: 'Nova notícia' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Título', { exact: true }).fill('Teste de interface: educação na Bahia');
  await dialog.getByLabel('Resumo', { exact: true }).fill('Resumo editorial de teste.');
  await dialog
    .getByLabel('Texto da matéria')
    .fill('Uma escola na Bahia ensina educação e cuidado com o ambiente.');
  await dialog.getByRole('button', { name: 'Analisar', exact: true }).click();
  await expect(dialog.locator('.analysis-result')).toBeVisible();
  await dialog.getByRole('button', { name: 'Aplicar sugestões' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Região', exact: true })).toHaveValue(
    'Nordeste',
  );
  await dialog.getByRole('button', { name: 'Salvar matéria' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Buscar no painel' }).fill('Teste de interface');
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Excluir Teste de interface: educação na Bahia' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remover', exact: true }).click();
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(0);
});
