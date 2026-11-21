import { saveConfig } from '../core/config-store.js';
import { saveAsset, listAssets, getAsset } from '../core/asset-library.js';

const THEME_OPTIONS = [
  { id: 'land-rover', name: 'Land Rover Pivi', accent: '#D3C49B', background: '#101820', panel: '#344954', radius: 4 },
  { id: 'bmw', name: 'BMW iDrive', accent: '#55B9F4', background: '#0B1420', panel: '#1C3550', radius: 7 },
  { id: 'custom', name: 'Tema personalizado', accent: '#C5A6E8', background: '#17131E', panel: '#3B3048', radius: 10 },
];

const WIDGET_LIBRARY = [
  { type: 'lighting', name: 'Iluminação', description: 'Atalho para cores e efeitos', icon: '✧', target: 'lighting', size: 'large' },
  { type: 'camera', name: 'Câmera frontal', description: 'Acesso à câmera da multimídia', icon: '◉', target: 'camera', size: 'medium' },
  { type: 'vehicle', name: 'Dados do veículo', description: 'Área preparada para OBD2', icon: '▱', target: 'vehicle', size: 'medium' },
  { type: 'profiles', name: 'Ambientes', description: 'Cenas de iluminação', icon: '◈', target: 'profiles', size: 'small' },
  { type: 'apps', name: 'Aplicativos', description: 'Acessar todos os aplicativos', icon: '▦', target: 'apps', size: 'small' },
  { type: 'themes', name: 'Estilo visual', description: 'Escolher identidade visual', icon: '◇', target: 'modes', size: 'small' },
  { type: 'clock', name: 'Relógio e data', description: 'Hora e data local', icon: '◷', target: '', size: 'small' },
  { type: 'image', name: 'Imagem / banner', description: 'Imagem escolhida pelo proprietário', icon: '▧', target: '', size: 'large' },
  { type: 'music', name: 'Mídia', description: 'Atalho reservado para áudio', icon: '♫', target: 'apps', size: 'medium' },
  { type: 'custom', name: 'Painel personalizado', description: 'Bloco livre com texto e imagem', icon: '＋', target: '', size: 'medium' },
];

const APP_LIBRARY = [
  { type: 'lighting', name: 'Iluminação', description: 'Cor, brilho e efeitos', icon: '✧', target: 'lighting', size: 'small' },
  { type: 'camera', name: 'Câmera frontal', description: 'Visualização dianteira', icon: '◉', target: 'camera', size: 'small' },
  { type: 'vehicle', name: 'Dados do veículo', description: 'OBD2 e sensores', icon: '▱', target: 'vehicle', size: 'small' },
  { type: 'profiles', name: 'Ambientes', description: 'Cenas de iluminação', icon: '◈', target: 'profiles', size: 'small' },
  { type: 'themes', name: 'Estilo visual', description: 'Identidade visual', icon: '◇', target: 'modes', size: 'small' },
  { type: 'settings', name: 'Configurações', description: 'Conexões e preferências', icon: '⚙', target: 'settings', size: 'small' },
  { type: 'developer', name: 'Desenvolvedor', description: 'Ferramentas do proprietário', icon: '⌘', target: 'developer', size: 'small' },
];

const ICONS = ['✧', '◉', '▱', '◈', '▦', '◇', '◷', '▧', '♫', '⚙', '⌘', '＋', '☼', '♧', '⬡', '◆'];
const VALID_TARGETS = new Set(['', 'home', 'apps', 'lighting', 'camera', 'vehicle', 'profiles', 'modes', 'settings', 'developer']);
const urlCache = new Map();
let editorState = { themeId: 'land-rover', screen: 'home', selectedId: null, popupPreviewId: null };
let root;
let getConfig;
let onConfigChange;
let toast;
let saveTimer;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function uid(prefix = 'item') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

export function createDefaultEditorLayout(themeId) {
  const theme = THEME_OPTIONS.find((item) => item.id === themeId) || THEME_OPTIONS[0];
  const home = [
    { id: 'home-lighting', type: 'lighting', title: 'Iluminação ambiente', subtitle: 'Cor, brilho e efeitos', icon: '✧', target: 'lighting', priority: 1, size: 'large', enabled: true, order: 1 },
    { id: 'home-camera', type: 'camera', title: 'Câmera frontal', subtitle: 'Visualização dianteira', icon: '◉', target: 'camera', priority: 2, size: 'medium', enabled: true, order: 2 },
    { id: 'home-vehicle', type: 'vehicle', title: 'Dados do veículo', subtitle: 'Informações e diagnóstico', icon: '▱', target: 'vehicle', priority: 2, size: 'medium', enabled: true, order: 3 },
  ];
  const apps = APP_LIBRARY.map((item, index) => ({ id: `app-${item.type}`, ...item, title: item.name, priority: index < 2 ? 1 : 2, enabled: true, order: index + 1 }));
  return {
    themeId,
    name: theme.name,
    style: { accent: theme.accent, background: theme.background, panel: theme.panel, radius: theme.radius },
    screens: { home, apps },
    popups: [],
    updatedAt: new Date().toISOString(),
  };
}

function getThemeLayout(themeId = editorState.themeId) {
  const config = getConfig();
  const layouts = Array.isArray(config.personalization?.layouts) ? config.personalization.layouts : [];
  let layout = layouts.find((item) => item.themeId === themeId);
  if (!layout) layout = createDefaultEditorLayout(themeId);
  layout.screens ||= {};
  layout.screens.home ||= createDefaultEditorLayout(themeId).screens.home;
  layout.screens.apps ||= createDefaultEditorLayout(themeId).screens.apps;
  layout.popups ||= [];
  layout.style ||= createDefaultEditorLayout(themeId).style;
  return layout;
}

function persistLayout(layout, { activate = false } = {}) {
  const config = getConfig();
  const existing = Array.isArray(config.personalization?.layouts) ? config.personalization.layouts : [];
  const layouts = [...existing.filter((item) => item.themeId !== layout.themeId), { ...layout, updatedAt: new Date().toISOString() }];
  const next = {
    ...config,
    theme: { ...config.theme, ...(activate ? { activeId: layout.themeId } : {}) },
    personalization: { ...config.personalization, layouts },
  };
  const result = saveConfig(next);
  if (!result.ok) {
    toast(`Não foi possível salvar: ${result.error || 'armazenamento indisponível'}`);
    return false;
  }
  onConfigChange(result.config);
  applyThemeStyle(layout.style, layout.themeId === result.config.theme.activeId);
  if (layout.themeId === result.config.theme.activeId) applyLiveLayout(layout);
  return true;
}

export function sortEditorItems(items) {
  return [...(items || [])].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}
const sortedItems = sortEditorItems;

function getThemeChoices() {
  const config = getConfig();
  const stored = Array.isArray(config.personalization?.layouts) ? config.personalization.layouts : [];
  const dynamic = stored.filter((layout) => layout.themeId?.startsWith('custom-') && !THEME_OPTIONS.some((theme) => theme.id === layout.themeId)).map((layout) => ({ id: layout.themeId, name: layout.name || 'Tema personalizado' }));
  return [...THEME_OPTIONS, ...dynamic];
}

function applyThemeStyle(style = {}, active = false) {
  const target = active ? document.documentElement : root?.querySelector('.editor-preview-device');
  if (!target) return;
  target.style.setProperty('--editor-accent', style.accent || '#D3C49B');
  target.style.setProperty('--editor-bg', style.background || '#101820');
  target.style.setProperty('--editor-panel', style.panel || '#344954');
  target.style.setProperty('--editor-radius', `${Number(style.radius ?? 4)}px`);
  if (active) {
    document.documentElement.dataset.activeTheme = getConfig().theme.activeId || editorState.themeId;
    const chip = document.querySelector('.mode-chip');
    const activeThemeId = getConfig().theme.activeId || editorState.themeId;
    const themeName = getThemeChoices().find((theme) => theme.id === activeThemeId)?.name || 'VOYAGE AMBIENT';
    if (chip) chip.innerHTML = `<span class="mode-dot"></span> ${escapeHtml(themeName.toUpperCase())} <span class="mode-chevron">⌄</span>`;
    document.querySelectorAll('.theme-card').forEach((card, index) => {
      card.classList.toggle('selected', ['land-rover', 'bmw', 'custom'][index] === activeThemeId);
      const status = card.querySelector('em');
      if (status && ['land-rover', 'bmw', 'custom'][index] === activeThemeId) status.textContent = 'ATIVO';
      else if (status && status.textContent === 'ATIVO') status.textContent = 'DISPONÍVEL';
    });
  }
}

function assetUrl(assetId, assets) {
  if (!assetId) return '';
  if (urlCache.has(assetId)) return urlCache.get(assetId);
  const meta = assets.find((asset) => asset.id === assetId);
  return meta ? `asset-pending:${assetId}` : '';
}

async function resolveAssetUrls(assets) {
  for (const asset of assets) {
    if (urlCache.has(asset.id)) continue;
    try {
      const record = await getAsset(asset.id);
      if (record?.blob) urlCache.set(asset.id, URL.createObjectURL(record.blob));
    } catch { /* Arquivo pode ter sido removido pelo navegador. */ }
  }
}

function renderWidgetCard(item, index, assets, selected = false) {
  const isImage = item.type === 'image' || item.imageAssetId;
  const image = isImage ? assetUrl(item.imageAssetId, assets) : '';
  const style = image && !image.startsWith('asset-pending:') ? `style="--widget-image:url('${image}')"` : '';
  const label = item.title || item.name || 'Novo painel';
  const subtitle = item.subtitle || item.description || 'Painel personalizável';
  const cls = `editor-widget-card priority-${item.priority || 2} size-${item.size || 'medium'} ${selected ? 'is-selected' : ''} ${item.enabled === false ? 'is-hidden' : ''} ${isImage ? 'has-image' : ''}`;
  const clock = item.type === 'clock' ? `<strong class="editor-clock-value">${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</strong>` : '';
  const imgMissing = isImage && !image ? '<span class="editor-image-empty">ADICIONE UMA IMAGEM</span>' : '';
  return `<button class="${cls}" data-preview-select="${escapeHtml(item.id)}" ${style}>
    <span class="editor-widget-order">${index + 1}</span>
    <span class="editor-widget-icon">${escapeHtml(item.icon || '＋')}</span>
    <span class="editor-widget-copy"><b>${escapeHtml(label)}</b><small>${escapeHtml(subtitle)}</small>${clock}</span>
    ${imgMissing}
    <span class="editor-widget-priority">${['', 'PRINCIPAL', 'SECUNDÁRIO', 'APOIO'][Number(item.priority) || 2]}</span>
  </button>`;
}

function renderInspector(layout, assets) {
  const selected = (editorState.screen === 'popups' ? layout.popups : layout.screens[editorState.screen]).find((item) => item.id === editorState.selectedId);
  if (!selected) return `<div class="editor-inspector-empty"><span>＋</span><b>Selecione um item</b><small>Escolha um painel na prévia ou adicione um componente da biblioteca.</small></div>`;
  if (editorState.screen === 'popups') {
    return `<div class="editor-inspector-form">
      <div class="editor-inspector-head"><span class="eyebrow">PROPRIEDADES DO POP-UP</span><b>${escapeHtml(selected.name || 'Pop-up')}</b></div>
      <label>Nome interno<input class="editor-field" data-popup-field="name" value="${escapeHtml(selected.name)}" maxlength="36"></label>
      <label>Título exibido<input class="editor-field" data-popup-field="title" value="${escapeHtml(selected.title)}" maxlength="48"></label>
      <label>Mensagem<textarea class="editor-field" data-popup-field="message" rows="4" maxlength="240">${escapeHtml(selected.message)}</textarea></label>
      <label>Texto do botão<input class="editor-field" data-popup-field="actionLabel" value="${escapeHtml(selected.actionLabel || 'Entendi')}" maxlength="24"></label>
      <label>Ação do botão<select class="editor-field" data-popup-field="actionView">${['', 'lighting', 'camera', 'vehicle', 'apps', 'settings'].map((v) => `<option value="${v}" ${selected.actionView === v ? 'selected' : ''}>${v || 'Somente fechar'}</option>`).join('')}</select></label>
      <div class="editor-inspector-actions"><button class="editor-action-button danger" data-remove-selected>Excluir pop-up</button><button class="editor-action-button" data-preview-popup="${escapeHtml(selected.id)}">Testar pop-up</button></div>
    </div>`;
  }
  return `<div class="editor-inspector-form">
    <div class="editor-inspector-head"><span class="eyebrow">PROPRIEDADES DO COMPONENTE</span><b>${escapeHtml(selected.title || 'Novo painel')}</b></div>
    <label>Nome exibido<input class="editor-field" data-widget-field="title" value="${escapeHtml(selected.title)}" maxlength="40"></label>
    <label>Descrição<input class="editor-field" data-widget-field="subtitle" value="${escapeHtml(selected.subtitle || '')}" maxlength="64"></label>
    <label>Ícone <select class="editor-field icon-field" data-widget-field="icon">${ICONS.map((icon) => `<option value="${icon}" ${selected.icon === icon ? 'selected' : ''}>${icon}</option>`).join('')}</select></label>
    <label>Ao tocar, abrir<select class="editor-field" data-widget-field="target">${[...VALID_TARGETS].map((target) => `<option value="${target}" ${selected.target === target ? 'selected' : ''}>${target || 'Não navegar'}</option>`).join('')}</select></label>
    <div class="editor-field-grid">
      <label>Prioridade<select class="editor-field" data-widget-field="priority"><option value="1" ${Number(selected.priority) === 1 ? 'selected' : ''}>1 · Principal</option><option value="2" ${Number(selected.priority) === 2 ? 'selected' : ''}>2 · Secundário</option><option value="3" ${Number(selected.priority) === 3 ? 'selected' : ''}>3 · Apoio</option></select></label>
      <label>Tamanho<select class="editor-field" data-widget-field="size">${[['small','Compacto'],['medium','Médio'],['large','Grande'],['full','Largura total']].map(([value,label]) => `<option value="${value}" ${selected.size === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
    </div>
    <label>Pop-up ao tocar<select class="editor-field" data-widget-field="popupId"><option value="">Nenhum</option>${layout.popups.map((popup) => `<option value="${escapeHtml(popup.id)}" ${selected.popupId === popup.id ? 'selected' : ''}>${escapeHtml(popup.name || popup.title)}</option>`).join('')}</select></label>
    <label class="editor-check"><input type="checkbox" data-widget-field="enabled" ${selected.enabled === false ? '' : 'checked'}> Exibir este componente</label>
    <div class="editor-image-control"><span class="eyebrow">IMAGEM DO COMPONENTE</span><select class="editor-field" data-widget-field="imageAssetId"><option value="">Sem imagem</option>${assets.filter((asset) => asset.category === 'image').map((asset) => `<option value="${escapeHtml(asset.id)}" ${selected.imageAssetId === asset.id ? 'selected' : ''}>${escapeHtml(asset.name)}</option>`).join('')}</select><label class="editor-upload-button" for="editorImageUpload">＋ Enviar imagem</label><input id="editorImageUpload" type="file" accept="image/*" hidden></div>
    <div class="editor-inspector-actions">
      <button class="editor-action-button" data-move-item="-1">↑ Subir</button><button class="editor-action-button" data-move-item="1">↓ Descer</button>
      <button class="editor-action-button" data-duplicate-item>Duplicar</button><button class="editor-action-button danger" data-remove-selected>Excluir</button>
    </div>
  </div>`;
}

async function renderEditor() {
  if (!root) return;
  const layout = getThemeLayout();
  const token = ++renderEditor.token;
  const assets = await listAssets().catch(() => []);
  await resolveAssetUrls(assets);
  if (token !== renderEditor.token) return;
  const themeName = layout.name || getThemeChoices().find((theme) => theme.id === editorState.themeId)?.name || 'Tema';
  const items = editorState.screen === 'popups' ? layout.popups : sortedItems(layout.screens[editorState.screen]);
  const selectedId = editorState.selectedId;
  const screenContent = editorState.screen === 'popups'
    ? `<div class="editor-popup-list">${layout.popups.map((popup, index) => `<button class="editor-popup-row ${selectedId === popup.id ? 'is-selected' : ''}" data-preview-select="${escapeHtml(popup.id)}"><span class="editor-widget-order">${index + 1}</span><span><b>${escapeHtml(popup.title || popup.name)}</b><small>${escapeHtml(popup.message || 'Sem mensagem')}</small></span><em>POP-UP</em></button>`).join('') || '<div class="editor-canvas-empty">Nenhum pop-up criado. Clique em “Criar pop-up”.</div>'}</div>`
    : `<div class="editor-preview-device" style="--editor-accent:${escapeHtml(layout.style.accent)};--editor-bg:${escapeHtml(layout.style.background)};--editor-panel:${escapeHtml(layout.style.panel)};--editor-radius:${Number(layout.style.radius) || 4}px">
        <div class="editor-preview-top"><span>VOYAGE <small>AMBIENT</small></span><span>${new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short'}).format(new Date()).toUpperCase()} · ${new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date())}</span></div>
        <div class="editor-preview-heading"><span>${editorState.screen === 'home' ? 'BEM-VINDO AO SEU VEÍCULO' : 'MENU PRINCIPAL'}</span><b>${editorState.screen === 'home' ? 'Painel inicial' : 'Aplicativos'}</b></div>
        <div class="editor-preview-grid ${editorState.screen === 'apps' ? 'apps-mode' : 'home-mode'}">${items.filter((item) => item.enabled !== false).map((item, index) => renderWidgetCard(item, index, assets, selectedId === item.id)).join('') || '<div class="editor-canvas-empty">Adicione componentes da biblioteca para começar.</div>'}</div>
        <div class="editor-preview-bottom"><span>PRÉVIA DO PROPRIETÁRIO</span><span>${escapeHtml(themeName.toUpperCase())}</span></div>
      </div>`;

  root.innerHTML = `<div class="editor-header">
      <div><span class="eyebrow">FERRAMENTA DO PROPRIETÁRIO</span><h2>Editor visual</h2><p>Monte os painéis, organize os aplicativos e personalize cada tema.</p></div>
      <div class="editor-header-actions"><button class="editor-action-button" data-editor-back>← Voltar</button><button class="editor-save-button" data-save-layout>Salvar alterações</button></div>
    </div>
    <div class="editor-toolbar">
      <label>TEMA EM EDIÇÃO<select id="editorThemeSelect" class="editor-field">${getThemeChoices().map((theme) => `<option value="${theme.id}" ${theme.id === editorState.themeId ? 'selected' : ''}>${escapeHtml(theme.name)}</option>`).join('')}</select></label>
      <div class="editor-screen-tabs">${[['home','Tela inicial'],['apps','Aplicativos'],['popups','Pop-ups']].map(([id,label]) => `<button class="editor-tab ${editorState.screen === id ? 'active' : ''}" data-editor-screen="${id}">${label}</button>`).join('')}</div>
      <div class="editor-toolbar-actions"><button class="editor-action-button" data-create-theme>＋ Novo tema</button><button class="editor-activate-button" data-activate-theme>Aplicar tema à central</button></div>
    </div>
    <div class="editor-workspace">
      <aside class="editor-library">
        <div class="editor-panel-title"><span class="eyebrow">BIBLIOTECA</span><b>Componentes prontos</b><small>Toque para adicionar à tela selecionada.</small></div>
        ${editorState.screen === 'popups' ? `<button class="editor-library-item create-popup" data-add-popup><span>＋</span><b>Criar pop-up</b><small>Nova janela de informações</small></button>` : (editorState.screen === 'home' ? WIDGET_LIBRARY : APP_LIBRARY).map((item) => `<button class="editor-library-item" data-add-widget="${item.type}"><span>${item.icon}</span><b>${item.name}</b><small>${item.description}</small></button>`).join('')}
        <div class="editor-theme-style"><span class="eyebrow">APARÊNCIA DO TEMA</span><label>Cor de destaque<input type="color" data-style-field="accent" value="${escapeHtml(layout.style.accent)}"></label><label>Fundo<input type="color" data-style-field="background" value="${escapeHtml(layout.style.background)}"></label><label>Painéis<input type="color" data-style-field="panel" value="${escapeHtml(layout.style.panel)}"></label><label>Arredondamento <output id="editorRadiusValue">${Number(layout.style.radius) || 4}px</output><input type="range" min="0" max="18" value="${Number(layout.style.radius) || 4}" data-style-field="radius"></label></div>
      </aside>
      <section class="editor-preview-column"><div class="editor-column-heading"><b>Pré-visualização</b><small>Selecione um item para editar</small></div>${screenContent}${editorState.screen === 'popups' && editorState.popupPreviewId ? renderPopupPreview(layout, editorState.popupPreviewId) : ''}</section>
      <aside class="editor-inspector"><div class="editor-column-heading"><b>Propriedades</b><small>Configuração do item selecionado</small></div>${renderInspector(layout, assets)}</aside>
    </div>
    <div class="editor-footer-note"><span>✓ Salvamento local no dispositivo</span><span>Os widgets visuais não criam funções físicas automaticamente. Hardware novo exige integração com o ESP32.</span></div>`;
  if (editorState.themeId === getConfig().theme.activeId) applyThemeStyle(layout.style, true);
  applyThemeStyle(layout.style, false);
}
renderEditor.token = 0;

function renderPopupPreview(layout, popupId) {
  const popup = layout.popups.find((item) => item.id === popupId);
  if (!popup) return '';
  return `<div class="editor-popup-overlay"><div class="editor-popup-card"><span class="eyebrow">PRÉVIA DO POP-UP</span><h3>${escapeHtml(popup.title)}</h3><p>${escapeHtml(popup.message)}</p><button class="editor-save-button" data-close-popup-preview>${escapeHtml(popup.actionLabel || 'Entendi')}</button></div></div>`;
}

function addWidget(type) {
  const layout = getThemeLayout();
  const source = (editorState.screen === 'apps' ? APP_LIBRARY : WIDGET_LIBRARY).find((item) => item.type === type) || WIDGET_LIBRARY.find((item) => item.type === type) || WIDGET_LIBRARY[WIDGET_LIBRARY.length - 1];
  const list = layout.screens[editorState.screen];
  const item = {
    id: uid(type), type: source.type, title: source.name || 'Novo painel', subtitle: source.description || '', icon: source.icon || '＋', target: source.target || '',
    priority: list.length === 0 ? 1 : 2, size: source.size || 'medium', enabled: true, order: list.length + 1, imageAssetId: '', popupId: '',
  };
  list.push(item);
  editorState.selectedId = item.id;
  persistLayout(layout);
  renderEditor();
  toast('Componente adicionado. Edite as propriedades ao lado.');
}

function addPopup() {
  const layout = getThemeLayout();
  const popup = { id: uid('popup'), name: `Pop-up ${layout.popups.length + 1}`, title: 'Novo aviso', message: 'Escreva aqui a informação que deseja exibir.', actionLabel: 'Entendi', actionView: '' };
  layout.popups.push(popup);
  editorState.selectedId = popup.id;
  persistLayout(layout);
  renderEditor();
  toast('Pop-up criado. Edite o texto nas propriedades.');
}

function updateSelected(field, value, popup = false) {
  const layout = getThemeLayout();
  const collection = popup ? layout.popups : layout.screens[editorState.screen];
  const selected = collection.find((item) => item.id === editorState.selectedId);
  if (!selected) return;
  if (field === 'priority') value = Number(value);
  if (field === 'enabled') value = Boolean(value);
  if (field === 'target' && !VALID_TARGETS.has(value)) value = '';
  selected[field] = value;
  persistLayout(layout);
  if (field === 'title' || field === 'name') {
    const label = root.querySelector('.editor-inspector-head b');
    if (label) label.textContent = value;
  }
  updatePreviewSelection(layout);
}

async function updatePreviewSelection(layout) {
  const assets = await listAssets().catch(() => []);
  await resolveAssetUrls(assets);
  const container = root.querySelector('.editor-preview-grid');
  if (!container || editorState.screen === 'popups') return;
  const items = sortedItems(layout.screens[editorState.screen]).filter((item) => item.enabled !== false);
  container.innerHTML = items.map((item, index) => renderWidgetCard(item, index, assets, editorState.selectedId === item.id)).join('') || '<div class="editor-canvas-empty">Adicione componentes da biblioteca para começar.</div>';
}

function moveSelected(direction) {
  const layout = getThemeLayout();
  const items = sortedItems(layout.screens[editorState.screen]);
  const index = items.findIndex((item) => item.id === editorState.selectedId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;
  [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
  items.forEach((item, order) => { item.order = order + 1; });
  layout.screens[editorState.screen] = items;
  persistLayout(layout);
  renderEditor();
}

function duplicateSelected() {
  const layout = getThemeLayout();
  const items = layout.screens[editorState.screen];
  const selected = items.find((item) => item.id === editorState.selectedId);
  if (!selected) return;
  const copy = { ...clone(selected), id: uid(selected.type), title: `${selected.title} (cópia)`, order: items.length + 1 };
  items.push(copy);
  editorState.selectedId = copy.id;
  persistLayout(layout);
  renderEditor();
}

function removeSelected() {
  const layout = getThemeLayout();
  if (editorState.screen === 'popups') {
    layout.popups = layout.popups.filter((item) => item.id !== editorState.selectedId);
  } else {
    layout.screens[editorState.screen] = layout.screens[editorState.screen].filter((item) => item.id !== editorState.selectedId);
    layout.screens[editorState.screen].forEach((item, index) => { item.order = index + 1; });
  }
  editorState.selectedId = null;
  persistLayout(layout);
  renderEditor();
  toast('Item removido do layout.');
}

async function uploadImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Escolha um arquivo de imagem.'); return; }
  if (file.size > 20 * 1024 * 1024) { toast('Para manter o editor leve, use imagens de até 20 MB.'); return; }
  try {
    const asset = await saveAsset(file, 'image');
    const layout = getThemeLayout();
    const item = layout.screens[editorState.screen]?.find((entry) => entry.id === editorState.selectedId);
    if (item) item.imageAssetId = asset.id;
    persistLayout(layout);
    await renderEditor();
    toast('Imagem adicionada à biblioteca local e aplicada ao componente.');
  } catch (error) { toast(`Falha ao adicionar imagem: ${error.message}`); }
  event.target.value = '';
}

function openPopup(popupId, layout = getThemeLayout()) {
  const popup = layout.popups.find((item) => item.id === popupId);
  if (!popup) return false;
  document.querySelector('.voyage-runtime-popup')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'voyage-runtime-popup';
  overlay.innerHTML = `<div class="voyage-runtime-popup-card"><span class="eyebrow">VOYAGE AMBIENT</span><h2>${escapeHtml(popup.title)}</h2><p>${escapeHtml(popup.message)}</p><button class="primary-button" data-runtime-popup-close>${escapeHtml(popup.actionLabel || 'Entendi')}</button></div>`;
  document.body.append(overlay);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay || event.target.closest('[data-runtime-popup-close]')) {
      overlay.remove();
      if (popup.actionView) document.querySelector(`[data-view="${popup.actionView}"], [data-go="${popup.actionView}"]`)?.click();
    }
  });
  return true;
}

function widgetLiveMarkup(item, index, assets, screen) {
  const target = VALID_TARGETS.has(item.target) ? item.target : '';
  const popup = item.popupId || '';
  const nav = popup ? `data-popup-id="${escapeHtml(popup)}"` : target ? `data-editor-live-nav data-go="${escapeHtml(target)}"` : '';
  const image = item.imageAssetId ? assetUrl(item.imageAssetId, assets) : '';
  const imageStyle = image && !image.startsWith('asset-pending:') ? `style="--live-widget-image:url('${image}')"` : '';
  const typeIcon = item.icon || '＋';
  const commonTitle = `<div class="editor-live-top"><span class="editor-live-icon">${escapeHtml(typeIcon)}</span><span class="editor-live-priority">${['','PRINCIPAL','SECUNDÁRIO','APOIO'][Number(item.priority) || 2]}</span></div><h2>${escapeHtml(item.title || item.name || 'Painel')}</h2><p>${escapeHtml(item.subtitle || 'Componente personalizado')}</p>`;
  if (screen === 'apps') return `<button class="app-tile editor-live-app ${image ? 'has-image' : ''}" ${nav} ${imageStyle}><span class="app-icon">${escapeHtml(typeIcon)}</span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.subtitle || '')}</small>${image ? '<span class="editor-live-image-overlay"></span>' : ''}</button>`;
  return `<button class="dash-tile editor-live-card priority-${Number(item.priority) || 2} size-${item.size || 'medium'} type-${escapeHtml(item.type)} ${image ? 'has-image' : ''}" ${nav} ${imageStyle}>
    <div class="editor-live-content">${commonTitle}${item.type === 'clock' ? `<strong class="editor-live-clock">${new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date())}</strong>` : ''}${item.type === 'lighting' ? `<div class="editor-live-light-indicator" style="--ambient:${getConfig().lighting.color}"></div><span class="editor-live-meta">ILUMINAÇÃO • ${getConfig().lighting.brightness}%</span>` : ''}</div>
    ${image ? '<span class="editor-live-image-overlay"></span>' : ''}<span class="editor-live-order">${index + 1}</span>
  </button>`;
}

async function applyLiveLayout(layout) {
  if (layout.themeId !== getConfig().theme.activeId) return;
  const assets = await listAssets().catch(() => []);
  await resolveAssetUrls(assets);
  const home = document.querySelector('#home-dashboard');
  if (home) {
    const items = sortedItems(layout.screens.home).filter((item) => item.enabled !== false);
    home.classList.add('editor-live-dashboard');
    home.innerHTML = items.map((item, index) => widgetLiveMarkup(item, index, assets, 'home')).join('') || '<div class="editor-canvas-empty">Adicione painéis pelo Modo Desenvolvedor.</div>';
  }
  const apps = document.querySelector('.apps-grid');
  if (apps) {
    const items = sortedItems(layout.screens.apps).filter((item) => item.enabled !== false);
    apps.innerHTML = items.map((item, index) => widgetLiveMarkup(item, index, assets, 'apps')).join('') || '<div class="editor-canvas-empty">Adicione aplicativos pelo Editor Visual.</div>';
  }
}

function restoreLiveLayout() {
  const layout = getThemeLayout(getConfig().theme.activeId || 'land-rover');
  if (getConfig().personalization?.layouts?.some((item) => item.themeId === layout.themeId)) {
    applyThemeStyle(layout.style, true);
    applyLiveLayout(layout);
  }
}

export function createEditorMarkup() {
  return `<section class="view" id="view-editor"><div id="visualEditorRoot" class="visual-editor-root"></div></section>`;
}

export function initVisualEditor(options) {
  getConfig = options.getConfig;
  onConfigChange = options.onConfigChange;
  toast = options.toast;
  root = document.querySelector('#visualEditorRoot');
  if (!root) return;

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.matches('[data-editor-back]')) { options.setView('developer'); return; }
    if (button.matches('[data-editor-screen]')) { editorState.screen = button.dataset.editorScreen; editorState.selectedId = null; editorState.popupPreviewId = null; renderEditor(); return; }
    if (button.matches('[data-add-widget]')) { addWidget(button.dataset.addWidget); return; }
    if (button.matches('[data-add-popup]')) { addPopup(); return; }
    if (button.matches('[data-preview-select]')) { editorState.selectedId = button.dataset.previewSelect; editorState.popupPreviewId = null; renderEditor(); return; }
    if (button.matches('[data-move-item]')) { moveSelected(Number(button.dataset.moveItem)); return; }
    if (button.matches('[data-duplicate-item]')) { duplicateSelected(); return; }
    if (button.matches('[data-remove-selected]')) { removeSelected(); return; }
    if (button.matches('[data-preview-popup]')) { editorState.popupPreviewId = button.dataset.previewPopup; renderEditor(); return; }
    if (button.matches('[data-close-popup-preview]')) { editorState.popupPreviewId = null; renderEditor(); return; }
    if (button.matches('[data-save-layout]')) { const layout = getThemeLayout(); const ok = persistLayout(layout); if (ok) toast('Layout salvo neste dispositivo.'); return; }
    if (button.matches('[data-create-theme]')) {
      const source = getThemeLayout();
      const count = getThemeChoices().filter((theme) => theme.id.startsWith('custom-')).length + 1;
      const id = uid('custom');
      const created = clone(source);
      created.themeId = id; created.name = `Meu tema ${count}`;
      const config = getConfig();
      const layouts = [...(config.personalization?.layouts || []).filter((item) => item.themeId !== id), created];
      const result = saveConfig({ ...config, personalization: { ...config.personalization, layouts } });
      if (result.ok) { onConfigChange(result.config); editorState.themeId = id; editorState.selectedId = null; renderEditor(); toast('Novo tema criado a partir do tema atual.'); }
      else toast('Não foi possível criar o tema.');
      return;
    }
    if (button.matches('[data-activate-theme]')) { const layout = getThemeLayout(); const ok = persistLayout(layout, { activate: true }); if (ok) { applyThemeStyle(layout.style, true); applyLiveLayout(layout); toast('Tema aplicado à central.'); } return; }
  });

  root.addEventListener('change', async (event) => {
    const target = event.target;
    if (target.matches('#editorThemeSelect')) { editorState.themeId = target.value; editorState.selectedId = null; editorState.popupPreviewId = null; renderEditor(); return; }
    if (target.matches('[data-widget-field]')) { updateSelected(target.dataset.widgetField, target.type === 'checkbox' ? target.checked : target.value); await renderEditor(); return; }
    if (target.matches('[data-popup-field]')) { updateSelected(target.dataset.popupField, target.value, true); await renderEditor(); return; }
    if (target.matches('[data-style-field]')) {
      const layout = getThemeLayout();
      layout.style[target.dataset.styleField] = target.dataset.styleField === 'radius' ? Number(target.value) : target.value;
      persistLayout(layout);
      const radius = root.querySelector('#editorRadiusValue'); if (radius) radius.textContent = `${layout.style.radius}px`;
      applyThemeStyle(layout.style, layout.themeId === getConfig().theme.activeId);
      return;
    }
    if (target.matches('[data-widget-field="imageAssetId"]')) { await renderEditor(); }
  });

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (target.matches('[data-style-field]')) {
      const layout = getThemeLayout();
      layout.style[target.dataset.styleField] = target.dataset.styleField === 'radius' ? Number(target.value) : target.value;
      applyThemeStyle(layout.style, false);
      persistLayout(layout);
      const radius = root.querySelector('#editorRadiusValue'); if (radius) radius.textContent = `${layout.style.radius}px`;
    }
    if (target.matches('[data-widget-field="title"], [data-widget-field="subtitle"]')) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => updateSelected(target.dataset.widgetField, target.value), 350);
    }
    if (target.matches('[data-popup-field="title"], [data-popup-field="message"], [data-popup-field="name"]')) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => updateSelected(target.dataset.popupField, target.value, true), 350);
    }
  });

  root.addEventListener('change', (event) => {
    if (event.target.matches('#editorImageUpload')) uploadImage(event);
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-popup-id]');
    if (trigger) {
      const id = trigger.dataset.popupId;
      const layout = getThemeLayout(getConfig().theme.activeId || 'land-rover');
      if (openPopup(id, layout)) event.preventDefault();
      return;
    }
    const liveNavigation = event.target.closest('[data-editor-live-nav]');
    if (liveNavigation?.dataset.go) {
      event.preventDefault();
      document.querySelector(`[data-view="${liveNavigation.dataset.go}"]`)?.click();
    }
  });

  restoreLiveLayout();
  renderEditor();
}

export function openVisualEditor() {
  editorState = { ...editorState, themeId: getConfig().theme.activeId || 'land-rover', screen: 'home', selectedId: null, popupPreviewId: null };
  renderEditor();
}
