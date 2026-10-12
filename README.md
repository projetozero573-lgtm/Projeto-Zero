# ✳ Entre Brasil

**O Brasil de perto. A informação por inteiro.**

Portal editorial original, inspirado na organização limpa de grandes portais brasileiros. React + Vite no frontend, Express no backend e SQLite persistente. Temas verde/branco e amarelo/preto, cinco regiões, 27 unidades federativas, curadoria assistida e painel editorial.

> Os 18 conteúdos iniciais são demonstrações, não reportagens reais. Fotografias são ilustrativas, algumas geradas por IA. Não publique esta edição como cobertura factual. As APIs de IA e notícias exigem suas próprias chaves e planos. O cadastro de newsletter funciona; o disparo de e-mails não está implementado.

## O que está implementado

- Home com reportagem principal, mais lidas, últimas notícias e exploração das regiões.
- Páginas `/regiao/norte`, `/regiao/nordeste`, `/regiao/centro-oeste`, `/regiao/sudeste` e `/regiao/sul`.
- 12 categorias iniciais: Notícias, Política, Economia, Cultura, Meio Ambiente, Esportes, Tecnologia, Saúde, Educação, Segurança, Tragédias e Entretenimento. Outras podem ser criadas no painel.
- Busca sem acentos em título, resumo, texto, cidade, estado, região e categoria.
- Filtros combináveis por região, estado, categoria e período; ordenação por data, relevância ou visualizações; paginação.
- Matérias com imagem, resumo, texto, localização, data/hora, fonte e link externo quando informado.
- Tema persistido no navegador; layout responsivo; fontes e imagens locais; imagens secundárias com carregamento adiado.
- Favoritos locais para visitantes e sincronizados para leitores autenticados; compartilhamento nativo ou cópia de link.
- Leitura confortável com controle de tamanho de fonte e resumo editorial expansível.
- Registro de leitores e autenticação de leitores/administradores. Cookies HttpOnly, hashes bcrypt e restrição de endpoints administrativos.
- `/admin`: criar, editar, remover, publicar e destacar notícias; editar categorias, regiões e estados; configurar mensagem institucional; importar notícias e usar assistente de classificação.
- Deduplicação por slug normalizado e URL de origem; sugestão de semelhantes via similaridade lexical.
- IA: classificação local sem modelo generativo; adaptador para API compatível com OpenAI com saída JSON validada e timeout.
- Notícias: integração NewsAPI.org; importação de até 20 itens por solicitação, sempre como rascunhos; localização desconhecida fica não classificada.
- Metadados de título, descrição, Open Graph, Twitter Card, canonical e JSON-LD de notícias reais em produção; `/robots.txt` e `/sitemap.xml`. Notícias demonstrativas têm `noindex` e não entram no sitemap.
- Migração inicial idempotente, testes automatizados, CI e arquivos de deploy Docker.

## Requisitos

- Node.js **20.20+** ou **22+**, npm e Git.
- Uma máquina/serviço com disco persistente para o banco.
- Python e compilador C++ podem ser necessários se não houver binário precompilado de `better-sqlite3` para sua plataforma. O Docker inclui esses requisitos no build.

## Instalação local

```bash
npm ci
cp .env.example .env
```

Edite `.env`, escolhendo um e-mail administrativo e uma senha forte com pelo menos 12 caracteres. Gere um segredo de sessão:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Cole o resultado em `JWT_SECRET`. Em seguida:

```bash
npm run dev
```

- Portal: **http://localhost:5173**
- API: **http://localhost:3001/api/health**
- Painel: **http://localhost:5173/admin**

O primeiro início cria o diretório `data/`, o banco, a migração inicial, taxonomias e notícias demonstrativas. `npm run db:seed` verifica essa inicialização sem sobrescrever edições. O administrador é criado a partir de `ADMIN_EMAIL` e `ADMIN_PASSWORD` se ainda não existir.

**Ambiente de prévia fornecido nesta entrega:** `admin@entrebrasil.local` / `EntreBrasil!2026`. São credenciais públicas de demonstração, apenas para exploração local. O projeto recusa inicialização em produção com essa senha ou com o segredo de demonstração. O `.env` da prévia não é incluído no pacote nem no Git.

Para alterar a senha de um administrador já criado, atualize `ADMIN_PASSWORD` no ambiente e rode:

```bash
npm run admin:password
```

Trocar somente a variável não altera a senha já persistida no banco. Troque também `JWT_SECRET` para invalidar sessões existentes imediatamente.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `PORT` | Porta do backend; padrão 3001 |
| `SITE_URL` | URL pública completa para canonical, compartilhamento e sitemap; em produção use HTTPS |
| `DATABASE_PATH` | Caminho SQLite; padrão `./data/entre-brasil.sqlite` |
| `JWT_SECRET` | Segredo de sessão com no mínimo 32 caracteres; obrigatório |
| `ADMIN_EMAIL` | E-mail de criação/alteração do administrador inicial |
| `ADMIN_PASSWORD` | Senha de criação/alteração; mínimo 12 caracteres |
| `AI_API_KEY` | Chave secreta do provedor de IA; opcional |
| `AI_BASE_URL` | Endpoint compatível com OpenAI; padrão `https://api.openai.com/v1` |
| `AI_MODEL` | Modelo; padrão `gpt-4o-mini` |
| `NEWS_API_KEY` | Chave NewsAPI.org; opcional |
| `NEWS_API_URL` | Endpoint do provedor; padrão `https://newsapi.org/v2/everything` |
| `NODE_ENV` | `production` no deploy; habilita cookie Secure e bloqueia credenciais de prévia |

**Nenhuma chave vai para variáveis `VITE_*`, código React ou armazenamento do navegador.** `.env`, dados e credenciais estão fora do Git.

## Fluxo editorial e inteligência artificial

1. Entre em `/admin` com uma conta administrativa.
2. Crie uma notícia ou importe conteúdos em **IA & integrações**.
3. No editor, clique em **Analisar**. Sem chave, o backend usa palavras-chave, estados conhecidos e similaridade de títulos. Com chave, solicita classificação, resumo, cidade e assuntos ao modelo configurado.
4. Veja o resultado e escolha **Aplicar sugestões**. Não há publicação automática nem verificação factual automática.
5. Confira título, resumo, localização, fonte, direitos de reprodução e imagem. Se a localização estiver desconhecida, selecione a região antes de publicar.
6. Salve como rascunho ou publicada. Marque **Destacar na região** para priorizar a matéria no bloco principal.

O adaptador possui limite de conteúdo, timeout de 25s, validação básica do JSON e sinalização de revisão. Custos, políticas de retenção e limites de uso dependem do provedor contratado. O modo local não resolve cidades e não é um modelo de IA. Similaridade lexical não substitui deduplicação semântica.

Na home, **Seu Brasil em 2 minutos** apresenta resumos editoriais já cadastrados; não faz uma chamada a IA externa.

## Integração com notícias

Cadastre `NEWS_API_KEY`, reinicie o backend e use a aba de integrações do painel. A importação é manual, requer permissão administrativa e ignora títulos normalizados/URLs já presentes. Todos os itens começam como rascunhos.

O NewsAPI pode entregar apenas fragmentos do corpo da matéria e seus planos podem restringir o uso em produção. Preserve o link original, confira os termos de licenciamento e não trate o fragmento como texto completo. Não foi feita uma chamada autenticada a provedores externos nesta entrega, pois não foram fornecidas chaves.

## Estrutura

```text
src/
  App.jsx          shell, navegação, filtros, estado do portal
  Article.jsx      leitura e conteúdos relacionados
  Admin.jsx        painel, editor e revisão assistida
  components.jsx   componentes editoriais, modais, autenticação
  lib.jsx          cliente API, navegação e datas
  styles.css       tokens dos temas, layout e responsividade
server/
  index.js         HTTP, autorização, endpoints e metadados
  db.js            schema, índices, migração e bootstrap
  data.js          taxonomias, slugs e fixtures demonstrativas
  services.js      classificação, similares e provedores
  seed.js          inicialização idempotente
  admin-password.js alteração administrativa de senha
  tests/           testes isolados de API e dados
public/
  images/          fotografias ilustrativas otimizadas
  fonts/           DM Sans e DM Serif Display locais
  favicon.svg      símbolo original
 tests/            navegação end-to-end com Playwright
 docs/             arquitetura, API, checklist e créditos
 .github/workflows validação contínua
 Dockerfile, compose.yaml, .env.example
```

Mais detalhes: [Arquitetura](docs/ARQUITETURA.md), [API](docs/API.md), [Checklist de lançamento](docs/LANCAMENTO.md) e [Imagens](docs/IMAGENS.md).

## Testes e qualidade

```bash
npm test                   # 14 testes com banco temporário isolado
npm run build              # compilação de produção
npm run format:check       # padronização do código
npx playwright install --with-deps chromium
npm run test:e2e           # 7 fluxos de navegação
```

Os testes de interface usam as credenciais do ambiente ou as credenciais locais de demonstração. Quando executados contra um portal existente, fazem login e criam/removem uma matéria de teste; prefira um ambiente de desenvolvimento. A CI usa banco próprio e ambiente isolado.

Os fluxos testados incluem filtros, busca, tema persistente, favoritos, leitura, navegação responsiva (360, 390, 768 e 1024px), login administrativo, análise local e CRUD. Não representam uma auditoria formal de acessibilidade, teste de carga ou pentest.

## Build e publicação

```bash
npm run build
npm start
```

O Express serve `dist/` e a API na mesma origem. `npm start` ativa o modo de produção: configure segredos reais e use um domínio HTTPS, pois a sessão usa cookie Secure. O build gera metadados no servidor para os acessos diretos. O corpo editorial é uma SPA React, não um frontend totalmente renderizado no servidor; SSR completo é uma evolução recomendada para portais de grande escala.

### Docker

```bash
docker compose up --build -d
```

Configure `.env` antes. O serviço expõe a porta **3001**, utiliza um volume persistente e executa sem root. Coloque um proxy HTTPS à frente. Defina `SITE_URL=https://seu-dominio.com`. Consulte o healthcheck em `/api/health`.

Pode ser hospedado em uma VM, VPS ou serviço de containers com volume persistente (uma instância). Não publique o SQLite em um ambiente efêmero ou compartilhado por múltiplas réplicas. Para escala horizontal, migre a persistência para PostgreSQL, sessões/limites para um armazenamento compartilhado e imagens para object storage.

## GitHub

Esta entrega possui repositório **Git local com commits**. Não foi criado repositório remoto, pois o conector GitHub não foi disponibilizado na conversa.

Depois de extrair o pacote, se não tiver histórico Git:

```bash
git init -b main
git add .
git commit -m "feat: portal Entre Brasil"
```

Com GitHub CLI autenticado:

```bash
gh auth login
gh repo create entre-brasil --private --source=. --remote=origin --push
```

Ou crie um repositório vazio na sua conta e execute:

```bash
git remote add origin https://github.com/SEU_USUARIO/entre-brasil.git
git push -u origin main
```

Para restaurar o histórico fornecido separadamente:

```bash
git clone entre-brasil.git.bundle entre-brasil
```

Nunca envie `.env`, banco real, inscrições da newsletter ou credenciais. A CI executa testes, build, formatação e fluxos de navegação em cada push/PR.

## Antes do lançamento

Leia o [checklist](docs/LANCAMENTO.md). Troque credenciais, configure APIs, substitua conteúdos de demonstração, valide direitos das imagens, estabeleça backups, adicione política LGPD completa e faça auditoria de segurança/acessibilidade. A newsletter ainda precisa de um provedor de envio e mecanismo de descadastro. Recuperação de senha, MFA, agendamento, upload de mídia, SSR completo e auditoria editorial detalhada são evoluções, não funcionalidades já entregues.
