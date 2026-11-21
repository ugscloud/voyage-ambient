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
let editorState = { themeId: 'land-rover', screen: 'home', selectedId: null, popupPreviewId: null, saveDialog: false };
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
    { id: 'home-shortcut-lighting', type: 'shortcut', title: 'Iluminação', subtitle: 'Cor e efeitos', icon: '✧', target: 'lighting', priority: 3, size: 'small', enabled: true, order: 4 },
    { id: 'home-shortcut-camera', type: 'shortcut', title: 'Câmera', subtitle: 'Visão frontal', icon: '◉', target: 'camera', priority: 3, size: 'small', enabled: true, order: 5 },
    { id: 'home-shortcut-apps', type: 'shortcut', title: 'Aplicativos', subtitle: 'Todos os recursos', icon: '▦', target: 'apps', priority: 3, size: 'small', enabled: true, order: 6 },
    { id: 'home-shortcut-modes', type: 'shortcut', title: 'Estilos', subtitle: 'Temas visuais', icon: '◇', target: 'modes', priority: 3, size: 'small', enabled: true, order: 7 },
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
  layout.popups.forEach((popup) => { popup.style = normalizePopupStyle(popup.style); });
  Object.values(layout.screens).forEach((items) => items.forEach((item) => normalizeWidgetLayoutItem(item)));
  layout.style ||= createDefaultEditorLayout(themeId).style;
  return layout;
}

const POPUP_STYLE_DEFAULTS = {
  widthPct: 88, heightMode: 'auto', height: 420, minHeight: 260, position: 'center',
  cardOpacity: 94, overlayOpacity: 76, blur: 8, radius: 18, padding: 28,
  fontFamily: 'Inter, Arial, sans-serif', titleSize: 30, messageSize: 16, buttonSize: 13,
  titleWeight: 400, messageWeight: 400, lineHeight: 1.65, letterSpacing: 0,
  textAlign: 'left', surfaceColor: '#263B46', titleColor: '#F2F6F7', messageColor: '#C5D1D5',
  borderColor: '#FFFFFF', borderWidth: 1, shadow: 34, buttonColor: '#D3C49B', buttonTextColor: '#142128',
  animation: 'rise', animationDuration: 280, imageAssetId: '', imageMode: 'banner', imageHeight: 148, imageOpacity: 35, imageFit: 'cover', imagePosition: 'center',
  titleTransform: 'none', buttonRadius: 10, buttonFullWidth: false, closeButton: true, contentVertical: 'start',
};
const WIDGET_STYLE_DEFAULTS = {
  minHeight: 160, heightMode: 'auto', heightPx: 280, gridSpan: 1,
  padding: 18, radius: 8, opacity: 96, backgroundColor: '#344954', textColor: '#F2F6F7',
  fontFamily: 'Inter, Arial, sans-serif', titleSize: 16, descriptionSize: 11, iconSize: 25, titleWeight: 500, textAlign: 'left',
  borderWidth: 1, shadow: 18, imageFit: 'cover', imageOverlay: 68,
};
const FONT_OPTIONS = [
  ['Inter, Arial, sans-serif', 'Inter / Moderna'], ['Roboto, Arial, sans-serif', 'Roboto'],
  ['Arial, Helvetica, sans-serif', 'Arial'], ['Helvetica, Arial, sans-serif', 'Helvetica'],
  ['Verdana, Geneva, sans-serif', 'Verdana'], ['Tahoma, Geneva, sans-serif', 'Tahoma'],
  ['Trebuchet MS, Arial, sans-serif', 'Trebuchet'], ['Georgia, serif', 'Georgia / Serif'],
  ['Times New Roman, serif', 'Times New Roman'], ['Courier New, monospace', 'Courier New'],
  ['monospace', 'Monoespaçada'],
];
const POPUP_POSITIONS = [['center','Centralizado'],['bottom','Embaixo (painel longo)'],['top','Em cima'],['left','Painel lateral esquerdo'],['right','Painel lateral direito']];
const POPUP_ANIMATIONS = [['none','Nenhuma'],['fade','Aparecer suave'],['rise','Subir'],['zoom','Zoom'],['slide-left','Entrar pela esquerda']];
function clampNumber(value, min, max, fallback) { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
function safeColor(value, fallback) { return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback; }
function normalizePopupStyle(style = {}) {
  const value = { ...POPUP_STYLE_DEFAULTS, ...(style || {}) };
  value.widthPct = clampNumber(value.widthPct, 35, 100, POPUP_STYLE_DEFAULTS.widthPct);
  value.height = clampNumber(value.height, 160, 1000, POPUP_STYLE_DEFAULTS.height);
  value.minHeight = clampNumber(value.minHeight, 120, 900, POPUP_STYLE_DEFAULTS.minHeight);
  value.cardOpacity = clampNumber(value.cardOpacity, 25, 100, 94);
  value.overlayOpacity = clampNumber(value.overlayOpacity, 0, 96, 76);
  value.blur = clampNumber(value.blur, 0, 24, 8);
  value.radius = clampNumber(value.radius, 0, 48, 18);
  value.padding = clampNumber(value.padding, 10, 64, 28);
  value.titleSize = clampNumber(value.titleSize, 14, 56, 30);
  value.messageSize = clampNumber(value.messageSize, 10, 30, 16);
  value.buttonSize = clampNumber(value.buttonSize, 10, 24, 13);
  value.titleWeight = [300,400,500,600,700,800].includes(Number(value.titleWeight)) ? Number(value.titleWeight) : 400;
  value.messageWeight = [300,400,500,600,700].includes(Number(value.messageWeight)) ? Number(value.messageWeight) : 400;
  value.lineHeight = clampNumber(value.lineHeight, 1.1, 2.4, 1.65);
  value.letterSpacing = clampNumber(value.letterSpacing, -1, 5, 0);
  value.borderWidth = clampNumber(value.borderWidth, 0, 5, 1);
  value.shadow = clampNumber(value.shadow, 0, 70, 34);
  value.animationDuration = clampNumber(value.animationDuration, 100, 1400, 280);
  value.imageHeight = clampNumber(value.imageHeight, 60, 480, 148);
  value.imageOpacity = clampNumber(value.imageOpacity, 0, 100, 35);
  value.buttonRadius = clampNumber(value.buttonRadius, 0, 40, 10);
  if (!POPUP_POSITIONS.some(([key]) => key === value.position)) value.position = 'center';
  if (!POPUP_ANIMATIONS.some(([key]) => key === value.animation)) value.animation = 'rise';
  if (!FONT_OPTIONS.some(([key]) => key === value.fontFamily)) value.fontFamily = POPUP_STYLE_DEFAULTS.fontFamily;
  if (!['auto','fixed'].includes(value.heightMode)) value.heightMode = 'auto';
  if (!['left','center','right'].includes(value.textAlign)) value.textAlign = 'left';
  if (!['banner','background'].includes(value.imageMode)) value.imageMode = 'banner';
  if (!['cover','contain','fill'].includes(value.imageFit)) value.imageFit = 'cover';
  if (!['center','top','bottom','left','right'].includes(value.imagePosition)) value.imagePosition = 'center';
  if (!['none','uppercase','capitalize'].includes(value.titleTransform)) value.titleTransform = 'none';
  if (!['start','center','end','between'].includes(value.contentVertical)) value.contentVertical = 'start';
  value.buttonFullWidth = Boolean(value.buttonFullWidth);
  value.closeButton = value.closeButton !== false;
  for (const key of ['surfaceColor','titleColor','messageColor','borderColor','buttonColor','buttonTextColor']) value[key] = safeColor(value[key], POPUP_STYLE_DEFAULTS[key]);
  return value;
}
function normalizeWidgetStyle(style = {}) {
  const value = { ...WIDGET_STYLE_DEFAULTS, ...(style || {}) };
  value.minHeight = clampNumber(value.minHeight, 70, 900, 160);
  value.heightPx = clampNumber(value.heightPx, 100, 1100, 280);
  value.gridSpan = clampNumber(value.gridSpan, 1, 3, 1);
  value.gridSpanCustomized = Boolean(value.gridSpanCustomized);
  if (!['auto','fixed'].includes(value.heightMode)) value.heightMode = 'auto';
  value.padding = clampNumber(value.padding, 6, 48, 18);
  value.radius = clampNumber(value.radius, 0, 42, 8);
  value.opacity = clampNumber(value.opacity, 20, 100, 96);
  value.titleSize = clampNumber(value.titleSize, 10, 34, 16);
  value.descriptionSize = clampNumber(value.descriptionSize, 8, 24, 11);
  value.iconSize = clampNumber(value.iconSize, 10, 60, 25);
  value.titleWeight = [300,400,500,600,700,800].includes(Number(value.titleWeight)) ? Number(value.titleWeight) : 500;
  if (!FONT_OPTIONS.some(([key]) => key === value.fontFamily)) value.fontFamily = WIDGET_STYLE_DEFAULTS.fontFamily;
  value.borderWidth = clampNumber(value.borderWidth, 0, 5, 1);
  value.shadow = clampNumber(value.shadow, 0, 60, 18);
  value.imageOverlay = clampNumber(value.imageOverlay, 0, 95, 68);
  value.backgroundColor = safeColor(value.backgroundColor, WIDGET_STYLE_DEFAULTS.backgroundColor);
  value.textColor = safeColor(value.textColor, WIDGET_STYLE_DEFAULTS.textColor);
  if (!['left','center','right'].includes(value.textAlign)) value.textAlign = 'left';
  if (!['cover','contain','fill'].includes(value.imageFit)) value.imageFit = 'cover';
  return value;
}

export function normalizeWidgetLayoutItem(item = {}) {
  const defaultSpan = item.size === 'large' ? 2 : item.size === 'full' ? 3 : 1;
  const customized = item.style?.gridSpanCustomized === true;
  item.style = normalizeWidgetStyle({
    ...(item.style || {}),
    gridSpan: customized ? item.style.gridSpan : defaultSpan,
    gridSpanCustomized: customized,
  });
  return item;
}
function hexToRgba(hex, opacity) {
  const safe = safeColor(hex, '#263B46');
  const n = parseInt(safe.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clampNumber(opacity,0,100,100)/100})`;
}
function popupCssVars(styleInput = {}) {
  const style = normalizePopupStyle(styleInput);
  return `--popup-width:${style.widthPct}vw;--popup-height:${style.height}px;--popup-min-height:${style.minHeight}px;--popup-card-bg:${hexToRgba(style.surfaceColor,style.cardOpacity)};--popup-overlay-bg:${hexToRgba('#050A0E',style.overlayOpacity)};--popup-blur:${style.blur}px;--popup-radius:${style.radius}px;--popup-padding:${style.padding}px;--popup-font:${style.fontFamily};--popup-title-size:${style.titleSize}px;--popup-message-size:${style.messageSize}px;--popup-button-size:${style.buttonSize}px;--popup-title-weight:${style.titleWeight};--popup-message-weight:${style.messageWeight};--popup-line-height:${style.lineHeight};--popup-letter-spacing:${style.letterSpacing}px;--popup-title-color:${style.titleColor};--popup-message-color:${style.messageColor};--popup-border-color:${style.borderColor};--popup-border-width:${style.borderWidth}px;--popup-shadow:${style.shadow}px;--popup-button-bg:${style.buttonColor};--popup-button-color:${style.buttonTextColor};--popup-animation-duration:${style.animationDuration}ms;--popup-text-align:${style.textAlign};--popup-title-transform:${style.titleTransform};--popup-button-radius:${style.buttonRadius}px;--popup-button-width:${style.buttonFullWidth ? '100%' : 'auto'};--popup-image-opacity:${style.imageOpacity/100};--popup-image-fit:${style.imageFit};--popup-image-position:${style.imagePosition};--popup-content-justify:${({start:'flex-start',center:'center',end:'flex-end',between:'space-between'})[style.contentVertical]}`;
}
function widgetCssVars(styleInput = {}, item = {}) {
  const spanFallback = item.size === 'large' ? 2 : item.size === 'full' ? 3 : 1;
  const s = normalizeWidgetStyle({ ...styleInput, gridSpan: styleInput?.gridSpan ?? spanFallback });
  return `--widget-min-height:${s.minHeight}px;--widget-height:${s.heightMode === 'fixed' ? `${s.heightPx}px` : 'auto'};--widget-grid-span:${s.gridSpan};--widget-padding:${s.padding}px;--widget-radius:${s.radius}px;--widget-bg:${hexToRgba(s.backgroundColor,s.opacity)};--widget-text:${s.textColor};--widget-font:${s.fontFamily};--widget-title-size:${s.titleSize}px;--widget-description-size:${s.descriptionSize}px;--widget-icon-size:${s.iconSize}px;--widget-title-weight:${s.titleWeight};--widget-text-align:${s.textAlign};--widget-border-width:${s.borderWidth}px;--widget-shadow:${s.shadow}px;--widget-image-fit:${s.imageFit};--widget-image-overlay:${s.imageOverlay}%`;
}
function fileToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler um arquivo da biblioteca.'));
    reader.readAsDataURL(blob);
  });
}
function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function collectThemeAssetIds(layout = {}) {
  const ids = new Set();
  [...(layout.screens?.home || []), ...(layout.screens?.apps || []), ...(layout.popups || [])].forEach((item) => {
    if (item.imageAssetId) ids.add(item.imageAssetId);
    if (item.style?.imageAssetId) ids.add(item.style.imageAssetId);
  });
  return [...ids];
}

export function remapThemeAssetIds(layout, assetMap) {
  [...(layout.screens?.home || []), ...(layout.screens?.apps || []), ...(layout.popups || [])].forEach((item) => {
    if (item.imageAssetId && assetMap.has(item.imageAssetId)) item.imageAssetId = assetMap.get(item.imageAssetId);
    if (item.style?.imageAssetId && assetMap.has(item.style.imageAssetId)) item.style.imageAssetId = assetMap.get(item.style.imageAssetId);
  });
  return layout;
}

async function exportUniversalThemePackage(layout) {
  const ids = collectThemeAssetIds(layout);
  const embeddedAssets = [];
  let totalBytes = 0;
  for (const id of ids) {
    const asset = await getAsset(id);
    if (!asset?.blob) continue;
    totalBytes += asset.size || asset.blob.size || 0;
    if (totalBytes > 45 * 1024 * 1024) throw new Error('As imagens deste tema ultrapassam 45 MB. Reduza os arquivos antes de gerar o pacote universal.');
    embeddedAssets.push({ id: asset.id, name: asset.name, type: asset.type, category: asset.category, size: asset.size, dataUrl: await fileToDataUrl(asset.blob) });
  }
  const payload = {
    format: 'voyage-ambient-theme-package', packageVersion: 1,
    createdAt: new Date().toISOString(), application: { name: 'Voyage Ambient', version: '0.4.0' },
    theme: clone(layout), assets: embeddedAssets,
    instructions: 'Pacote universal de tema. Envie este JSON ao proprietário/desenvolvedor para incorporar o tema ao código-fonte ou importe-o em outro navegador pelo Editor Visual.'
  };
  const slug = String(layout.name || layout.themeId || 'tema').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'tema';
  downloadJsonFile(`voyage-ambient-tema-${slug}.json`, payload);
  return { assets: embeddedAssets.length, size: totalBytes };
}
async function importUniversalThemePackage(file) {
  const pkg = JSON.parse(await file.text());
  if (pkg?.format !== 'voyage-ambient-theme-package' || !pkg.theme || !pkg.theme.screens || !Array.isArray(pkg.theme.screens.home) || !Array.isArray(pkg.theme.screens.apps)) {
    throw new Error('Arquivo inválido. Selecione um pacote universal de tema Voyage Ambient.');
  }
  const layout = clone(pkg.theme);
  const assetMap = new Map();
  for (const entry of (Array.isArray(pkg.assets) ? pkg.assets : [])) {
    if (!entry?.dataUrl || !entry?.name) continue;
    const match = String(entry.dataUrl).match(/^data:([^;,]+)?;base64,([\s\S]+)$/);
    if (!match) continue;
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: match[1] || entry.type || 'application/octet-stream' });
    const fileObject = new File([blob], entry.name, { type: blob.type });
    const stored = await saveAsset(fileObject, entry.category || 'image');
    assetMap.set(entry.id, stored.id);
  }
  remapThemeAssetIds(layout, assetMap);
  const config = getConfig();
  const layouts = [...(config.personalization?.layouts || []).filter((item) => item.themeId !== layout.themeId), layout];
  const result = saveConfig({ ...config, theme: { ...config.theme, activeId: layout.themeId }, personalization: { ...config.personalization, layouts } });
  if (!result.ok) throw new Error(result.error || 'Não foi possível salvar o tema importado.');
  onConfigChange(result.config);
  editorState.themeId = layout.themeId;
  editorState.screen = 'home'; editorState.selectedId = null; editorState.popupPreviewId = null;
  if (result.config.theme.activeId === layout.themeId) { applyThemeStyle(layout.style, true); await applyLiveLayout(layout); }
  return layout;
}

function persistLayout(layout, { activate = false, apply = false } = {}) {
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
  if (apply && layout.themeId === result.config.theme.activeId) {
    applyThemeStyle(layout.style, true);
    applyLiveLayout(layout);
  } else {
    applyThemeStyle(layout.style, false);
  }
  return true;
}

export function normalizePopupStyleExport(style = {}) { return normalizePopupStyle(style); }
export function normalizeWidgetStyleExport(style = {}) { return normalizeWidgetStyle(style); }

export function sortEditorItems(items) {
  return [...(items || [])].sort((a, b) => {
    const priorityDiff = (Number(a.priority) || 2) - (Number(b.priority) || 2);
    return priorityDiff || ((Number(a.order) || 0) - (Number(b.order) || 0));
  });
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
  const span = Math.max(1, Math.min(3, Number(item.style?.gridSpan) || (item.size === 'large' ? 2 : item.size === 'full' ? 3 : 1)));
  const cls = `editor-widget-card priority-${item.priority || 2} size-${item.size || 'medium'} span-${span} ${selected ? 'is-selected' : ''} ${item.enabled === false ? 'is-hidden' : ''} ${isImage ? 'has-image' : ''}`;
  const clock = item.type === 'clock' ? `<strong class="editor-clock-value">${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</strong>` : '';
  const imgMissing = isImage && !image ? '<span class="editor-image-empty">ADICIONE UMA IMAGEM</span>' : '';
  return `<button class="${cls}" data-preview-select="${escapeHtml(item.id)}" style="${widgetCssVars(item.style, item)}${style ? `;${style.slice(7, -1)}` : ''}">
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
    const ps = normalizePopupStyle(selected.style);
    const range = (label, field, min, max, step = 1, suffix = '') => `<label>${label}<span class="editor-range-line"><input type="range" min="${min}" max="${max}" step="${step}" value="${ps[field]}" data-popup-style="${field}"><output data-range-output="${field}">${ps[field]}${suffix}</output></span></label>`;
    const color = (label, field) => `<label class="editor-color-line">${label}<input type="color" value="${ps[field]}" data-popup-style="${field}"></label>`;
    return `<div class="editor-inspector-form popup-inspector-form">
      <div class="editor-inspector-head"><span class="eyebrow">PROPRIEDADES DO POP-UP</span><b>${escapeHtml(selected.name || 'Pop-up')}</b></div>
      <label>Nome interno<input class="editor-field" data-popup-field="name" value="${escapeHtml(selected.name)}" maxlength="36"></label>
      <label>Título exibido<input class="editor-field" data-popup-field="title" value="${escapeHtml(selected.title)}" maxlength="48"></label>
      <label>Mensagem<textarea class="editor-field" data-popup-field="message" rows="5" maxlength="500">${escapeHtml(selected.message)}</textarea></label>
      <label>Texto do botão<input class="editor-field" data-popup-field="actionLabel" value="${escapeHtml(selected.actionLabel || 'Entendi')}" maxlength="32"></label>
      <label>Ação do botão<select class="editor-field" data-popup-field="actionView">${['', 'lighting', 'camera', 'vehicle', 'apps', 'settings'].map((v) => `<option value="${v}" ${selected.actionView === v ? 'selected' : ''}>${v || 'Somente fechar'}</option>`).join('')}</select></label>
      <details class="editor-settings-group" open><summary>Dimensões e posição</summary>
        ${range('Largura da janela','widthPct',35,100,1,'%')}
        <label>Altura<select class="editor-field" data-popup-style="heightMode"><option value="auto" ${ps.heightMode==='auto'?'selected':''}>Automática (acompanha o conteúdo)</option><option value="fixed" ${ps.heightMode==='fixed'?'selected':''}>Altura fixa</option></select></label>
        ${range('Altura fixa','height',160,1000,10,' px')}
        ${range('Altura mínima','minHeight',120,900,10,' px')}
        <label>Posição na tela<select class="editor-field" data-popup-style="position">${POPUP_POSITIONS.map(([v,l])=>`<option value="${v}" ${ps.position===v?'selected':''}>${l}</option>`).join('')}</select></label>
        ${range('Espaço interno','padding',10,64,1,' px')}
      </details>
      <details class="editor-settings-group" open><summary>Transparência e acabamento</summary>
        ${range('Opacidade do painel','cardOpacity',25,100,1,'%')}
        ${range('Escurecimento do fundo','overlayOpacity',0,96,1,'%')}
        ${range('Desfoque atrás do pop-up','blur',0,24,1,' px')}
        ${range('Arredondamento','radius',0,48,1,' px')}
        ${range('Borda','borderWidth',0,5,1,' px')}
        ${range('Sombra','shadow',0,70,1,'')}
        ${color('Cor do painel','surfaceColor')}${color('Cor da borda','borderColor')}
      </details>
      <details class="editor-settings-group" open><summary>Texto e tipografia</summary>
        <label>Fonte<select class="editor-field" data-popup-style="fontFamily">${FONT_OPTIONS.map(([v,l])=>`<option value="${escapeHtml(v)}" ${ps.fontFamily===v?'selected':''}>${l}</option>`).join('')}</select></label>
        ${range('Tamanho do título','titleSize',14,56,1,' px')}
        ${range('Tamanho da mensagem','messageSize',10,30,1,' px')}
        ${range('Tamanho do botão','buttonSize',10,24,1,' px')}
        <label>Peso do título<select class="editor-field" data-popup-style="titleWeight">${[300,400,500,600,700,800].map(v=>`<option value="${v}" ${ps.titleWeight===v?'selected':''}>${v}</option>`).join('')}</select></label>
        <label>Peso da mensagem<select class="editor-field" data-popup-style="messageWeight">${[300,400,500,600,700].map(v=>`<option value="${v}" ${ps.messageWeight===v?'selected':''}>${v}</option>`).join('')}</select></label>
        ${range('Altura entre linhas','lineHeight',1.1,2.4,.05,'')}
        ${range('Espaçamento das letras','letterSpacing',-1,5,.1,' px')}
        <label>Alinhamento<select class="editor-field" data-popup-style="textAlign">${[['left','Esquerda'],['center','Centro'],['right','Direita']].map(([v,l])=>`<option value="${v}" ${ps.textAlign===v?'selected':''}>${l}</option>`).join('')}</select></label>
        ${color('Cor do título','titleColor')}${color('Cor da mensagem','messageColor')}
      </details>
      <details class="editor-settings-group"><summary>Botão, imagem e animação</summary>
        ${color('Cor do botão','buttonColor')}${color('Texto do botão','buttonTextColor')}
        <label>Imagem do pop-up<select class="editor-field" data-popup-style="imageAssetId"><option value="">Sem imagem</option>${assets.filter((asset) => asset.category === 'image').map((asset) => `<option value="${escapeHtml(asset.id)}" ${ps.imageAssetId === asset.id ? 'selected' : ''}>${escapeHtml(asset.name)}</option>`).join('')}</select></label>
        <label class="editor-upload-button" for="editorImageUpload">＋ Enviar imagem para o pop-up</label><input id="editorImageUpload" type="file" accept="image/*" hidden>
        <label>Apresentação da imagem<select class="editor-field" data-popup-style="imageMode"><option value="banner" ${ps.imageMode==='banner'?'selected':''}>Faixa superior</option><option value="background" ${ps.imageMode==='background'?'selected':''}>Fundo do painel</option></select></label>
        ${range('Altura da imagem','imageHeight',60,480,4,' px')}
        ${range('Opacidade da imagem','imageOpacity',0,100,1,'%')}
        <label>Preenchimento da imagem<select class="editor-field" data-popup-style="imageFit">${[['cover','Preencher painel'],['contain','Mostrar imagem inteira'],['fill','Esticar']].map(([v,l])=>`<option value="${v}" ${ps.imageFit===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label>Posição da imagem<select class="editor-field" data-popup-style="imagePosition">${[['center','Centro'],['top','Topo'],['bottom','Embaixo'],['left','Esquerda'],['right','Direita']].map(([v,l])=>`<option value="${v}" ${ps.imagePosition===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label>Transformação do título<select class="editor-field" data-popup-style="titleTransform">${[['none','Normal'],['uppercase','MAIÚSCULAS'],['capitalize','Iniciais maiúsculas']].map(([v,l])=>`<option value="${v}" ${ps.titleTransform===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label>Alinhamento vertical do conteúdo<select class="editor-field" data-popup-style="contentVertical">${[['start','Topo'],['center','Centro'],['end','Embaixo'],['between','Distribuído']].map(([v,l])=>`<option value="${v}" ${ps.contentVertical===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label class="editor-check"><input type="checkbox" data-popup-style="buttonFullWidth" ${ps.buttonFullWidth?'checked':''}> Botão ocupando toda a largura</label>
        <label class="editor-check"><input type="checkbox" data-popup-style="closeButton" ${ps.closeButton?'checked':''}> Mostrar botão fechar</label>
        ${range('Arredondamento do botão','buttonRadius',0,40,1,' px')}
        <label>Animação<select class="editor-field" data-popup-style="animation">${POPUP_ANIMATIONS.map(([v,l])=>`<option value="${v}" ${ps.animation===v?'selected':''}>${l}</option>`).join('')}</select></label>
        ${range('Duração da animação','animationDuration',100,1400,20,' ms')}
      </details>
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
    <details class="editor-settings-group"><summary>Aparência do componente</summary>
      ${(() => { const ws = normalizeWidgetStyle({ ...selected.style, gridSpan: selected.style?.gridSpan ?? (selected.size === 'large' ? 2 : selected.size === 'full' ? 3 : 1) }); return `<label>Fonte<select class="editor-field" data-widget-style="fontFamily">${FONT_OPTIONS.map(([v,l])=>`<option value="${escapeHtml(v)}" ${ws.fontFamily===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Altura do cartão<select class="editor-field" data-widget-style="heightMode"><option value="auto" ${ws.heightMode==='auto'?'selected':''}>Automática</option><option value="fixed" ${ws.heightMode==='fixed'?'selected':''}>Altura fixa</option></select></label><label>Esticar para baixo<span class="editor-range-line"><input type="range" min="100" max="900" step="10" value="${ws.heightPx}" data-widget-style="heightPx"><output data-range-output="heightPx">${ws.heightPx} px</output></span></label><label>Altura mínima<span class="editor-range-line"><input type="range" min="70" max="900" value="${ws.minHeight}" data-widget-style="minHeight"><output data-range-output="minHeight">${ws.minHeight} px</output></span></label><label>Espaço na horizontal<select class="editor-field" data-widget-style="gridSpan"><option value="1" ${Number(ws.gridSpan)===1?'selected':''}>1 coluna</option><option value="2" ${Number(ws.gridSpan)===2?'selected':''}>2 colunas</option><option value="3" ${Number(ws.gridSpan)===3?'selected':''}>3 colunas (largura total)</option></select></label><label>Espaço interno<span class="editor-range-line"><input type="range" min="6" max="48" value="${ws.padding}" data-widget-style="padding"><output data-range-output="padding">${ws.padding} px</output></span></label><label>Arredondamento<span class="editor-range-line"><input type="range" min="0" max="42" value="${ws.radius}" data-widget-style="radius"><output data-range-output="radius">${ws.radius} px</output></span></label><label>Transparência do painel<span class="editor-range-line"><input type="range" min="20" max="100" value="${ws.opacity}" data-widget-style="opacity"><output data-range-output="opacity">${ws.opacity}%</output></span></label><label>Tamanho do título<span class="editor-range-line"><input type="range" min="10" max="34" value="${ws.titleSize}" data-widget-style="titleSize"><output data-range-output="titleSize">${ws.titleSize} px</output></span></label><label>Tamanho da descrição<span class="editor-range-line"><input type="range" min="8" max="24" value="${ws.descriptionSize}" data-widget-style="descriptionSize"><output data-range-output="descriptionSize">${ws.descriptionSize} px</output></span></label><label>Tamanho do ícone<span class="editor-range-line"><input type="range" min="10" max="60" value="${ws.iconSize}" data-widget-style="iconSize"><output data-range-output="iconSize">${ws.iconSize} px</output></span></label><label>Alinhamento<select class="editor-field" data-widget-style="textAlign">${[['left','Esquerda'],['center','Centro'],['right','Direita']].map(([v,l])=>`<option value="${v}" ${ws.textAlign===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Preenchimento da imagem<select class="editor-field" data-widget-style="imageFit">${[['cover','Preencher'],['contain','Conter'],['fill','Esticar']].map(([v,l])=>`<option value="${v}" ${ws.imageFit===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Opacidade da camada sobre imagem<span class="editor-range-line"><input type="range" min="0" max="95" value="${ws.imageOverlay}" data-widget-style="imageOverlay"><output data-range-output="imageOverlay">${ws.imageOverlay}%</output></span></label><label class="editor-color-line">Fundo do cartão<input type="color" value="${ws.backgroundColor}" data-widget-style="backgroundColor"></label><label class="editor-color-line">Cor do texto<input type="color" value="${ws.textColor}" data-widget-style="textColor"></label>`; })()}
    </details>
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
        <div class="editor-preview-heading"><span>${editorState.screen === 'home' ? 'VOYAGE AMBIENT' : 'MENU PRINCIPAL'}</span><b>${editorState.screen === 'home' ? 'Boa viagem.' : 'Aplicativos'}</b></div>
        <div class="editor-preview-grid ${editorState.screen === 'apps' ? 'apps-mode' : 'home-mode'}">${items.filter((item) => item.enabled !== false).map((item, index) => renderWidgetCard(item, index, assets, selectedId === item.id)).join('') || '<div class="editor-canvas-empty">Adicione componentes da biblioteca para começar.</div>'}</div>
        <div class="editor-preview-bottom"><span>PRÉVIA DO PROPRIETÁRIO</span><span>${escapeHtml(themeName.toUpperCase())}</span></div>
      </div>`;

  root.innerHTML = `<div class="editor-header">
      <div><span class="eyebrow">FERRAMENTA DO PROPRIETÁRIO</span><h2>Editor visual</h2><p>Monte os painéis, organize os aplicativos e personalize cada tema.</p></div>
      <div class="editor-header-actions"><button class="editor-action-button" data-editor-back>← Voltar</button><button class="editor-save-button" data-save-layout>Salvar e aplicar</button></div>
    </div>
    <div class="editor-toolbar">
      <label>TEMA EM EDIÇÃO<select id="editorThemeSelect" class="editor-field">${getThemeChoices().map((theme) => `<option value="${theme.id}" ${theme.id === editorState.themeId ? 'selected' : ''}>${escapeHtml(theme.name)}</option>`).join('')}</select></label>
      <div class="editor-screen-tabs">${[['home','Tela inicial'],['apps','Aplicativos'],['popups','Pop-ups']].map(([id,label]) => `<button class="editor-tab ${editorState.screen === id ? 'active' : ''}" data-editor-screen="${id}">${label}</button>`).join('')}</div>
      <div class="editor-toolbar-actions"><button class="editor-action-button" data-create-theme>＋ Novo tema</button><button class="editor-action-button" data-import-theme>Importar tema</button><input type="file" accept="application/json,.json" data-theme-package-upload hidden><button class="editor-activate-button" data-activate-theme>Aplicar tema à central</button></div>
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
    <div class="editor-footer-note"><span>✓ Edições salvas localmente • tema ativo somente após aplicar</span><span>Os widgets visuais não criam funções físicas automaticamente. Hardware novo exige integração com o ESP32.</span></div>
    ${editorState.saveDialog ? `<div class="editor-save-dialog"><div class="editor-save-dialog-card"><button class="editor-dialog-close" data-close-save-dialog aria-label="Fechar">×</button><span class="eyebrow">PUBLICAÇÃO DO TEMA</span><h3>Tema salvo</h3><p>O tema foi salvo e aplicado à tela inicial deste aparelho. Para levar exatamente este tema e suas imagens ao projeto GitHub, outro navegador ou futura versão APK, gere o pacote universal abaixo e envie o arquivo JSON ao proprietário/desenvolvedor.</p><div class="editor-dialog-actions"><button class="editor-action-button" data-close-save-dialog>Continuar editando</button><button class="editor-save-button" data-export-theme-package>Baixar pacote universal</button></div><small>Envie o arquivo JSON gerado aqui na conversa. Posso incorporar esse tema ao código-fonte e preparar os arquivos para publicar no GitHub.</small></div></div>` : ''}`;
  if (editorState.themeId === getConfig().theme.activeId) applyThemeStyle(layout.style, true);
  applyThemeStyle(layout.style, false);
}
renderEditor.token = 0;

function renderPopupPreview(layout, popupId) {
  const popup = layout.popups.find((item) => item.id === popupId);
  if (!popup) return '';
  const style = normalizePopupStyle(popup.style);
  const image = style.imageAssetId && urlCache.get(style.imageAssetId) ? `<div class="editor-popup-image ${style.imageMode === 'background' ? 'as-background' : ''}" style="height:${style.imageMode === 'banner' ? style.imageHeight : 0}px;--popup-image:url('${urlCache.get(style.imageAssetId)}')"></div>` : '';
  return `<div class="editor-popup-overlay" data-position="${style.position}" data-height-mode="${style.heightMode}" data-animation="${style.animation}" style="${popupCssVars(style)}"><div class="editor-popup-card" style="height:${style.heightMode === 'fixed' ? style.height + 'px' : 'auto'};min-height:${style.minHeight}px">${style.closeButton ? '<button class="editor-dialog-close" data-close-popup-preview aria-label="Fechar prévia">×</button>' : ''}${image}<span class="eyebrow">PRÉVIA DO POP-UP</span><h3>${escapeHtml(popup.title)}</h3><p>${escapeHtml(popup.message)}</p><button class="editor-popup-button" data-close-popup-preview>${escapeHtml(popup.actionLabel || 'Entendi')}</button></div></div>`;
}

function addWidget(type) {
  const layout = getThemeLayout();
  const source = (editorState.screen === 'apps' ? APP_LIBRARY : WIDGET_LIBRARY).find((item) => item.type === type) || WIDGET_LIBRARY.find((item) => item.type === type) || WIDGET_LIBRARY[WIDGET_LIBRARY.length - 1];
  const list = layout.screens[editorState.screen];
  const item = {
    id: uid(type), type: source.type, title: source.name || 'Novo painel', subtitle: source.description || '', icon: source.icon || '＋', target: source.target || '',
    priority: list.length === 0 ? 1 : 2, size: source.size || 'medium', enabled: true, order: list.length + 1, imageAssetId: '', popupId: '', style: { ...WIDGET_STYLE_DEFAULTS, gridSpan: source.size === 'large' ? 2 : source.size === 'full' ? 3 : 1 },
  };
  list.push(item);
  editorState.selectedId = item.id;
  persistLayout(layout, { apply: false });
  renderEditor();
  toast('Componente adicionado. Edite as propriedades ao lado.');
}

function addPopup() {
  const layout = getThemeLayout();
  const popup = { id: uid('popup'), name: `Pop-up ${layout.popups.length + 1}`, title: 'Novo aviso', message: 'Escreva aqui a informação que deseja exibir.', actionLabel: 'Entendi', actionView: '', style: { ...POPUP_STYLE_DEFAULTS } };
  layout.popups.push(popup);
  editorState.selectedId = popup.id;
  persistLayout(layout, { apply: false });
  renderEditor();
  toast('Pop-up criado. Edite o texto nas propriedades.');
}

function updateSelected(field, value, popup = false, styleGroup = '') {
  const layout = getThemeLayout();
  const collection = popup ? layout.popups : layout.screens[editorState.screen];
  const selected = collection.find((item) => item.id === editorState.selectedId);
  if (!selected) return;
  if (field === 'priority') value = Number(value);
  if (field === 'enabled') value = Boolean(value);
  if (field === 'target' && !VALID_TARGETS.has(value)) value = '';
  if (!popup && field === 'size') {
    selected.size = value;
    if (!selected.style?.gridSpanCustomized) {
      const nextSpan = value === 'large' ? 2 : value === 'full' ? 3 : 1;
      selected.style = normalizeWidgetStyle({ ...(selected.style || {}), gridSpan: nextSpan, gridSpanCustomized: false });
    }
  } else if (styleGroup) {
    selected.style = { ...(selected.style || {}), [field]: value };
    if (!popup && field === 'heightPx') selected.style.heightMode = 'fixed';
    if (!popup && field === 'gridSpan') selected.style.gridSpanCustomized = true;
    selected.style = popup ? normalizePopupStyle(selected.style) : normalizeWidgetStyle(selected.style);
  }
  else if (field !== 'size') selected[field] = value;
  persistLayout(layout, { apply: false });
  if (field === 'title' || field === 'name') {
    const label = root.querySelector('.editor-inspector-head b');
    if (label) label.textContent = value;
  }
  updatePreviewSelection(layout);
}

function updatePreviewSelection(layout) {
  const container = root.querySelector('.editor-preview-grid');
  if (!container || editorState.screen === 'popups') return;
  const items = sortedItems(layout.screens[editorState.screen]).filter((item) => item.enabled !== false);
  // Os URLs dos arquivos já foram resolvidos ao abrir o editor ou enviar uma imagem.
  // Redesenhar com o cache evita consultas IndexedDB a cada tecla ou movimento de slider.
  container.innerHTML = items.map((item, index) => renderWidgetCard(item, index, [], editorState.selectedId === item.id)).join('') || '<div class="editor-canvas-empty">Adicione componentes da biblioteca para começar.</div>';
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
  persistLayout(layout, { apply: false });
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
  persistLayout(layout, { apply: false });
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
  persistLayout(layout, { apply: false });
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
    if (editorState.screen === 'popups') {
      const popup = layout.popups.find((entry) => entry.id === editorState.selectedId);
      if (popup) { popup.style = normalizePopupStyle(popup.style); popup.style.imageAssetId = asset.id; }
    } else {
      const item = layout.screens[editorState.screen]?.find((entry) => entry.id === editorState.selectedId);
      if (item) item.imageAssetId = asset.id;
    }
    persistLayout(layout, { apply: false });
    await renderEditor();
    toast('Imagem adicionada à biblioteca local e aplicada ao componente.');
  } catch (error) { toast(`Falha ao adicionar imagem: ${error.message}`); }
  event.target.value = '';
}

function openPopup(popupId, layout = getThemeLayout()) {
  const popup = layout.popups.find((item) => item.id === popupId);
  if (!popup) return false;
  const style = normalizePopupStyle(popup.style);
  document.querySelector('.voyage-runtime-popup')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'voyage-runtime-popup';
  overlay.dataset.position = style.position;
  overlay.dataset.heightMode = style.heightMode;
  overlay.dataset.animation = style.animation;
  overlay.setAttribute('style', popupCssVars(style));
  const imageUrl = style.imageAssetId ? urlCache.get(style.imageAssetId) : '';
  const image = imageUrl ? `<div class="editor-popup-image ${style.imageMode === 'background' ? 'as-background' : ''}" style="height:${style.imageMode === 'banner' ? style.imageHeight : 0}px;--popup-image:url('${imageUrl}')"></div>` : '';
  overlay.innerHTML = `<div class="voyage-runtime-popup-card">${style.closeButton ? '<button class="editor-dialog-close" data-runtime-popup-close aria-label="Fechar">×</button>' : ''}${image}<span class="eyebrow">VOYAGE AMBIENT</span><h2>${escapeHtml(popup.title)}</h2><p>${escapeHtml(popup.message)}</p><button class="editor-popup-button" data-runtime-popup-close>${escapeHtml(popup.actionLabel || 'Entendi')}</button></div>`;
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
  const imageStyle = `style="${widgetCssVars(item.style, item)}${image && !image.startsWith('asset-pending:') ? `;--live-widget-image:url('${image}')` : ''}"`;
  const typeIcon = item.icon || '＋';
  const span = Math.max(1, Math.min(3, Number(item.style?.gridSpan) || (item.size === 'large' ? 2 : item.size === 'full' ? 3 : 1)));
  const commonTitle = `<div class="editor-live-top"><span class="editor-live-icon">${escapeHtml(typeIcon)}</span><span class="editor-live-priority">${['','PRINCIPAL','SECUNDÁRIO','APOIO'][Number(item.priority) || 2]}</span></div><h2>${escapeHtml(item.title || item.name || 'Painel')}</h2><p>${escapeHtml(item.subtitle || 'Componente personalizado')}</p>`;
  if (screen === 'apps') return `<button class="app-tile editor-live-app ${image ? 'has-image' : ''}" ${nav} ${imageStyle}><span class="app-icon">${escapeHtml(typeIcon)}</span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.subtitle || '')}</small>${image ? '<span class="editor-live-image-overlay"></span>' : ''}</button>`;
  return `<button class="dash-tile editor-live-card priority-${Number(item.priority) || 2} size-${item.size || 'medium'} span-${span} type-${escapeHtml(item.type)} ${image ? 'has-image' : ''}" ${nav} ${imageStyle}>
    <div class="editor-live-content">${commonTitle}${item.type === 'clock' ? `<strong class="editor-live-clock">${new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date())}</strong>` : ''}${item.type === 'lighting' ? `<div class="editor-live-light-indicator" style="--ambient:${getConfig().lighting.color}"></div><span class="editor-live-meta">ILUMINAÇÃO • ${getConfig().lighting.brightness}%</span>` : ''}</div>
    ${image ? '<span class="editor-live-image-overlay"></span>' : ''}<span class="editor-live-order">${index + 1}</span>
  </button>`;
}

async function applyLiveLayout(layout) {
  if (layout.themeId !== getConfig().theme.activeId) return;
  const assets = await listAssets().catch(() => []);
  await resolveAssetUrls(assets);
  const home = document.querySelector('#home-dashboard, .home-dashboard');
  if (home) {
    const items = sortedItems(layout.screens.home).filter((item) => item.enabled !== false);
    home.classList.add('editor-live-dashboard');
    home.dataset.layoutTheme = layout.themeId;
    home.innerHTML = items.map((item, index) => widgetLiveMarkup(item, index, assets, 'home')).join('') || '<div class="editor-canvas-empty">Adicione painéis pelo Modo Desenvolvedor.</div>';
  }
  const apps = document.querySelector('.apps-grid');
  if (apps) {
    const items = sortedItems(layout.screens.apps).filter((item) => item.enabled !== false);
    apps.dataset.layoutTheme = layout.themeId;
    apps.innerHTML = items.map((item, index) => widgetLiveMarkup(item, index, assets, 'apps')).join('') || '<div class="editor-canvas-empty">Adicione aplicativos pelo Editor Visual.</div>';
  }
}

function restoreLiveLayout() {
  const activeId = getConfig().theme.activeId || 'land-rover';
  const stored = (getConfig().personalization?.layouts || []).find((item) => item.themeId === activeId);
  const layout = getThemeLayout(activeId);
  let shouldPersist = !stored;

  // Migração segura: adiciona os quatro atalhos apenas ao layout inicial intocado da 0.4.0.
  // Se o proprietário já personalizou a lista (adicionou, removeu ou duplicou cartões), não altera sua composição.
  const starterIds = ['home-lighting', 'home-camera', 'home-vehicle'];
  const storedHome = stored?.screens?.home || [];
  const isUntouchedStarter = storedHome.length === 3 && starterIds.every((id) => storedHome.some((item) => item.id === id));
  if (isUntouchedStarter) {
    const starter = createDefaultEditorLayout(activeId).screens.home;
    const shortcutIds = new Set(storedHome.map((item) => item.id));
    layout.screens.home.push(...starter.filter((item) => item.id.startsWith('home-shortcut-') && !shortcutIds.has(item.id)));
    layout.screens.home.forEach((item, index) => { item.order = index + 1; });
    shouldPersist = true;
  }

  // Persiste e ativa o primeiro layout; em edições posteriores a tela só muda no comando Salvar e aplicar.
  if (shouldPersist) persistLayout(layout, { activate: !stored, apply: false });
  applyThemeStyle(layout.style, true);
  applyLiveLayout(layout);
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
    if (button.matches('[data-close-save-dialog]')) { editorState.saveDialog = false; renderEditor(); return; }
    if (button.matches('[data-export-theme-package]')) { try { const result = await exportUniversalThemePackage(getThemeLayout()); toast(`Pacote universal gerado com ${result.assets} imagem(ns). Envie o JSON aqui para incorporar ao código-fonte.`); } catch (error) { toast(`Não foi possível gerar o pacote: ${error.message}`); } return; }
    if (button.matches('[data-import-theme]')) { root.querySelector('[data-theme-package-upload]')?.click(); return; }
    if (button.matches('[data-save-layout]')) {
      clearTimeout(saveTimer);
      const layout = getThemeLayout();
      const ok = persistLayout(layout, { activate: true, apply: false });
      if (ok) {
        applyThemeStyle(layout.style, true);
        await applyLiveLayout(layout);
        editorState.saveDialog = true;
        renderEditor();
        toast('Tema salvo e aplicado à tela inicial deste dispositivo.');
      }
      return;
    }
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
    if (button.matches('[data-activate-theme]')) { const layout = getThemeLayout(); const ok = persistLayout(layout, { activate: true, apply: false }); if (ok) { applyThemeStyle(layout.style, true); await applyLiveLayout(layout); toast('Tema aplicado à central.'); } return; }
  });

  root.addEventListener('change', async (event) => {
    const target = event.target;
    if (target.matches('#editorThemeSelect')) { editorState.themeId = target.value; editorState.selectedId = null; editorState.popupPreviewId = null; renderEditor(); return; }
    if (target.matches('[data-widget-field]')) {
      if (target.type !== 'text' && target.tagName !== 'TEXTAREA') updateSelected(target.dataset.widgetField, target.type === 'checkbox' ? target.checked : target.value);
      await renderEditor(); return;
    }
    if (target.matches('[data-popup-field]')) {
      if (target.tagName === 'SELECT') updateSelected(target.dataset.popupField, target.value, true);
      await renderEditor(); return;
    }
    if (target.matches('[data-popup-style]')) {
      if (target.type !== 'range') updateSelected(target.dataset.popupStyle, target.type === 'checkbox' ? target.checked : target.value, true, 'style');
      await renderEditor(); return;
    }
    if (target.matches('[data-widget-style]')) {
      if (target.type !== 'range') updateSelected(target.dataset.widgetStyle, target.value, false, 'style');
      await renderEditor(); return;
    }
    if (target.matches('[data-style-field]')) {
      const layout = getThemeLayout();
      layout.style[target.dataset.styleField] = target.dataset.styleField === 'radius' ? Number(target.value) : target.value;
      persistLayout(layout, { apply: false });
      const radius = root.querySelector('#editorRadiusValue'); if (radius) radius.textContent = `${layout.style.radius}px`;
      applyThemeStyle(layout.style, layout.themeId === getConfig().theme.activeId);
      return;
    }
    if (target.matches('[data-widget-field="imageAssetId"]')) { await renderEditor(); }
  });

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (target.matches('[data-range-output]')) return;
    if (target.matches('input[type=range][data-popup-style], input[type=range][data-widget-style]')) {
      const field = target.dataset.popupStyle || target.dataset.widgetStyle;
      const output = root.querySelector(`[data-range-output="${field}"]`);
      if (output) { const suffix = field.toLowerCase().includes('opacity') || field === 'widthPct' || field === 'imageOverlay' || field === 'imageOpacity' ? '%'   : (['height','heightPx','minHeight','padding','radius','titleSize','messageSize','buttonSize','blur','borderWidth','imageHeight','descriptionSize','iconSize','buttonRadius'].includes(field) ? ' px' : (field === 'animationDuration' ? ' ms' : '')); output.textContent = `${target.value}${suffix}`; }
      const isPopup = Boolean(target.dataset.popupStyle);
      updateSelected(field, target.value, isPopup, 'style');
      if (isPopup) {
        const layout = getThemeLayout();
        const popup = layout.popups.find((item) => item.id === editorState.selectedId);
        const preview = root.querySelector('.editor-popup-overlay');
        if (popup && preview) {
          const style = normalizePopupStyle(popup.style);
          preview.dataset.position = style.position;
          preview.dataset.animation = style.animation;
          preview.setAttribute('style', popupCssVars(style));
          preview.dataset.heightMode = style.heightMode;
          const card = preview.querySelector('.editor-popup-card');
          if (card) { card.style.minHeight = `${style.minHeight}px`; card.style.height = style.heightMode === 'fixed' ? `${style.height}px` : 'auto'; }
        }
      } else {
        const layout = getThemeLayout();
        const item = layout.screens[editorState.screen]?.find((entry) => entry.id === editorState.selectedId);
        const preview = root.querySelector(`[data-preview-select="${editorState.selectedId}"]`);
        if (item && preview) preview.setAttribute('style', widgetCssVars(item.style, item));
      }
      return;
    }
    if (target.matches('[data-style-field]')) {
      const layout = getThemeLayout();
      layout.style[target.dataset.styleField] = target.dataset.styleField === 'radius' ? Number(target.value) : target.value;
      applyThemeStyle(layout.style, false);
      persistLayout(layout, { apply: false });
      const radius = root.querySelector('#editorRadiusValue'); if (radius) radius.textContent = `${layout.style.radius}px`;
    }
    if (target.matches('[data-widget-field="title"], [data-widget-field="subtitle"]')) {
      updateSelected(target.dataset.widgetField, target.value);
    }
    if (target.matches('[data-popup-field="title"], [data-popup-field="message"], [data-popup-field="name"]')) {
      updateSelected(target.dataset.popupField, target.value, true);
      const preview = root.querySelector('.editor-popup-overlay .editor-popup-card');
      if (preview && target.dataset.popupField === 'title') preview.querySelector('h3')?.replaceChildren(document.createTextNode(target.value));
      if (preview && target.dataset.popupField === 'message') preview.querySelector('p')?.replaceChildren(document.createTextNode(target.value));
    }
  });

  root.addEventListener('change', async (event) => {
    if (event.target.matches('#editorImageUpload')) uploadImage(event);
    if (event.target.matches('[data-theme-package-upload]')) {
      const file = event.target.files?.[0];
      if (file) { try { const layout = await importUniversalThemePackage(file); await renderEditor(); toast(`Tema "${layout.name || layout.themeId}" importado com sucesso.`); } catch (error) { toast(`Falha ao importar tema: ${error.message}`); } }
      event.target.value = '';
    }
  });

  document.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-popup-id]');
    if (trigger) {
      const id = trigger.dataset.popupId;
      event.preventDefault();
      const layout = getThemeLayout(getConfig().theme.activeId || 'land-rover');
      const assets = await listAssets().catch(() => []);
      await resolveAssetUrls(assets);
      openPopup(id, layout);
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
  editorState = { ...editorState, themeId: getConfig().theme.activeId || 'land-rover', screen: 'home', selectedId: null, popupPreviewId: null, saveDialog: false };
  renderEditor();
}
