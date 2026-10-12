# Contrato da API

Base `/api`. JSON UTF-8; sessão em cookie, não em header bearer. Erros retornam `{ "error": "mensagem" }`.

## Público

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/health` | Saúde e conexão com banco |
| GET | `/meta` | Regiões, estados, categorias e configuração institucional |
| GET | `/articles` | Notícias publicadas com filtros e paginação |
| GET | `/articles/:slug` | Matéria completa; incrementa visualizações |
| POST | `/newsletter` | `{email, consent:true}`; guarda consentimento e inscrição |
| POST | `/auth/register` | `{name,email,password}`; conta reader e sessão |
| POST | `/auth/login` | `{email,password}`; sessão HttpOnly |
| GET | `/auth/me` | Usuário público ou null |
| POST | `/auth/logout` | Expira cookie no navegador |

`GET /articles`: parâmetros `region`, `state`, `category`, `q`, `date=day|week|month`, `sort=recent|relevance|popular`, `page`, `limit` (1–50), `favorites` (IDs separados por vírgula). Filtros vazios ou `all` são ignorados. O intervalo de datas é relativo ao relógio do servidor. Retorno `{articles,total,page,pages}`.

```bash
curl 'http://localhost:3001/api/articles?region=Nordeste&category=Cultura&sort=recent'
curl 'http://localhost:3001/api/articles?q=sao%20paulo'
```

## Leitor autenticado

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/favorites` | IDs favoritos do usuário |
| POST | `/favorites/:id` | Salva matéria publicada |
| DELETE | `/favorites/:id` | Remove favorito |

## Administrador

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/admin/stats` | Contagens e estado das integrações, sem segredos |
| GET | `/admin/articles` | Acervo, incluindo rascunhos |
| POST | `/admin/articles` | Cria matéria |
| PUT | `/admin/articles/:id` | Atualiza todos os campos editáveis |
| DELETE | `/admin/articles/:id` | Remove matéria e favoritos relacionados |
| POST | `/admin/ai` | `{title,content}`; classificação, resumo e similares |
| POST | `/admin/import` | `{query}`; importação manual NewsAPI como rascunhos |
| POST | `/admin/taxonomy/:type` | Cria `{name,region?}` |
| PUT | `/admin/taxonomy/:type/:id` | Renomeia `{name}` e propaga vínculos |
| DELETE | `/admin/taxonomy/:type/:id` | Remove somente sem vínculos |
| PUT | `/admin/settings` | `{site_name,tagline}` |

Tipos permitidos: `categories`, `regions`, `states`. Para criar estado, informe `region` válida. Ao renomear um estado não se altera a região de origem.

Campos de matéria: `title`, `summary`, `content`, `image`, `category`, `region`, `state`, `city`, `published_at` (ISO), `source`, `source_url`, `status` (`draft|published`), `featured` (boolean/0/1), `relevance` (0–100), `is_demo` (boolean/0/1). Slug é derivado do título. A publicação exige região e categoria válidas; estado, se informado, deve pertencer à região. URLs aceitam http/https, e `image` também aceita `/images/arquivo.ext`.

Resposta de IA: `{region,state,city,category,summary,topics,relevance,similar,provider,review_required:true}`. `provider=local` indica heurísticas sem chamada generativa, `api` indica provedor externo. O editor decide quando aplicar.

Status: 400 validação, 401 sem sessão de leitor, 403 acesso administrativo negado, 404 não encontrado, 409 duplicação/vínculos, 429 limite de solicitações, 502 indisponibilidade/configuração de provedor.

## Rotas SEO

`GET /sitemap.xml` e `GET /robots.txt` são servidas pelo Express. Em desenvolvimento, o Vite faz proxy dessas rotas.