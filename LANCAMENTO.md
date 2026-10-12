# Checklist de lançamento

## Conteúdo e identidade
- [ ] Revisar cada notícia, fonte, localidade e data; remover ou despublicar as 18 demonstrações.
- [ ] Não desmarcar `is_demo` de uma matéria fictícia para apresentá-la como real.
- [ ] Substituir fotos ilustrativas quando a matéria exigir registro do local/fato. Não apresentar imagens de IA como documentação jornalística.
- [ ] Confirmar direitos de uso de textos, fontes de API, imagens e fontes tipográficas.
- [ ] Informar expediente, equipe, contato editorial, política de correções e responsabilidade editorial.

## Segurança
- [ ] ADMIN_PASSWORD e JWT_SECRET fortes e exclusivos; nenhum segredo no Git/frontend.
- [ ] Atualizar senha persistida com `npm run admin:password`; trocar JWT_SECRET para revogar sessões de prévia.
- [ ] HTTPS obrigatório para cookie Secure; domínio e SITE_URL corretos.
- [ ] Ajustar trust proxy ao ambiente; impedir acesso direto não confiável ao backend.
- [ ] Definir CSP e frame-ancestors em produção (desativados para prévia incorporada).
- [ ] Rodar auditoria de dependências, pentest e revisão de limites de uso.
- [ ] Criar MFA, recuperação de senha e revogação individual se forem requisitos do lançamento.

## Persistência e operação
- [ ] Volume persistente para SQLite, uma instância; permissões e backups automáticos.
- [ ] Fazer backup consistente pelo método `db.backup()` ou ferramenta SQLite, não copiar apenas o arquivo principal durante escrita em WAL.
- [ ] Testar restauração, monitorar disco, logs e `/api/health`.
- [ ] Remover demonstrações antes de indexação e validar sitemap, canonical e JSON-LD de notícias reais.
- [ ] Configurar limites/custos e planos de IA/NewsAPI; testar chamadas autenticadas com suas chaves.
- [ ] Conferir localização dos rascunhos importados, sobretudo quando não detectada.
- [ ] Adicionar fila/scheduler apenas se desejar ingestão automática.

## LGPD e newsletter
- [ ] Definir controlador, contato, bases legais, retenção e direitos dos titulares.
- [ ] Implementar exclusão/exportação de conta/dados antes de cadastro público em produção.
- [ ] Conectar provedor de e-mail, confirmar consentimento (double opt-in recomendado), descadastro e gestão de bounces.
- [ ] O cadastro atual registra consentimento, mas não envia e-mails nem oferece descadastro automatizado.
- [ ] Informar processamento de textos por provedores de IA e suas políticas de privacidade.

## Qualidade e SEO
- [ ] `npm test`, `npm run test:e2e`, `npm run build`, `npm run format:check`.
- [ ] Auditoria de acessibilidade (teclado, leitor de tela, contraste, zoom, mobile e estados vazios).
- [ ] Verificação de desempenho em rede móvel lenta e otimização de mídia adicional.
- [ ] Testar compartilhamento social usando URL pública HTTPS.
- [ ] Avaliar SSR/prerender para renderização do corpo editorial sem JavaScript.
- [ ] Para escala horizontal: PostgreSQL, filas, armazenamento compartilhado de sessão/rate limit e object storage.

A entrega é funcional localmente e preparada para configuração e deploy. Este checklist explicita requisitos operacionais e legais que dependem do responsável pelo portal.