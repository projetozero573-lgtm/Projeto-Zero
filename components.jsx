import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  MapPin,
  X,
  Mail,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Link, api, request, dateLabel } from './lib.jsx';
export function Brand({ small = false }) {
  return (
    <Link
      to="/"
      className={'brand ' + (small ? 'small' : '')}
      aria-label="Entre Brasil, página inicial"
    >
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="5.5" strokeLinecap="round">
          <path d="M24 5v38M5 24h38M10.5 10.5l27 27M10.5 37.5l27-27" />
        </g>
      </svg>
      <span>
        entre<span className="brand-heavy">brasil</span>
        <i />
      </span>
    </Link>
  );
}
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      [...ref.current.querySelectorAll('button,input,select,textarea,a[href]')].filter(
        (el) => !el.disabled,
      );
    focusable()[0]?.focus();
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const els = focusable(),
          first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key);
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={'modal ' + (wide ? 'wide' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-top">
          <span className="eyebrow">ENTRE BRASIL</span>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function Newsletter({ onClose }) {
  const [email, setEmail] = useState(''),
    [consent, setConsent] = useState(false),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api('/newsletter', request('POST', { email, consent }));
      setStatus(data.message);
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="O Brasil na sua caixa de entrada." onClose={onClose}>
      <div className="newsletter-icon">
        <Mail size={28} />
      </div>
      <p className="muted">Uma seleção do que importa, de Norte a Sul. Sem ruído, com contexto.</p>
      <form onSubmit={submit}>
        <label>
          Seu e-mail
          <input
            required
            type="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="check-label">
          <input
            required
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Quero receber a newsletter e concordo com o uso do meu e-mail para essa finalidade.
        </label>
        <button className="primary full" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : <Mail size={18} />} Quero me conectar
        </button>
      </form>
      {status && (
        <p className="form-message" role="status">
          {status}
        </p>
      )}
      <p className="fine-print">
        Seu e-mail é armazenado apenas para a newsletter. O disparo depende da ativação de um
        serviço de envio.
      </p>
    </Modal>
  );
}
export function Auth({ onClose, onAuth }) {
  const [register, setRegister] = useState(false),
    [form, setForm] = useState({ email: '', password: '', name: '' }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await api('/auth/' + (register ? 'register' : 'login'), request('POST', form));
      onAuth(user);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={register ? 'Sua leitura, do seu jeito.' : 'Bom ter você por aqui.'}
      onClose={onClose}
    >
      <p className="muted">
        Entre para sincronizar suas matérias favoritas e continuar sua leitura.
      </p>
      <form onSubmit={submit}>
        {register && (
          <label>
            Nome
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
        )}
        <label>
          E-mail
          <input
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Senha
          <input
            required
            type="password"
            minLength={register ? 12 : 1}
            autoComplete={register ? 'new-password' : 'current-password'}
            placeholder={register ? 'No mínimo 12 caracteres' : 'Sua senha'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        <button className="primary full" disabled={busy}>
          {busy ? <Loader2 size={18} className="spin" /> : null}
          {register ? 'Criar conta' : 'Entrar'}
          <ArrowRight size={17} />
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
      <button
        className="text-button full"
        onClick={() => {
          setRegister(!register);
          setError('');
        }}
      >
        {register ? 'Já tenho uma conta' : 'Ainda não tem conta? Cadastre-se'}
      </button>
    </Modal>
  );
}
export function SaveButton({ article, favorites, onSave, light = false }) {
  const saved = favorites.includes(article.id);
  return (
    <button
      className={'save-button ' + (light ? 'light ' : '') + (saved ? 'saved' : '')}
      aria-label={saved ? 'Remover dos favoritos' : 'Salvar matéria'}
      title={saved ? 'Remover dos favoritos' : 'Salvar para ler depois'}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSave(article.id);
      }}
    >
      <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
export function NewsCard({ article: a, favorites, onSave }) {
  return (
    <article className="news-card">
      <div className="card-image">
        <Link to={'/noticia/' + a.slug} tabIndex={-1} aria-hidden="true">
          <img
            src={a.image || '/images/rio.jpg'}
            alt={'Fotografia ilustrativa para a matéria: ' + a.title}
            loading="lazy"
            onError={(e) => (e.currentTarget.src = '/images/rio.jpg')}
          />
        </Link>
        <span className="image-region">
          <MapPin size={11} />
          {a.region}
        </span>
        <SaveButton article={a} favorites={favorites} onSave={onSave} />
      </div>
      <div className="card-copy">
        <div className="card-eyebrow">
          <span>{a.category}</span>
          <span className="tiny-dot" />
          {a.state}
        </div>
        <Link to={'/noticia/' + a.slug}>
          <h3>{a.title}</h3>
        </Link>
        <p>{a.summary}</p>
        <div className="card-bottom">
          <span>
            {dateLabel(a.published_at)} <span className="separator">·</span>{' '}
            {Math.max(3, Math.ceil(a.content.length / 1000))} min de leitura
          </span>
          <Link to={'/noticia/' + a.slug} aria-label={'Ler ' + a.title}>
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function Empty({
  title = 'Nenhuma notícia por aqui, ainda.',
  text = 'Tente outra combinação de filtros ou explore uma nova região.',
  onReset,
}) {
  return (
    <div className="empty">
      <SearchIllustration />
      <h3>{title}</h3>
      <p>{text}</p>
      {onReset && (
        <button className="secondary" onClick={onReset}>
          Limpar filtros <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
function SearchIllustration() {
  return (
    <svg width="65" height="65" viewBox="0 0 65 65" aria-hidden="true">
      <circle cx="27" cy="27" r="19" fill="var(--tint)" stroke="var(--accent)" strokeWidth="2" />
      <path
        d="M42 42l15 15M18 23h18M18 30h12"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Digest({ articles, onClose }) {
  return (
    <Modal title="Seu Brasil em poucos minutos." onClose={onClose}>
      <div className="ai-tag">
        <Sparkles size={14} /> Panorama editorial
      </div>
      <p className="muted">
        Uma visão rápida dos conteúdos disponíveis. Resumos originais, sem consulta a um modelo
        externo.
      </p>
      <div className="digest-list">
        {articles.slice(0, 4).map((a) => (
          <Link onClick={onClose} to={'/noticia/' + a.slug} key={a.id}>
            <span className="eyebrow">
              {a.region} · {a.category}
            </span>
            <h3>{a.title}</h3>
            <p>{a.summary}</p>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
      <p className="fine-print">
        Conteúdos demonstrativos não representam fatos atuais. A IA de classificação está disponível
        no painel editorial.
      </p>
    </Modal>
  );
}
export function RegionMap({ index }) {
  return (
    <svg viewBox="0 0 100 105" className="region-map" aria-hidden="true">
      <defs>
        <clipPath id={'brazil-' + index}>
          <path d="M12 14L28 18 35 11 41 14 42 5 50 13 60 14 63 23 72 21 77 28 87 29 92 40 84 49 81 60 71 68 68 78 57 81 55 91 44 100 36 88 39 77 31 69 23 70 21 53 9 47 5 33 12 27Z" />
        </clipPath>
      </defs>
      <g clipPath={'url(#brazil-' + index + ')'} fill="currentColor">
        <path d="M0 0H100V105H0Z" opacity=".12" />
        {index === 0 ? (
          <path d="M0 0H68L65 43 47 51 21 49 0 45Z" />
        ) : index === 1 ? (
          <path d="M68 0H100V68L65 58 59 39Z" />
        ) : index === 2 ? (
          <path d="M21 49L47 51 65 43 65 65 49 77 31 69Z" />
        ) : index === 3 ? (
          <path d="M65 58L100 68 100 81 57 81 49 77 65 65Z" />
        ) : (
          <path d="M31 69L49 77 57 81 55 105H27Z" />
        )}
      </g>
    </svg>
  );
}
