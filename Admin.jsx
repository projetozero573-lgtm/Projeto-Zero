import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  FileText,
  Eye,
  Pencil,
  Trash2,
  Star,
  Settings,
  Tag,
  Map,
  Globe,
  Sparkles,
  ArrowUpRight,
  Download,
  Loader2,
  Check,
  X,
  Mail,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { api, request, Link, dateLabel } from './lib.jsx';
import { Modal, Empty } from './components.jsx';
const fresh = () => ({
  title: '',
  summary: '',
  content: '',
  category: 'Notícias',
  region: 'Nordeste',
  state: 'Bahia',
  city: '',
  image: '/images/rio.jpg',
  source: 'Redação Entre Brasil',
  source_url: '',
  published_at: new Date().toISOString(),
  status: 'draft',
  featured: 0,
  is_demo: 0,
  relevance: 50,
});
export default function Admin({ user, meta, refreshMeta, onLogin, notify }) {
  const [tab, setTab] = useState('articles'),
    [articles, setArticles] = useState([]),
    [stats, setStats] = useState({}),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState('all'),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [importQuery, setImportQuery] = useState('Brasil'),
    [config, setConfig] = useState(meta.settings),
    [taxType, setTaxType] = useState('categories'),
    [taxEdit, setTaxEdit] = useState(null);
  async function refresh() {
    try {
      const [a, s] = await Promise.all([api('/admin/articles'), api('/admin/stats')]);
      setArticles(a);
      setStats(s);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (user?.role === 'admin') refresh();
  }, [user?.id]);
  useEffect(() => setConfig(meta.settings), [meta.settings]);
  if (!user)
    return (
      <main id="main-content" className="container admin-locked">
        <span className="lock-icon">
          <Lock size={27} />
        </span>
        <span className="eyebrow">ÁREA EDITORIAL</span>
        <h1>
          Onde as histórias
          <br />
          ganham forma.
        </h1>
        <p>
          Entre com sua conta editorial para gerenciar o portal,
          <br />
          revisar notícias e trabalhar com o assistente de curadoria.
        </p>
        <button className="primary" onClick={onLogin}>
          Entrar no painel <ArrowRight size={17} />
        </button>
        <span className="fine-print">Acesso restrito a usuários com permissão administrativa.</span>
      </main>
    );
  if (user.role !== 'admin')
    return (
      <main id="main-content" className="container admin-locked">
        <Lock size={32} />
        <h1>Acesso editorial restrito.</h1>
        <p>Sua conta é de leitor. Somente administradores podem gerenciar conteúdos.</p>
        <Link to="/" className="secondary">
          Voltar ao portal
        </Link>
      </main>
    );
  async function remove() {
    setBusy(true);
    try {
      if (deleting.type === 'article')
        await api('/admin/articles/' + deleting.id, request('DELETE', {}));
      else await api('/admin/taxonomy/' + deleting.type + '/' + deleting.id, request('DELETE', {}));
      notify('Item removido.');
      setDeleting(null);
      refresh();
      refreshMeta();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function importFeed() {
    setBusy(true);
    try {
      const r = await api('/admin/import', request('POST', { query: importQuery }));
      notify(`${r.imported} rascunhos importados · ${r.duplicates} duplicados ignorados.`);
      refresh();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveTax(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        '/admin/taxonomy/' + taxType + (taxEdit.id ? '/' + taxEdit.id : ''),
        request(taxEdit.id ? 'PUT' : 'POST', taxEdit),
      );
      await refreshMeta();
      setTaxEdit(null);
      notify('Organização atualizada.');
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  const visible = articles.filter(
    (a) =>
      (status === 'all' || a.status === status) &&
      (a.title + ' ' + a.region + ' ' + a.category).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main id="main-content" className="container admin-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">REDAÇÃO · ENTRE BRASIL</span>
          <h1>
            Painel <em>editorial.</em>
          </h1>
          <p>Boas histórias merecem uma boa curadoria.</p>
        </div>
        <Link to="/" className="secondary">
          Ver portal <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="admin-stats">
        {[
          { title: 'Conteúdos', value: stats.articles, Icon: FileText },
          { title: 'Publicadas', value: stats.published, Icon: Eye },
          { title: 'Em revisão', value: stats.drafts, Icon: Pencil },
          { title: 'Inscrições', value: stats.subscribers, Icon: Mail },
        ].map((s) => (
          <div key={s.title}>
            <s.Icon size={20} />
            <span>{s.title}</span>
            <strong>{s.value ?? '—'}</strong>
          </div>
        ))}
      </div>
      <div className="admin-tabs">
        <button className={tab === 'articles' ? 'active' : ''} onClick={() => setTab('articles')}>
          <FileText size={16} />
          Notícias
        </button>
        <button className={tab === 'taxonomy' ? 'active' : ''} onClick={() => setTab('taxonomy')}>
          <Tag size={16} />
          Organização
        </button>
        <button
          className={tab === 'integrations' ? 'active' : ''}
          onClick={() => setTab('integrations')}
        >
          <Sparkles size={16} />
          IA & integrações
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          <Settings size={16} />
          Configurações
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {tab === 'articles' && (
        <>
          <div className="admin-toolbar">
            <div className="search-field">
              <Search size={16} />
              <input
                aria-label="Buscar no painel"
                placeholder="Buscar no acervo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Filtrar status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Todos os status</option>
              <option value="published">Publicadas</option>
              <option value="draft">Rascunhos</option>
            </select>
            <button className="primary" onClick={() => setEditing(fresh())}>
              <Plus size={16} />
              Nova notícia
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Notícia</th>
                  <th>Região / categoria</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="table-article">
                        <img
                          src={a.image || '/images/rio.jpg'}
                          alt=""
                          onError={(e) => (e.currentTarget.src = '/images/rio.jpg')}
                        />
                        <div>
                          <strong>{a.title}</strong>
                          <span>
                            {a.is_demo ? 'Demonstração' : a.source}
                            {a.featured ? <Star size={11} fill="currentColor" /> : null}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{a.region}</strong>
                      <span className="table-muted">{a.category}</span>
                    </td>
                    <td>
                      <span className={'status-badge ' + a.status}>
                        {a.status === 'published' ? 'Publicada' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="table-date">{dateLabel(a.published_at)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="icon-button"
                          aria-label={'Editar ' + a.title}
                          onClick={() => setEditing({ ...a })}
                        >
                          <Pencil size={15} />
                        </button>
                        {a.status === 'published' && (
                          <Link
                            className="icon-button"
                            to={'/noticia/' + a.slug}
                            aria-label="Ver notícia"
                          >
                            <Eye size={15} />
                          </Link>
                        )}
                        <button
                          className="icon-button danger"
                          aria-label={'Excluir ' + a.title}
                          onClick={() => setDeleting({ type: 'article', id: a.id, title: a.title })}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && <Empty title="Nenhuma matéria encontrada." />}
          </div>
        </>
      )}
      {tab === 'taxonomy' && (
        <section className="admin-box">
          <div className="section-heading">
            <div>
              <h2>Um acervo bem organizado.</h2>
              <p className="muted">Alterações de nomes são refletidas nas matérias vinculadas.</p>
            </div>
            <button
              className="primary"
              onClick={() => setTaxEdit({ name: '', region: 'Nordeste' })}
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>
          <div className="tax-tabs">
            {[
              { id: 'categories', name: 'Categorias' },
              { id: 'regions', name: 'Regiões' },
              { id: 'states', name: 'Estados' },
            ].map((t) => (
              <button
                className={taxType === t.id ? 'selected' : ''}
                onClick={() => setTaxType(t.id)}
                key={t.id}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="taxonomy-grid">
            {meta[taxType].map((t) => (
              <div className="taxonomy-row" key={t.id}>
                <span>
                  {t.name}
                  {t.region && <small>{t.region}</small>}
                </span>
                <button
                  className="icon-button"
                  aria-label={'Editar ' + t.name}
                  onClick={() => setTaxEdit({ ...t })}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={'Remover ' + t.name}
                  onClick={() => setDeleting({ type: taxType, id: t.id, title: t.name })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === 'integrations' && (
        <div className="integration-grid">
          <section className="admin-box">
            <div className="integration-icon">
              <Sparkles size={24} />
            </div>
            <span className="eyebrow">ASSISTENTE DE CURADORIA</span>
            <h2>
              Inteligência a serviço
              <br />
              da informação.
            </h2>
            <p className="muted">
              Classificação por região, estado e categoria, resumos, assuntos e identificação de
              conteúdos semelhantes. Use o assistente no editor de cada matéria.
            </p>
            <span className={'connection-badge ' + (stats.ai ? 'connected' : '')}>
              {stats.ai ? 'API de IA configurada' : 'Modo local · classificação por palavras-chave'}
            </span>
            <p className="fine-print">
              No modo local, não há modelo generativo. Para ativar um provedor compatível com
              OpenAI, configure AI_API_KEY, AI_BASE_URL e AI_MODEL. Sugestões nunca substituem
              apuração e revisão editorial.
            </p>
            <button className="secondary" onClick={() => setEditing(fresh())}>
              Abrir editor <ArrowUpRight size={16} />
            </button>
          </section>
          <section className="admin-box">
            <div className="integration-icon">
              <Globe size={24} />
            </div>
            <span className="eyebrow">FONTES DE NOTÍCIAS</span>
            <h2>
              Conecte novas
              <br />
              perspectivas.
            </h2>
            <p className="muted">
              Importe até 20 conteúdos do NewsAPI. Notícias entram como rascunhos; títulos e URLs
              duplicados são ignorados.
            </p>
            <span className={'connection-badge ' + (stats.news ? 'connected' : '')}>
              {stats.news ? 'NewsAPI configurada' : 'Aguardando NEWS_API_KEY no servidor'}
            </span>
            <label>
              Assunto ou região
              <input value={importQuery} onChange={(e) => setImportQuery(e.target.value)} />
            </label>
            <button className="primary" disabled={busy || !stats.news} onClick={importFeed}>
              {busy ? <Loader2 size={16} className="spin" /> : <Download size={16} />}Importar para
              revisão
            </button>
            <p className="fine-print">
              Confira licenciamento, atribuição da fonte e localização antes de publicar. Consulte o
              README para configurar o provedor.
            </p>
          </section>
        </div>
      )}
      {tab === 'settings' && (
        <section className="admin-box settings-box">
          <span className="eyebrow">IDENTIDADE & PREFERÊNCIAS</span>
          <h2>O seu portal, por inteiro.</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api('/admin/settings', request('PUT', config));
                await refreshMeta();
                notify('Configurações salvas.');
              } catch (e) {
                notify(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Nome editorial
              <input
                required
                value={config.site_name || ''}
                onChange={(e) => setConfig({ ...config, site_name: e.target.value })}
              />
            </label>
            <label>
              Mensagem institucional
              <input
                required
                value={config.tagline || ''}
                onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
              />
            </label>
            <p className="fine-print">
              Chaves de API e segredos de autenticação são configurados exclusivamente no ambiente
              do servidor. Nunca ficam expostos neste painel ou no frontend.
            </p>
            <button className="primary" disabled={busy}>
              <Check size={16} />
              Salvar configurações
            </button>
          </form>
        </section>
      )}
      {editing && (
        <Editor
          article={editing}
          meta={meta}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
            notify('Matéria salva com sucesso.');
          }}
        />
      )}
      {deleting && (
        <Modal title="Remover este conteúdo?" onClose={() => setDeleting(null)}>
          <p>{deleting.title}</p>
          <p className="muted">
            Esta ação é permanente. Itens com vínculos editoriais não podem ser removidos.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setDeleting(null)}>
              Cancelar
            </button>
            <button className="danger-button" disabled={busy} onClick={remove}>
              <Trash2 size={16} />
              Remover
            </button>
          </div>
        </Modal>
      )}
      {taxEdit && (
        <Modal
          title={taxEdit.id ? 'Editar organização' : 'Novo item editorial'}
          onClose={() => setTaxEdit(null)}
        >
          <form onSubmit={saveTax}>
            <label>
              Nome
              <input
                required
                value={taxEdit.name}
                onChange={(e) => setTaxEdit({ ...taxEdit, name: e.target.value })}
              />
            </label>
            {taxType === 'states' && !taxEdit.id && (
              <label>
                Região
                <select
                  value={taxEdit.region}
                  onChange={(e) => setTaxEdit({ ...taxEdit, region: e.target.value })}
                >
                  {meta.regions.map((r) => (
                    <option key={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>
            )}
            <button className="primary full" disabled={busy}>
              <Check size={16} />
              Salvar
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}
function Editor({ article, meta, onClose, onSaved }) {
  const [form, setForm] = useState(article),
    [busy, setBusy] = useState(false),
    [analyzing, setAnalyzing] = useState(false),
    [analysis, setAnalysis] = useState(null),
    [error, setError] = useState('');
  const update = (k, v) =>
    setForm((prev) => ({ ...prev, [k]: v, ...(k === 'region' ? { state: '' } : {}) }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(
        '/admin/articles' + (form.id ? '/' + form.id : ''),
        request(form.id ? 'PUT' : 'POST', form),
      );
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function ai() {
    setAnalyzing(true);
    setError('');
    try {
      setAnalysis(
        await api(
          '/admin/ai',
          request('POST', { title: form.title, content: form.content || form.summary }),
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }
  return (
    <Modal
      title={form.id ? 'Editar uma história.' : 'Uma nova história começa aqui.'}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="editor-form">
        <label>
          Título
          <input
            required
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="O que faz essa história importar?"
          />
        </label>
        <label>
          Resumo
          <textarea
            required
            rows={2}
            value={form.summary}
            onChange={(e) => update('summary', e.target.value)}
            placeholder="Contexto em poucas palavras."
          />
        </label>
        <label>
          Texto da matéria
          <textarea
            required
            rows={8}
            value={form.content}
            onChange={(e) => update('content', e.target.value)}
            placeholder="Conte a história. Separe parágrafos com uma linha em branco."
          />
        </label>
        <div className="editor-ai">
          <div>
            <Sparkles size={19} />
            <span>
              <strong>Assistente de curadoria</strong>
              <small>Classifique, resuma e encontre matérias semelhantes.</small>
            </span>
          </div>
          <button
            type="button"
            className="secondary"
            disabled={analyzing || !form.title}
            onClick={ai}
          >
            {analyzing ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}Analisar
          </button>
        </div>
        {analysis && (
          <div className="analysis-result">
            <span className="eyebrow">
              SUGESTÃO · {analysis.provider === 'api' ? 'API DE IA' : 'ANÁLISE LOCAL'}
            </span>
            <p>{analysis.summary}</p>
            <div className="analysis-tags">
              {[analysis.region, analysis.state, analysis.category, ...analysis.topics]
                .filter(Boolean)
                .map((t, i) => (
                  <span key={i}>{t}</span>
                ))}
            </div>
            {analysis.similar.length > 0 && (
              <p className="fine-print">
                Conteúdos semelhantes: {analysis.similar.map((a) => a.title).join(' · ')}
              </p>
            )}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  summary: analysis.summary,
                  category: analysis.category,
                  region: analysis.region || prev.region,
                  state: analysis.state || '',
                  city: analysis.city || prev.city,
                  relevance: analysis.relevance,
                }));
                setAnalysis(null);
              }}
            >
              Aplicar sugestões <Check size={15} />
            </button>
            <span className="fine-print">Revise a localização e os fatos antes de publicar.</span>
          </div>
        )}
        <div className="form-grid">
          <label>
            Categoria
            <select value={form.category} onChange={(e) => update('category', e.target.value)}>
              {meta.categories.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Região
            <select value={form.region} onChange={(e) => update('region', e.target.value)}>
              <option value="">Não classificada · revisar</option>
              {meta.regions.map((r) => (
                <option key={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select value={form.state} onChange={(e) => update('state', e.target.value)}>
              <option value="">Não informado</option>
              {meta.states
                .filter((s) => s.region === form.region)
                .map((s) => (
                  <option key={s.id}>{s.name}</option>
                ))}
            </select>
          </label>
          <label>
            Cidade
            <input value={form.city} onChange={(e) => update('city', e.target.value)} />
          </label>
          <label>
            Fonte
            <input
              required
              value={form.source}
              onChange={(e) => update('source', e.target.value)}
            />
          </label>
          <label>
            Link da matéria original
            <input
              type="url"
              value={form.source_url}
              onChange={(e) => update('source_url', e.target.value)}
              placeholder="https://"
            />
          </label>
          <label className="span-2">
            URL da imagem
            <input
              required
              value={form.image}
              onChange={(e) => update('image', e.target.value)}
              placeholder="/images/rio.jpg ou https://..."
            />
          </label>
          <label>
            Publicação (horário do navegador)
            <input
              type="datetime-local"
              required
              value={
                form.published_at
                  ? new Date(
                      new Date(form.published_at).getTime() -
                        new Date().getTimezoneOffset() * 60000,
                    )
                      .toISOString()
                      .slice(0, 16)
                  : ''
              }
              onChange={(e) => {
                if (e.target.value) update('published_at', new Date(e.target.value).toISOString());
              }}
            />
          </label>
          <label>
            Relevância (0–100)
            <input
              type="number"
              min="0"
              max="100"
              value={form.relevance}
              onChange={(e) => update('relevance', Number(e.target.value))}
            />
          </label>
        </div>
        <div className="editor-publish">
          <label>
            Status
            <select value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="draft">Rascunho · não visível</option>
              <option value="published">Publicada · visível no portal</option>
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={!!form.featured}
              onChange={(e) => update('featured', e.target.checked)}
            />
            Destacar na região
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={!!form.is_demo}
              onChange={(e) => update('is_demo', e.target.checked)}
            />
            Conteúdo demonstrativo
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? <Loader2 size={17} className="spin" /> : <Check size={17} />}Salvar matéria
          </button>
        </div>
      </form>
    </Modal>
  );
}
