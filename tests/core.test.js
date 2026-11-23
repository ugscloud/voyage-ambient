import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { CONFIG_KEY, LEGACY_KEY, loadConfig, saveConfig, validateBackup } from '../src/core/config-store.js';
import { createRelayModuleTemplate, normalizeOutput } from '../src/core/module-registry.js';
import { createAutomationDraft } from '../src/core/automation-store.js';
import { BLE_SERVICE_UUID, BLE_CHARACTERISTIC_UUID, BLE_COMMANDS } from '../src/core/ble-client.js';

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
  clear: () => memory.clear(),
};

beforeEach(() => memory.clear());

test('cria configuração base com versão de esquema e módulos conhecidos', () => {
  const config = loadConfig();
  assert.equal(config.schemaVersion, 2);
  assert.equal(config.theme.activeId, 'land-rover');
  assert.equal(config.modules.length, 3);
  assert.equal(config.modules.find((item) => item.id === 'ambient-led-chain').ledCount, 5);
});

test('migra preferências antigas sem perder a cor e brilho salvos', () => {
  memory.set(LEGACY_KEY, JSON.stringify({ color: '#FF0000', brightness: 63, powered: false, effect: 'SOLID', speed: 30, profile: 'SPORT' }));
  const config = loadConfig();
  assert.equal(config.lighting.color, '#FF0000');
  assert.equal(config.lighting.brightness, 63);
  assert.equal(config.lighting.powered, false);
  assert.ok(memory.has(CONFIG_KEY));
});

test('salva e valida backup de configurações', () => {
  const config = loadConfig();
  const saved = saveConfig({ ...config, lighting: { ...config.lighting, color: '#00FF00' } });
  assert.equal(saved.ok, true);
  const validated = validateBackup({ format: 'voyage-ambient-config', config: saved.config });
  assert.equal(validated.ok, true);
  assert.equal(validated.config.lighting.color, '#00FF00');
});

test('modelo de relés cria cinco saídas e limita comportamentos', () => {
  const relay = createRelayModuleTemplate();
  assert.equal(relay.outputs.length, 5);
  assert.equal(normalizeOutput({ name: 'Farol', behavior: 'invalid' }, 0).behavior, 'toggle');
});

test('automação é criada como rascunho local, não ativa', () => {
  const rule = createAutomationDraft();
  assert.equal(rule.status, 'draft-local');
  assert.equal(rule.enabled, false);
  assert.throws(() => createAutomationDraft({ trigger: 'unknown' }));
});

test('UUIDs e comandos BLE legados permanecem compatíveis', () => {
  assert.equal(BLE_SERVICE_UUID, '7b9e0001-7a3d-4f5b-9c2a-6e1d0a5b0001');
  assert.equal(BLE_CHARACTERISTIC_UUID, '7b9e0002-7a3d-4f5b-9c2a-6e1d0a5b0001');
  assert.deepEqual(BLE_COMMANDS, ['POWER', 'COLOR', 'BRIGHTNESS', 'EFFECT', 'SPEED', 'PING']);
});

import { createDefaultEditorLayout, sortEditorItems, normalizePopupStyleExport, normalizeWidgetStyleExport, normalizeWidgetLayoutItem, collectThemeAssetIds, remapThemeAssetIds } from '../src/editor/editor-ui.js';

test('editor cria layouts independentes por tema com telas e estilos editáveis', () => {
  const landRover = createDefaultEditorLayout('land-rover');
  const bmw = createDefaultEditorLayout('bmw');
  assert.equal(landRover.themeId, 'land-rover');
  assert.equal(bmw.themeId, 'bmw');
  assert.ok(landRover.screens.home.length >= 3);
  assert.ok(landRover.screens.apps.length >= 5);
  assert.ok(landRover.style.accent.startsWith('#'));
  assert.notEqual(landRover.style.accent, bmw.style.accent);
});

test('editor ordena primeiro pela prioridade e depois pela posição', () => {
  const sorted = sortEditorItems([{ id: 'apoio', priority: 3, order: 1 }, { id: 'secundario', priority: 2, order: 1 }, { id: 'principal-b', priority: 1, order: 2 }, { id: 'principal-a', priority: 1, order: 1 }]);
  assert.deepEqual(sorted.map((item) => item.id), ['principal-a', 'principal-b', 'secundario', 'apoio']);
});


test('editor normaliza dimensões, transparência e tipografia de pop-ups sem aceitar valores inválidos', () => {
  const style = normalizePopupStyleExport({ widthPct: 140, cardOpacity: 110, titleSize: 90, position: 'invalid', surfaceColor: 'red' });
  assert.equal(style.widthPct, 100);
  assert.equal(style.cardOpacity, 100);
  assert.equal(style.titleSize, 56);
  assert.equal(style.position, 'center');
  assert.equal(style.surfaceColor, '#263B46');
  assert.equal(style.buttonFullWidth, false);
  assert.equal(style.imageOpacity, 35);
});

test('editor limita estilos visuais de widgets a valores seguros', () => {
  const style = normalizeWidgetStyleExport({ minHeight: -5, opacity: 150, radius: 100, imageFit: 'invalid' });
  assert.equal(style.minHeight, 70);
  assert.equal(style.opacity, 100);
  assert.equal(style.radius, 42);
  assert.equal(style.imageFit, 'cover');
  assert.equal(style.fontFamily, 'Inter, Arial, sans-serif');
});


test('pacote universal inclui imagens dos widgets e também dos pop-ups', () => {
  const layout = { screens: { home: [{ imageAssetId: 'home-img' }], apps: [{ imageAssetId: 'app-img' }] }, popups: [{ style: { imageAssetId: 'popup-img' } }] };
  assert.deepEqual(new Set(collectThemeAssetIds(layout)), new Set(['home-img', 'app-img', 'popup-img']));
});

test('importação remapeia IDs de imagem nos widgets e nas imagens dos pop-ups', () => {
  const layout = { screens: { home: [{ imageAssetId: 'old-home' }], apps: [] }, popups: [{ style: { imageAssetId: 'old-popup' } }] };
  remapThemeAssetIds(layout, new Map([['old-home', 'new-home'], ['old-popup', 'new-popup']]));
  assert.equal(layout.screens.home[0].imageAssetId, 'new-home');
  assert.equal(layout.popups[0].style.imageAssetId, 'new-popup');
});


test('widgets aceitam altura fixa e largura em colunas, com limites seguros', () => {
  const style = normalizeWidgetStyleExport({ heightMode: 'fixed', heightPx: 720, minHeight: 280, gridSpan: 3 });
  assert.equal(style.heightMode, 'fixed');
  assert.equal(style.heightPx, 720);
  assert.equal(style.minHeight, 280);
  assert.equal(style.gridSpan, 3);
  const safe = normalizeWidgetStyleExport({ heightMode: 'invalid', heightPx: 5000, gridSpan: 9 });
  assert.equal(safe.heightMode, 'auto');
  assert.equal(safe.heightPx, 1100);
  assert.equal(safe.gridSpan, 3);
});

test('tela inicial não mantém a chamada antiga de sistema multimídia e possui saudação temporizada', async () => {
  const { readFile } = await import('node:fs/promises');
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(!main.includes('SISTEMA MULTIMÍDIA • VOYAGE'));
  assert.ok(!main.includes('Uma experiência a bordo, do seu jeito.'));
  assert.ok(main.includes('id="homeGreetingTitle" class="home-greeting"'));
  assert.ok(main.includes(`greeting.classList.add('is-visible')`));
  assert.ok(main.includes(`current.classList.remove('is-visible')`));
  assert.ok(main.includes('}, 3000);'));
});


test('tela inicial possui alvo real para aplicar widgets salvos', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const editor = readFileSync(new URL('../src/editor/editor-ui.js', import.meta.url), 'utf8');
  assert.match(main, /class="home-hero-cards home-dashboard" id="home-dashboard"/);
  assert.match(editor, /querySelector\('#home-dashboard, \.home-dashboard'\)/);
  assert.match(editor, /home\.innerHTML = items\.map/);
});

test('salvar e aplicar ativa o tema e aplica o layout à tela inicial', () => {
  const editor = readFileSync(new URL('../src/editor/editor-ui.js', import.meta.url), 'utf8');
  assert.match(editor, /data-save-layout/);
  assert.match(editor, /persistLayout\(layout, \{ activate: true, apply: false \}\)/);
  assert.match(editor, /await applyLiveLayout\(layout\)/);
  assert.match(editor, /personalization: \{ \.\.\.config\.personalization, layouts \}/);
});

test('o salvamento local de rascunhos não substitui a tela ativa antes de aplicar', () => {
  const editor = readFileSync(new URL('../src/editor/editor-ui.js', import.meta.url), 'utf8');
  assert.match(editor, /function persistLayout\(layout, \{ activate = false, apply = false \} = \{\}\)/);
  assert.match(editor, /if \(apply && layout\.themeId === result\.config\.theme\.activeId\)/);
});


test('pop-ups aceitam enquadramento e posição da imagem de fundo', () => {
  const editor = readFileSync(new URL('../src/editor/editor-ui.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/editor/editor.css', import.meta.url), 'utf8');
  assert.match(editor, /imageFit: 'cover', imagePosition: 'center'/);
  assert.match(editor, /data-popup-style="imageFit"/);
  assert.match(editor, /data-popup-style="imagePosition"/);
  assert.match(editor, /--popup-image-fit:\$\{style\.imageFit\}/);
  assert.match(css, /background-position: var\(--popup-image-position, center\)/);
});

test('altura fixa de widget é aplicada pelo editor sem duas gravações concorrentes', () => {
  const editor = readFileSync(new URL('../src/editor/editor-ui.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/editor/editor.css', import.meta.url), 'utf8');
  assert.match(editor, /if \(!popup && field === 'heightPx'\) selected\.style\.heightMode = 'fixed'/);
  assert.match(editor, /--widget-height:\$\{s\.heightMode === 'fixed' \? `\$\{s\.heightPx\}px` : 'auto'\}/);
  assert.match(css, /height: var\(--widget-height, auto\)/);
});


test('tamanho grande conserva duas colunas por padrão e aceita largura manual', () => {
  const large = normalizeWidgetLayoutItem({ id: 'x', size: 'large' });
  assert.equal(large.style.gridSpan, 2);
  const userChoice = normalizeWidgetLayoutItem({ id: 'y', size: 'large', style: { gridSpan: 1, gridSpanCustomized: true } });
  assert.equal(userChoice.style.gridSpan, 1);
});

test('layout inicial oferece atalhos editáveis e migra somente o modelo padrão antigo', () => {
  const layout = createDefaultEditorLayout('land-rover');
  assert.equal(layout.screens.home.length, 7);
  assert.ok(layout.screens.home.some((item) => item.id === 'home-shortcut-apps'));
  const editor = readFileSync(new URL('../src/editor/editor-ui.js', import.meta.url), 'utf8');
  assert.match(editor, /isUntouchedStarter/);
  assert.match(editor, /home-shortcut-/);
});


test('tema Land Rover possui imagem local de abertura e grade de cartões para o editor', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/themes/land-rover/theme.css', import.meta.url), 'utf8');
  const hero = new URL('../src/themes/land-rover/land-rover-hero.webp', import.meta.url);
  assert.ok(existsSync(hero));
  assert.match(css, /land-rover-hero\.webp/);
  assert.match(main, /class="home-hero-cards home-dashboard" id="home-dashboard"/);
  assert.match(main, /data-go="lighting"/);
  assert.match(main, /data-go="camera"/);
});

test('iluminação contém cenas Voyage, efeitos BLE suportados e configuração separada de zonas', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const mood of ['flora', 'sport', 'sport-pulse', 'moonlight', 'ocean', 'aurora', 'sunset', 'relax']) assert.ok(main.includes(`id: '${mood}'`));
  assert.match(main, /data-effect="SOLID"/);
  assert.match(main, /data-effect="BREATHE"/);
  assert.match(main, /data-effect="RAINBOW"/);
  assert.match(main, /id="frontZoneColor"/);
  assert.match(main, /id="rearZoneColor"/);
  assert.match(main, /id="syncZoneColors"/);
  assert.match(main, /firmware atual ainda envia uma cor única/);
});

test('preferências de cor dianteira e traseira permanecem salvas na configuração', () => {
  const config = loadConfig();
  const saved = saveConfig({ ...config, lighting: { ...config.lighting, zones: { front: '#FF0000', rear: '#00AEEF', linked: false } } });
  assert.equal(saved.ok, true);
  const reloaded = loadConfig();
  assert.deepEqual(reloaded.lighting.zones, { front: '#FF0000', rear: '#00AEEF', linked: false });
});
