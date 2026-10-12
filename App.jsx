import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Sun,
  Moon,
  Mail,
  Bookmark,
  User,
  Menu,
  X,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
  MapPin,
  Clock,
  Globe,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { api, request, Link, navigate, usePath, dateLabel } from './lib.jsx';
import {
  Brand,
  Newsletter,
  Auth,
  NewsCard,
  SaveButton,
  Empty,
  Digest,
  RegionMap,
  Modal,
} from './components.jsx';
import Article from './Article.jsx';
import Admin from './Admin.jsx';
export default function App() {
  const path = usePath();
  const [meta, setMeta] = useState({ regions: [], states: [], categories: [], settings: {} }),
    [user, setUser] = useState(null),
    [theme, setTheme] = useState(document.documentElement.dataset.theme || 'light'),
    [modal, setModal] = useState(''),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState(''),
    [favorites, setFavorites] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem('eb-favorites') || '[]');
      } catch {
        return [];
      }
    });
  const [query, setQuery] = useState(''),
    [searchInput, setSearchInput] = useState(''),
    [category, setCategory] = useState('all'),
    [state, setState] = useState('all'),
    [date, setDate] = useState('all'),
    [sort, setSort] = useState('recent'),
    [filters, setFilters] = useState(false),
    [page, setPage] = useState(1),
    [result, setResult] = useState({ articles: [], total: 0, pages: 0 }),
    [trending, setTrending] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const region = path.startsWith('/regiao/')
    ? meta.regions.find((r) => r.slug === path.split('/')[2])
    : null;
  const isSaved = path === '/favoritos';
  const isHome = path === '/' || !!region || isSaved;
  const invalidRegion = path.startsWith('/regiao/') && !region && meta.regions.length > 0;
  function notify(t) {
    setToast(t);
  }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const refreshMeta = () => api('/meta').then(setMeta);
  useEffect(() => {
    refreshMeta().catch((e) => setError(e.message));
    api('/auth/me')
      .then(setUser)
      .catch(() => {});
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('eb-theme', theme);
  }, [theme]);
  useEffect(() => {
    if (user)
      api('/favorites')
        .then((ids) =>
          setFavorites((prev) => {
            const merged = [...new Set([...prev, ...ids])];
            for (const id of prev)
              if (!ids.includes(id)) api('/favorites/' + id, request('POST', {})).catch(() => {});
            return merged;
          }),
        )
        .catch(() => {});
  }, [user?.id]);
  useEffect(() => {
    localStorage.setItem('eb-favorites', JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    setCategory('all');
    setState('all');
    setDate('all');
    setQuery('');
    setSearchInput('');
    setPage(1);
    setMenu(false);
  }, [path]);
  useEffect(() => {
    setPage(1);
  }, [category, state, date, sort, query]);
  useEffect(() => {
    if (!isHome) return;
    let canceled = false;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ limit: '12', page: String(page), sort });
    if (region) params.set('region', region.name);
    if (category !== 'all') params.set('category', category);
    if (state !== 'all') params.set('state', state);
    if (date !== 'all') params.set('date', date);
    if (query) params.set('q', query);
    if (isSaved) params.set('favorites', favorites.join(',') || 'none');
    api('/articles?' + params)
      .then((data) => {
        if (!canceled) setResult(data);
      })
      .catch((e) => {
        if (!canceled) setError(e.message);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [
    isHome,
    region?.name,
    category,
    state,
    date,
    sort,
    query,
    page,
    isSaved,
    favorites.join(','),
  ]);
  useEffect(() => {
    api(
      '/articles?sort=popular&limit=4' +
        (region ? '&region=' + encodeURIComponent(region.name) : ''),
    )
      .then((d) => setTrending(d.articles))
      .catch(() => {});
  }, [region?.name]);
  useEffect(() => {
    document.title = region
      ? `${region.name} | Entre Brasil`
      : isSaved
        ? 'Suas favoritas | Entre Brasil'
        : 'Entre Brasil — O Brasil acontece aqui.';
  }, [path, region?.name]);
  async function save(id) {
    const saved = favorites.includes(id);
    setFavorites((prev) => (saved ? prev.filter((x) => x !== id) : [...prev, id]));
    notify(
      saved
        ? 'Matéria removida dos favoritos.'
        : 'Matéria salva. Seu próximo encontro com o Brasil.',
    );
    if (user)
      try {
        await api('/favorites/' + id, request(saved ? 'DELETE' : 'POST', {}));
      } catch (e) {
        setFavorites((prev) => (saved ? [...prev, id] : prev.filter((x) => x !== id)));
        notify(e.message);
      }
  }
  async function logout() {
    await api('/auth/logout', request('POST', {}));
    setUser(null);
    notify('Você saiu da sua conta.');
  }
  function reset() {
    setCategory('all');
    setState('all');
    setDate('all');
    setSort('recent');
    setQuery('');
    setSearchInput('');
    setPage(1);
  }
  function search(e) {
    e.preventDefault();
    if (!isHome) {
      navigate('/');
      setTimeout(() => setQuery(searchInput.trim()), 50);
    } else setQuery(searchInput.trim());
    document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const filtered = category !== 'all' || state !== 'all' || date !== 'all' || !!query || isSaved;
  const hero = result.articles.find((a) => a.featured) || result.articles[0];
  const latest = filtered ? result.articles : result.articles.filter((a) => a.id !== hero?.id);
  const dateText = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <>
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <div className="topbar">
        <div className="container">
          <span>
            <span className="live-dot" /> Jornalismo que conecta o Brasil
          </span>
          <span className="top-date">{dateText}</span>
          <span className="top-right">
            <Globe size={12} /> 5 regiões. Muitas histórias.
          </span>
        </div>
      </div>
      <header>
        <div className="masthead container">
          <div className="brand-wrap">
            <Brand />
            <span className="brand-subtitle">O BRASIL DE PERTO. A INFORMAÇÃO POR INTEIRO.</span>
          </div>
          <div className="masthead-actions">
            <button
              className="icon-button theme-toggle"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
              title="Alternar tema"
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <span className="vertical-divider" />
            <Link className={'header-saved ' + (isSaved ? 'active' : '')} to="/favoritos">
              <Bookmark size={17} />
              <span>Salvas</span>
              {favorites.length > 0 && <b>{favorites.length}</b>}
            </Link>
            {user ? (
              <div className="user-menu">
                <button
                  className="icon-button"
                  title={user.name}
                  onClick={() => setModal('account')}
                  aria-label="Minha conta"
                >
                  <User size={19} />
                </button>
              </div>
            ) : (
              <button className="login-button" onClick={() => setModal('auth')}>
                <User size={17} />
                <span>Entrar</span>
              </button>
            )}
            <button className="primary newsletter-button" onClick={() => setModal('newsletter')}>
              <Mail size={16} />
              <span>Receba a newsletter</span>
              <ArrowUpRight size={15} />
            </button>
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir navegação"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <div className={'navigation-wrap ' + (menu ? 'open' : '')}>
          <div className="container navigation">
            <nav aria-label="Regiões do Brasil">
              <Link to="/" className={path === '/' ? 'active' : ''}>
                <span className="nav-home-dot" />
                Brasil
              </Link>
              {meta.regions.map((r) => (
                <Link
                  key={r.id}
                  to={'/regiao/' + r.slug}
                  className={region?.slug === r.slug ? 'active' : ''}
                >
                  {r.name}
                </Link>
              ))}
            </nav>
            <form className="search-field" onSubmit={search} role="search">
              <Search size={16} />
              <input
                aria-label="Buscar notícias, cidades e estados"
                placeholder="Encontre seu Brasil..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput ? (
                <button aria-label="Buscar" type="submit">
                  <ArrowRight size={16} />
                </button>
              ) : (
                <span className="search-hint">Buscar</span>
              )}
            </form>
          </div>
        </div>
      </header>
      {path === '/admin' ? (
        <Admin
          user={user}
          meta={meta}
          refreshMeta={refreshMeta}
          onLogin={() => setModal('auth')}
          notify={notify}
        />
      ) : path.startsWith('/noticia/') ? (
        <Article slug={path.split('/')[2]} favorites={favorites} onSave={save} notify={notify} />
      ) : isHome ? (
        <main id="main-content" className="container home-main">
          <section className="page-intro">
            <div>
              <div className="eyebrow">
                <span className="mini-line" />
                {isSaved
                  ? 'SUA SELEÇÃO, SEU TEMPO'
                  : region
                    ? 'UM OLHAR PARA A NOSSA REGIÃO'
                    : 'DE NORTE A SUL, O QUE IMPORTA'}
              </div>
              <h1>
                {isSaved ? (
                  <>
                    Histórias para <em>guardar.</em>
                  </>
                ) : region ? (
                  <>
                    O{' '}
                    {region.name === 'Norte' ||
                    region.name === 'Nordeste' ||
                    region.name === 'Sudeste' ||
                    region.name === 'Sul'
                      ? ''
                      : 'coração do '}
                    <em>{region.name}.</em>
                  </>
                ) : (
                  <>
                    O Brasil acontece <em>aqui.</em>
                  </>
                )}
              </h1>
              <p>
                {isSaved
                  ? 'Um lugar para voltar às leituras que fazem sentido para você.'
                  : region
                    ? region.description
                    : 'Histórias que aproximam. Informação que faz a diferença.'}
              </p>
            </div>
            <div className="edition-note">
              <span className="edition-number">
                {region ? 'DA SUA REGIÃO' : 'UM PAÍS, MUITAS VOZES'}
              </span>
              <span>
                <MapPin size={14} />
                {region
                  ? meta.states.filter((s) => s.region === region.name).length +
                    ' estados · um novo olhar'
                  : '27 unidades federativas. Um só lugar.'}
              </span>
            </div>
          </section>
          <div className="category-bar">
            <div className="category-tabs" role="group" aria-label="Categorias">
              <button
                className={category === 'all' ? 'selected' : ''}
                onClick={() => setCategory('all')}
              >
                Para você
              </button>
              {meta.categories.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  className={category === c.name ? 'selected' : ''}
                  onClick={() => setCategory(c.name)}
                >
                  {c.name}
                </button>
              ))}
              <div className="more-category">
                <select
                  aria-label="Mais categorias"
                  value={meta.categories.slice(8).some((c) => c.name === category) ? category : ''}
                  onChange={(e) => {
                    if (e.target.value) setCategory(e.target.value);
                  }}
                >
                  <option value="">Mais</option>
                  {meta.categories.slice(8).map((c) => (
                    <option key={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} />
              </div>
            </div>
            <button
              className={'filter-button ' + (filters ? 'selected' : '')}
              onClick={() => setFilters(!filters)}
              aria-expanded={filters}
            >
              <SlidersHorizontal size={15} />
              <span>Filtros</span>
              {(state !== 'all' || date !== 'all') && <i />}
            </button>
          </div>
          {filters && (
            <div className="filters-panel">
              <label>
                Estado
                <select value={state} onChange={(e) => setState(e.target.value)}>
                  <option value="all">Todos os estados</option>
                  {meta.states
                    .filter((s) => !region || s.region === region.name)
                    .map((s) => (
                      <option key={s.id}>{s.name}</option>
                    ))}
                </select>
              </label>
              <label>
                Período
                <select value={date} onChange={(e) => setDate(e.target.value)}>
                  <option value="all">Qualquer data</option>
                  <option value="day">Últimas 24 horas</option>
                  <option value="week">Últimos 7 dias</option>
                  <option value="month">Últimos 30 dias</option>
                </select>
              </label>
              <label>
                Ordenar por
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="recent">Mais recentes</option>
                  <option value="relevance">Relevância</option>
                  <option value="popular">Mais lidas</option>
                </select>
              </label>
              <button className="text-button" onClick={reset}>
                Limpar filtros <X size={14} />
              </button>
            </div>
          )}
          {error && (
            <div className="error-panel" role="alert">
              {error}
              <button className="secondary" onClick={() => location.reload()}>
                Tentar novamente
              </button>
            </div>
          )}
          {!filtered && hero && (
            <section className="hero-grid" aria-label="Destaques">
              <article className="hero-card">
                <img
                  src={hero.image}
                  alt="Vista panorâmica ilustrativa da região em destaque"
                  fetchPriority="high"
                />
                <div className="hero-shade" />
                <span className="hero-label">
                  <span /> O BRASIL EM PERSPECTIVA
                </span>
                <SaveButton article={hero} favorites={favorites} onSave={save} light />
                <div className="hero-copy">
                  <div className="hero-meta">
                    <span>{hero.category}</span>
                    <span>•</span>
                    <span>{hero.region}</span>
                  </div>
                  <Link to={'/noticia/' + hero.slug}>
                    <h2>{hero.title}</h2>
                  </Link>
                  <p>{hero.summary}</p>
                  <div className="hero-bottom">
                    <span>
                      Por Redação Entre Brasil <span>·</span> 5 min de leitura
                    </span>
                    <Link
                      to={'/noticia/' + hero.slug}
                      className="hero-read"
                      aria-label="Ler destaque"
                    >
                      <ArrowUpRight size={24} />
                    </Link>
                  </div>
                </div>
                <div className="image-credit">FOTOGRAFIA ILUSTRATIVA</div>
              </article>
              <aside className="trending">
                <div className="section-heading">
                  <h2>
                    Em alta<span className="green-period">.</span>
                  </h2>
                  <span className="live-label">
                    <i />
                    AGORA
                  </span>
                </div>
                <ol>
                  {trending.map((a, i) => (
                    <li key={a.id}>
                      <span className="trend-number">0{i + 1}</span>
                      <div>
                        <span className="trend-category">
                          {a.category} <span>· {a.region}</span>
                        </span>
                        <Link to={'/noticia/' + a.slug}>
                          <h3>{a.title}</h3>
                        </Link>
                        <span className="trend-time">
                          <Clock size={11} /> {Math.max(3, Math.ceil(a.content.length / 1000))} min
                          de leitura
                        </span>
                      </div>
                      <ArrowUpRight size={14} className="trend-arrow" />
                    </li>
                  ))}
                </ol>
                <button className="digest-button" onClick={() => setModal('digest')}>
                  <span className="digest-symbol">
                    <Sparkles size={18} />
                  </span>
                  <span>
                    <strong>Seu Brasil em 2 minutos</strong>
                    <small>Um panorama para o seu dia</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              </aside>
            </section>
          )}
          <section className="latest-section" id="latest">
            <div className="section-heading">
              <div className="heading-with-label">
                <h2>
                  {query
                    ? 'Resultados da busca'
                    : isSaved
                      ? 'Suas favoritas'
                      : category !== 'all'
                        ? category
                        : 'O Brasil, agora'}
                  <span className="green-period">.</span>
                </h2>
                <span className="heading-caption">
                  {query
                    ? '“' + query + '”'
                    : filtered
                      ? 'Um olhar mais perto do que interessa.'
                      : 'As últimas histórias, de todos os cantos.'}
                </span>
              </div>
              <div className="latest-actions">
                <span className="news-count">
                  {result.total} {result.total === 1 ? 'história' : 'histórias'}
                </span>
                <select
                  aria-label="Ordenação das notícias"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="recent">Mais recentes</option>
                  <option value="relevance">Mais relevantes</option>
                  <option value="popular">Mais lidas</option>
                </select>
              </div>
            </div>
            {loading && !result.articles.length ? (
              <div className="skeleton-grid">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-card">
                    <div />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : !latest.length ? (
              <Empty
                title={isSaved ? 'As boas histórias merecem ser guardadas.' : undefined}
                text={
                  isSaved ? 'Toque no marcador de uma matéria para encontrá-la aqui.' : undefined
                }
                onReset={filtered && !isSaved ? reset : undefined}
              />
            ) : (
              <>
                <div className={'news-grid ' + (loading ? 'loading' : '')}>
                  {latest.map((a) => (
                    <NewsCard key={a.id} article={a} favorites={favorites} onSave={save} />
                  ))}
                </div>
                {result.pages > 1 && (
                  <div className="pagination">
                    <button
                      className="secondary"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft size={16} />
                      Anterior
                    </button>
                    <span>
                      Página {page} de {result.pages}
                    </span>
                    <button
                      className="secondary"
                      disabled={page === result.pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Próxima
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
            {filtered && !isSaved && (
              <button className="clear-filter" onClick={reset}>
                <X size={14} /> Voltar a todas as histórias
              </button>
            )}
          </section>
          {!isSaved && (
            <>
              <section className="regions-section">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">CADA CANTO, UMA HISTÓRIA</span>
                    <h2>
                      Um Brasil para explorar<span className="green-period">.</span>
                    </h2>
                  </div>
                  <span className="region-caption">
                    Encontre a informação que está perto de você <ArrowDownIcon />
                  </span>
                </div>
                <div className="region-grid">
                  {meta.regions.map((r, i) => (
                    <Link key={r.id} to={'/regiao/' + r.slug} className={'region-card region-' + i}>
                      <div className="region-top">
                        <span>0{i + 1}</span>
                        <ArrowUpRight size={18} />
                      </div>
                      <RegionMap index={i} />
                      <h3>{r.name}</h3>
                      <p>
                        {meta.states.filter((s) => s.region === r.name).length}{' '}
                        {r.name === 'Centro-Oeste' ? 'unidades federativas' : 'estados'}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
              <section className="newsletter-banner">
                <div className="banner-art" aria-hidden="true">
                  <Mail size={58} strokeWidth={1} />
                  <svg viewBox="0 0 48 48">
                    <path
                      d="M24 4v40M4 24h40M10 10l28 28M10 38l28-28"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                  </svg>
                </div>
                <div>
                  <span className="eyebrow">BONS ENCONTROS COMEÇAM COM BOAS HISTÓRIAS</span>
                  <h2>Mais Brasil. Menos ruído.</h2>
                  <p>Uma seleção cuidadosa do que importa, direto no seu e-mail.</p>
                </div>
                <button className="banner-button" onClick={() => setModal('newsletter')}>
                  Quero receber a newsletter <ArrowUpRight size={18} />
                </button>
              </section>
            </>
          )}
          <div className="demo-note">
            <span className="mini-dot" />
            <span>
              Edição demonstrativa · Conteúdos e fotografias ilustrativos. Integrações reais
              disponíveis no painel editorial.
            </span>
          </div>
        </main>
      ) : (
        <main id="main-content" className="container">
          <Empty
            title={
              invalidRegion ? 'Região não encontrada.' : 'Este caminho ainda não tem uma história.'
            }
            text="Volte à página inicial e explore o Brasil com a gente."
          />
          <Link to="/" className="primary">
            Ir para o início <ArrowRight size={16} />
          </Link>
        </main>
      )}
      <footer>
        <div className="container">
          <div className="footer-top">
            <div>
              <Brand small />
              <p>{meta.settings.tagline || 'O Brasil de perto. A informação por inteiro.'}</p>
            </div>
            <div className="footer-links">
              <Link to="/">Brasil</Link>
              <Link to="/favoritos">Minhas leituras</Link>
              <button onClick={() => setModal('newsletter')}>Newsletter</button>
              <Link to="/admin">
                Painel editorial <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} {meta.settings.site_name || 'Entre Brasil'}. Conexões que
              fazem a diferença.
            </span>
            <div>
              <button onClick={() => setModal('about')}>Sobre o projeto</button>
              <span>·</span>
              <button onClick={() => setModal('privacy')}>Privacidade</button>
              <span className="footer-made">
                FEITO PARA TODOS OS BRASIS <span>✳</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
      {modal === 'newsletter' && <Newsletter onClose={() => setModal('')} />}{' '}
      {modal === 'auth' && <Auth onClose={() => setModal('')} onAuth={setUser} />}{' '}
      {modal === 'digest' && <Digest articles={trending} onClose={() => setModal('')} />}{' '}
      {modal === 'account' && (
        <Modal title={'Olá, ' + user?.name.split(' ')[0] + '.'} onClose={() => setModal('')}>
          <p className="muted">{user?.email}</p>
          <div className="account-links">
            <Link className="secondary" to="/favoritos" onClick={() => setModal('')}>
              <Bookmark size={17} />
              Minhas leituras
            </Link>
            {user?.role === 'admin' && (
              <Link className="secondary" to="/admin" onClick={() => setModal('')}>
                <Settings size={17} />
                Painel editorial
              </Link>
            )}
            <button
              className="text-button"
              onClick={() => {
                logout();
                setModal('');
              }}
            >
              <LogOut size={17} />
              Sair da conta
            </button>
          </div>
        </Modal>
      )}
      {modal === 'about' && (
        <Modal title="Todos os Brasis cabem aqui." onClose={() => setModal('')}>
          <p>
            O Entre Brasil é um portal editorial independente em estrutura de demonstração. Um
            espaço para aproximar histórias, pessoas e perspectivas das cinco regiões do país.
          </p>
          <p>
            Os textos de exemplo não são reportagens reais. Notícias de provedores externos passam
            por revisão editorial antes de serem publicadas.
          </p>
          <p className="muted">
            Classificação assistida por IA, curadoria humana e fontes visíveis. Informação com
            responsabilidade.
          </p>
        </Modal>
      )}
      {modal === 'privacy' && (
        <Modal title="Sua privacidade importa." onClose={() => setModal('')}>
          <p>
            O tema e os favoritos de visitantes são armazenados neste navegador. Com uma conta, seus
            favoritos são sincronizados no banco do portal.
          </p>
          <p>
            O cadastro utiliza nome, e-mail e senha protegida por hash. Um cookie essencial mantém
            sua sessão por até 12 horas. O e-mail da newsletter é armazenado mediante seu
            consentimento.
          </p>
          <p>
            Este projeto não utiliza cookies publicitários. Conteúdos enviados ao assistente
            editorial podem ser processados pelo provedor de IA configurado pela equipe.
          </p>
          <p className="muted">
            Antes do lançamento público, o operador deve informar controlador, contato para direitos
            LGPD, prazos de retenção e política completa.
          </p>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-dot" />
          {toast}
          <button onClick={() => setToast('')} aria-label="Dispensar">
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
function ArrowDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 3v12M4 10l5 5 5-5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
