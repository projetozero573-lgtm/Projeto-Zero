import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Share2,
  Clock,
  MapPin,
  Sparkles,
  Plus,
  Minus,
  Check,
  ChevronDown,
} from 'lucide-react';
import { api, Link, fullDate, navigate } from './lib.jsx';
import { NewsCard, Empty } from './components.jsx';
export default function Article({ slug, favorites, onSave, notify }) {
  const [article, setArticle] = useState(null),
    [related, setRelated] = useState([]),
    [error, setError] = useState(''),
    [size, setSize] = useState(20),
    [summary, setSummary] = useState(false);
  useEffect(() => {
    let cancel = false;
    setArticle(null);
    setError('');
    setSummary(false);
    api('/articles/' + slug)
      .then((a) => {
        if (cancel) return;
        setArticle(a);
        document.title = a.title + ' | Entre Brasil';
        api('/articles?region=' + encodeURIComponent(a.region) + '&limit=5')
          .then((d) => {
            if (!cancel) setRelated(d.articles.filter((x) => x.id !== a.id).slice(0, 3));
          })
          .catch(() => {});
      })
      .catch((e) => {
        if (!cancel) setError(e.message);
      });
    return () => {
      cancel = true;
    };
  }, [slug]);
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: article.title, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        notify('Link copiado. Boas histórias são para compartilhar.');
      }
    } catch (e) {
      if (e.name !== 'AbortError') notify('Copie o endereço da matéria na barra do navegador.');
    }
  }
  if (error)
    return (
      <main id="main-content" className="container">
        <Empty title={error} />
        <Link className="secondary" to="/">
          Voltar ao Brasil
        </Link>
      </main>
    );
  if (!article)
    return (
      <main id="main-content" className="container article-skeleton">
        <div className="skeleton-card">
          <span />
          <span />
          <div />
        </div>
      </main>
    );
  const a = article;
  return (
    <main id="main-content" className="container article-page">
      <div className="breadcrumb">
        <Link to="/">Brasil</Link>
        <span>/</span>
        <Link
          to={
            '/regiao/' +
            a.region
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .replace(' ', '-')
          }
        >
          {a.region}
        </Link>
        <span>/</span>
        <span>{a.category}</span>
      </div>
      <div className="article-header">
        <span className="eyebrow">
          {a.category} <span className="separator">/</span> {a.state}
        </span>
        <h1>{a.title}</h1>
        <p className="article-deck">{a.summary}</p>
        <div className="article-byline">
          <div className="author-icon">
            e<span>✳</span>
          </div>
          <div>
            <strong>{a.source}</strong>
            <p>
              <time dateTime={a.published_at}>{fullDate(a.published_at)}</time> <span>·</span>{' '}
              <Clock size={12} />5 min de leitura
            </p>
          </div>
          <div className="article-tools">
            <button
              className={'secondary ' + (favorites.includes(a.id) ? 'active' : '')}
              onClick={() => onSave(a.id)}
            >
              <Bookmark size={16} fill={favorites.includes(a.id) ? 'currentColor' : 'none'} />
              {favorites.includes(a.id) ? 'Salva' : 'Salvar'}
            </button>
            <button className="secondary" onClick={share}>
              <Share2 size={16} />
              <span>Compartilhar</span>
            </button>
          </div>
        </div>
      </div>
      <figure className="article-figure">
        <img
          src={a.image}
          alt={'Fotografia ilustrativa para a matéria: ' + a.title}
          onError={(e) => (e.currentTarget.src = '/images/rio.jpg')}
        />
        <figcaption>
          <span>
            <MapPin size={12} />
            Local da matéria: {a.city}, {a.state}
          </span>
          <span>Imagem ilustrativa · consulte os créditos em docs/IMAGENS.md</span>
        </figcaption>
      </figure>
      <div className="article-layout">
        <aside className="article-side">
          <span className="eyebrow">SUA LEITURA</span>
          <div className="font-controls">
            <button onClick={() => setSize(Math.max(16, size - 2))} aria-label="Diminuir fonte">
              <Minus size={15} />
            </button>
            <span>Aa</span>
            <button onClick={() => setSize(Math.min(28, size + 2))} aria-label="Aumentar fonte">
              <Plus size={15} />
            </button>
          </div>
          <button
            className="summary-button"
            onClick={() => setSummary(!summary)}
            aria-expanded={summary}
          >
            <Sparkles size={16} />
            Leitura rápida
            <ChevronDown size={14} />
          </button>
          <p>
            Contexto para entender.
            <br />
            Tempo para refletir.
          </p>
          <div className="side-line" />
        </aside>
        <div className="article-body" style={{ fontSize: size }}>
          {a.is_demo === 1 && (
            <div className="article-demo">
              <strong>Conteúdo demonstrativo</strong>
              <p>
                Este texto apresenta os recursos do portal. Não é uma reportagem factual e não
                representa um acontecimento real.
              </p>
            </div>
          )}
          {summary && (
            <div className="reading-summary">
              <div className="eyebrow">
                <Sparkles size={14} /> EM POUCAS PALAVRAS
              </div>
              <p>{a.summary}</p>
              <span>Resumo editorial. Não representa verificação de fatos por IA.</span>
            </div>
          )}
          {a.content.split(/\n\n+/).map((p, i) => (
            <p key={i} className={i === 0 ? 'first-paragraph' : ''}>
              {p}
            </p>
          ))}
          {a.source_url && (
            <a
              className="source-link"
              href={a.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ler matéria completa na fonte original <ArrowUpRight size={18} />
            </a>
          )}
          <div className="article-end-mark">✳</div>
          <div className="article-bottom-line">
            <span className="muted">Uma história de {a.region} para todo o Brasil.</span>
            <button className="text-button" onClick={share}>
              Compartilhar <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="related-section">
          <div className="section-heading">
            <h2>
              Continue por perto<span className="green-period">.</span>
            </h2>
            <Link
              className="text-button"
              to={
                '/regiao/' +
                a.region
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .toLowerCase()
                  .replace(' ', '-')
              }
            >
              Mais da região <ArrowRightIcon />
            </Link>
          </div>
          <div className="news-grid related-grid">
            {related.map((a) => (
              <NewsCard key={a.id} article={a} favorites={favorites} onSave={onSave} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M2 8h12M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
