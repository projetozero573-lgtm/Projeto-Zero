# Arquitetura e evolução

## Limites e responsabilidades

O projeto é um monorepo leve. Frontend React consome apenas URLs relativas `/api`; Vite faz proxy em desenvolvimento. Em produção, Express entrega o build e as APIs pela mesma origem, evitando expor hosts internos ao navegador. Configuração e segredos permanecem no servidor.

- **Apresentação:** componentes React, tokens CSS, rotas por History API, fonte/imagem local, estados de carregamento e erros.
- **Aplicação HTTP:** Express, autorização por perfil, validação dos formulários, metadados dinâmicos.
- **Persistência:** SQLite com prepared statements, transações, WAL, chaves estrangeiras e índices.
- **Serviços:** classificação local, adaptador de IA e importação do NewsAPI, independentes do frontend.

## Modelo de dados

`regions`, `states`, `categories`, `articles`, `users`, `favorites`, `newsletter`, `settings` e `migrations`.

Uma matéria armazena o nome das taxonomias, validado na API; a alteração de nomes usa transação para atualizar as referências. Exclusões de taxonomias com vínculos são rejeitadas. Favoritos usam relações reais com cascata na exclusão de usuários/matérias.

O slug do título e a URL original são únicos. Importação e criação editorial rejeitam duplicações exatas; sugestões de similaridade utilizam Jaccard de palavras significativas. Não há embeddings nem armazenamento vetorial nesta versão.

A migração inicial tem versão registrada. Para mudanças futuras, adicione uma migração de versão superior, faça backup e teste contra cópia do banco. Não edite o schema esperando que `CREATE TABLE IF NOT EXISTS` altere tabelas existentes.

## Segurança implementada

- bcrypt (12 rounds); senha de cadastro com mínimo 12 caracteres.
- Sessões JWT de 12h em cookie HttpOnly, SameSite Strict e Secure em produção.
- Segredo obrigatório; bloqueio de credenciais conhecidas de demonstração em produção.
- Permissão administrativa em todos os endpoints `/api/admin`.
- Rate limiting para API, login, cadastro e newsletter.
- Rejeição de mutações com `Sec-Fetch-Site: cross-site`, sem CORS aberto.
- Prepared statements; allowlists de ordenação e taxonomias; validação de URL, estado/região e status.
- Textos renderizados pelo React, sem HTML arbitrário/dangerouslySetInnerHTML.
- Segredos fora do frontend; erros externos sem ecoar chaves.

O proxy é configurado com `trust proxy=1`: ajuste ao número real de proxies e não exponha um backend que possa receber cabeçalhos falsificados diretamente. O CSP e o bloqueio de iframe do Helmet estão desativados para compatibilidade com a prévia incorporada. Antes de publicar, configure CSP estrita para seus próprios assets, imagens autorizadas e scripts de metadados, além de `frame-ancestors` apropriado. JWT não possui revogação individual nesta versão; troque `JWT_SECRET` para revogar todas as sessões.

## IA e integridade editorial

O modelo recebe o texto como dado não confiável e retorna JSON. A aplicação restringe região, estado e categoria às opções conhecidas, limita comprimento e sinaliza revisão. A aplicação final da localização é validada ao salvar, impedindo estado/região incompatíveis. API externa não é prova de veracidade nem imunidade a prompt injection. A equipe deve revisar fatos, direitos e classificação.

Sem API, heurísticas de palavras-chave não identificam todas as localidades. A cidade fica vazia. A importação sem região detectável mantém campo vazio no rascunho; a publicação exige região válida.

## SEO e renderização

Em produção, o Express injeta título, descrição, canonical, OG/Twitter e JSON-LD antes de responder ao acesso direto. O corpo da notícia é renderizado em React. Crawlers sem JavaScript não recebem corpo editorial completo. Para SEO de alto volume, evolua para SSR/prerender ou Next.js mantendo os contratos da API.

As páginas de notícias demonstrativas, `/admin` e `/favoritos` recebem `noindex`. O sitemap inclui home, regiões e somente notícias reais publicadas. Vite é ambiente de desenvolvimento: para avaliar os metadados gerados no servidor, use o build servido pelo Express.

## Acessibilidade e desempenho

Semântica de cabeçalhos, navegação, forms, alt ilustrativo, link de salto, rótulos de ícones, foco visível, Escape/trap/restauração de foco em modais, mensagens com roles e respeito a reduced motion. Fontes são locais; imagens otimizadas; imagens secundárias são lazy. A página não faz chamadas de IA no carregamento.

Não há certificação WCAG. Valide contrastes, zoom 200/400%, leitores de tela, touch targets, navegação de teclado e estados especiais antes de lançamento.

## Escala

SQLite é uma escolha operacional concreta para uma instância e tráfego moderado, não uma promessa de escala horizontal. Próximos passos:

1. Isolar queries em repositories e migrar para PostgreSQL.
2. Busca full-text dedicada/índices trigram ou engine de busca (LIKE atual faz varredura).
3. Jobs e fila para ingestão e IA; cache/CDN; analytics com proteção contra inflar visualizações.
4. Object storage/CDN para upload de mídia; verificações e licenças por asset.
5. Auditoria editorial, RBAC granular, MFA, recuperação de senha e revogação de sessões.
6. SSR, cache de páginas e paginação de acervo administrativo.

A ordenação de popularidade usa `views`: acessos ao endpoint de matéria incrementam o contador. Não é uma métrica auditada de visitantes únicos e inclui atualizações/robôs.