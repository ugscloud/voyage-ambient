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
  assert.equal(config.schemaVersion, 4);
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

test('migra mapa 0.4.0 para cores por área sem descartar as cores antigas de cada pixel', () => {
  memory.set(CONFIG_KEY, JSON.stringify({
    schemaVersion: 3,
    lighting: {
      color: '#91B4D8',
      ledMap: [
        { index: 1, name: 'Motorista', zone: 'front', color: '#FF0000' },
        { index: 2, name: 'Passageiro', zone: 'front', color: '#00FF00' },
        { index: 3, name: 'Traseira esquerda', zone: 'rear', color: '#0000FF' },
        { index: 4, name: 'Traseira direita', zone: 'rear', color: '#FFFF00' },
        { index: 5, name: 'Porta-malas', zone: 'trunk', color: '#FFFFFF' },
      ],
    },
  }));
  const migrated = loadConfig();
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.lighting.areaColors['driver-seat'], '#ff0000');
  assert.equal(migrated.lighting.areaColors['passenger-seat'], '#00ff00');
  assert.equal(migrated.lighting.areaColors['rear-left-seat'], '#0000ff');
  assert.equal(migrated.lighting.areaColors.trunk, '#ffffff');
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
  assert.deepEqual(BLE_COMMANDS.slice(0, 6), ['POWER', 'COLOR', 'BRIGHTNESS', 'EFFECT', 'SPEED', 'PING']);
  assert.ok(BLE_COMMANDS.includes('INFO'));
  assert.ok(BLE_COMMANDS.includes('LED_TEST'));
  assert.ok(BLE_COMMANDS.includes('LC'));
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
  assert.match(main, /data-effect="PULSE"/);
  assert.match(main, /data-effect="WAVE"/);
  assert.match(main, /data-effect="CHASE"/);
  assert.match(main, /id="ledAreaColorGrid"/);
  assert.match(main, /id="frontZoneColor"/);
  assert.match(main, /id="rearZoneColor"/);
  assert.match(main, /id="syncZoneColors"/);
  assert.match(main, /Voyage Core 0\.5\.2/);
});

test('preferências de cor dianteira e traseira permanecem salvas na configuração', () => {
  const config = loadConfig();
  const saved = saveConfig({ ...config, lighting: { ...config.lighting, zones: { front: '#FF0000', rear: '#00AEEF', linked: false } } });
  assert.equal(saved.ok, true);
  const reloaded = loadConfig();
  assert.deepEqual(reloaded.lighting.zones, { front: '#FF0000', rear: '#00AEEF', linked: false });
});


test('tema Land Rover usa workspace fotográfico e quatro abas funcionais de iluminação', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/themes/land-rover/experience.css', import.meta.url), 'utf8');
  const style = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  for (const tab of ['ambiente', 'cor', 'zonas', 'efeitos']) {
    assert.match(main, new RegExp(`data-light-tab=\"${tab}\"`));
    assert.match(main, new RegExp(`data-light-panel=\"${tab}\"`));
  }
  assert.match(main, /class=\"ambient-cabin-panel\"/);
  assert.match(main, /id=\"frontZoneColor\"/);
  assert.match(main, /id=\"rearZoneColor\"/);
  assert.match(css, /land-rover-cabin\.webp/);
  assert.match(style, /themes\/land-rover\/experience\.css/);
  assert.ok(existsSync(new URL('../src/themes/land-rover/land-rover-cabin.webp', import.meta.url)));
});

test('controles de efeito exibem os seis modos implementados no firmware pareado', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const activeEffects = [...new Set([...main.matchAll(/data-effect=\"([A-Z_]+)\"/g)].map((match) => match[1]))];
  assert.deepEqual(activeEffects, ['SOLID', 'BREATHE', 'PULSE', 'WAVE', 'CHASE', 'CASCADE', 'TWINKLE', 'RAINBOW']);
  assert.match(main, /data-area-color/);
  assert.match(main, /EFFECTS/);
});


import { createDefaultLedMap, normalizeLedEntry, normalizeLedMap, makeLedTestCommand, makeLedColorCommand, parseFirmwareInfo, LED_AREAS, getLedArea, getLedAreaLabel } from '../src/core/led-mapping.js';

test('mapa inicial identifica cinco pixels físicos com nome, zona e posição editável', () => {
  const map = createDefaultLedMap();
  assert.equal(map.length, 5);
  assert.equal(map[0].name, 'Motorista');
  assert.equal(map[1].name, 'Passageiro');
  assert.equal(map[4].zone, 'trunk');
  assert.ok(map.every((item) => item.x >= 3 && item.x <= 97 && item.y >= 4 && item.y <= 96));
});

test('normalização de mapeamento limita coordenadas e tipos desconhecidos', () => {
  const map = normalizeLedMap([{ name: 'LED extremo', x: 999, y: -10, type: 'unknown', color: 'red' }]);
  assert.equal(map[0].x, 97);
  assert.equal(map[0].y, 4);
  assert.equal(map[0].type, 'strip');
  assert.match(map[0].color, /^#[0-9a-f]{6}$/i);
  assert.equal(map.length, 5);
});

test('comandos de teste e cor individual validam índice e cor RGB', () => {
  assert.equal(makeLedTestCommand(3), 'LED_TEST=3');
  assert.equal(makeLedColorCommand(2, '#ff0080'), 'LC=2,255,0,128');
  assert.ok(makeLedColorCommand(2, '#ff0080').length <= 20, 'o comando cabe no payload BLE padrão');
  assert.throws(() => makeLedTestCommand(6), RangeError);
  assert.throws(() => makeLedColorCommand(1, 'vermelho'), TypeError);
});

test('configuração mantém mapa dos LEDs na gravação e no backup', () => {
  const config = loadConfig();
  const changed = config.lighting.ledMap.map((item, index) => index === 0 ? { ...item, name: 'Fita do motorista', x: 32 } : item);
  const saved = saveConfig({ ...config, lighting: { ...config.lighting, ledMap: changed } });
  assert.equal(saved.ok, true);
  assert.equal(saved.config.lighting.ledMap[0].name, 'Fita do motorista');
  const backup = validateBackup({ config: saved.config });
  assert.equal(backup.ok, true);
  assert.equal(backup.config.lighting.ledMap[0].x, 32);
});

test('layout responsivo define navegação inferior em retrato e lateral em paisagem', () => {
  const css = readFileSync(new URL('../src/themes/land-rover/responsive.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(orientation: portrait\)/);
  assert.match(css, /grid-template-rows:56px minmax\(0,1fr\) 62px 22px/);
  assert.match(css, /@media \(orientation: landscape\) and \(max-width:760px\)/);
});

test('cada cena de iluminação possui fotografia própria', async () => {
  const { existsSync } = await import('node:fs');
  for (const name of ['flora','sport','sport-pulse','moonlight','ocean','aurora','sunset','relax']) {
    assert.ok(existsSync(new URL(`../src/themes/land-rover/scenes/${name}.webp`, import.meta.url)));
  }
});


test('manifesto público do firmware 0.5.1 descreve UUIDs, teste, cor por pixel e persistência', () => {
  const manifest = readFileSync(new URL('../firmware/esp32/FIRMWARE-0.5.1-MANIFEST.md', import.meta.url), 'utf8');
  assert.match(manifest, /7b9e0001-7a3d-4f5b-9c2a-6e1d0a5b0001/);
  assert.match(manifest, /7b9e0002-7a3d-4f5b-9c2a-6e1d0a5b0001/);
  assert.match(manifest, /LED_TEST=1/);
  assert.match(manifest, /LC=índice,r,g,b/);
  assert.match(manifest, /INFO=0\.5\.1,5,LT,LC/);
  assert.match(manifest, /Preferences\/NVS/);
  assert.match(manifest, /Pixels endereçáveis: 5/);
});

test('mapa de LEDs usa fotografia neutra e de alta resolução no pipeline Vite', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /import zoneMapNeutralUrl from '\.\/themes\/land-rover\/zone-map-neutral\.webp'/);
  assert.match(main, /src="\$\{zoneMapNeutralUrl\}"/);
  assert.ok(existsSync(new URL('../src/themes/land-rover/zone-map-neutral.webp', import.meta.url)));
  assert.ok(!main.includes('CABIN_SCENE_IMAGES'));
});

test('firmware 0.5.1 anuncia recursos BLE em pacote curto e comando LC cabe no MTU padrão', () => {
  const manifest = readFileSync(new URL('../firmware/esp32/FIRMWARE-0.5.1-MANIFEST.md', import.meta.url), 'utf8');
  assert.match(manifest, /INFO=0\.5\.1,5,LT,LC/);
  assert.match(manifest, /Preferences\/NVS/);
  assert.ok(makeLedColorCommand(5, '#ffffff').length <= 20);
});


test('detecção do firmware reconhece recursos curtos do pacote BLE 0.5.1', () => {
  const info = parseFirmwareInfo('INFO=0.5.1,5,LT,LC');
  assert.equal(info.version, '0.5.1');
  assert.equal(info.ledCount, 5);
  assert.deepEqual(info.features, ['LED_TEST', 'LED_COLOR']);
  assert.equal(parseFirmwareInfo('CONNECTED'), null);
});


test('editor de LEDs alimenta a prévia Ambiente, Zonas e Modo Desenvolvedor', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /id=\"ambientCabinLedMarkers\"/);
  assert.match(main, /function renderLedLightingMarkers\(\)/);
  assert.match(main, /ambientCabinLedMarkers/);
  assert.match(main, /function renderLightingVisuals\(\)/);
  assert.match(main, /function syncZoneControlsFromMap\(zone\)/);
  assert.match(main, /saveLedMapConfig\(\);[\s\S]{0,220}renderLedLightingMarkers\(\);[\s\S]{0,100}renderLightingVisuals\(\);/);
});

test('mapa de zonas e editor compartilham uma imagem neutra; cenas mantêm fotos próprias nos cartões', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/themes/land-rover/experience.css', import.meta.url), 'utf8');
  assert.match(main, /function updateSceneCabinImages\(\)/);
  assert.match(main, /ambientZonePhoto/);
  assert.match(main, /ledMapPhoto/);
  assert.match(main, /cabinPanel\.style\.backgroundImage/);
  assert.match(css, /zone-map-neutral\.webp/);
  for (const name of ['flora','sport','sport-pulse','moonlight','ocean','aurora','sunset','relax']) {
    assert.ok(existsSync(new URL(`../src/themes/land-rover/scenes/${name}.webp`, import.meta.url)));
  }
});

test('animações visuais seguem o efeito e o estado de energia em todas as prévias de LED', () => {
  const css = readFileSync(new URL('../src/themes/land-rover/experience.css', import.meta.url), 'utf8');
  assert.match(css, /data-effect=\"BREATHE\"/);
  assert.match(css, /data-effect=\"RAINBOW\"/);
  assert.match(css, /voyage-led-breathe/);
  assert.match(css, /voyage-led-spectrum/);
  assert.match(css, /voyage-led-pulse/);
  assert.match(css, /voyage-led-chase/);
  assert.match(css, /voyage-led-cascade/);
  assert.match(css, /voyage-led-twinkle/);
  assert.match(css, /ambient-live-led\.is-muted/);
});

test('firmware pareado mantém os UUIDs, cinco pixels e grava preferências na NVS', () => {
  const firmware = readFileSync(new URL('../firmware/esp32/private/VoyageAmbientBLE_FW_0_5_1.ino', import.meta.url), 'utf8');
  assert.match(firmware, /SERVICE_UUID/);
  assert.match(firmware, /CHARACTERISTIC_UUID/);
  assert.match(firmware, /#define NUM_LEDS 5/);
  assert.match(firmware, /Preferences/);
  assert.match(firmware, /saveConfigNow/);
  assert.match(firmware, /LED_TEST=/);
  assert.match(firmware, /LC=/);
  assert.match(firmware, /INFO=/);
});

test('Voyage Core 0.5.2 anuncia oito efeitos e mantém o pacote de capacidades BLE em 20 bytes', () => {
  const firmware = readFileSync(new URL('../firmware/esp32/private/VoyageAmbientBLE_FW_0_5_2.ino', import.meta.url), 'utf8');
  const infoMessage = 'INFO=0.5.2,5,LT,LC,F';
  assert.ok(infoMessage.length <= 20);
  const info = parseFirmwareInfo(infoMessage);
  assert.equal(info.version, '0.5.2');
  assert.equal(info.ledCount, 5);
  assert.deepEqual(info.features, ['LED_TEST', 'LED_COLOR', 'EFFECTS']);
  for (const effect of ['SOLID', 'BREATHE', 'PULSE', 'WAVE', 'CHASE', 'CASCADE', 'TWINKLE', 'RAINBOW']) assert.ok(firmware.includes(`"${effect}"`));
  assert.match(firmware, /#define LED_PIN 12/);
  assert.match(firmware, /Preferences/);
  assert.match(firmware, /LC=/);
});

test('cartões de cenas usam fotografias próprias e coerentes com cada tema', () => {
  const css = readFileSync(new URL('../src/themes/land-rover/experience.css', import.meta.url), 'utf8');
  for (const name of ['flora','sport','sport-pulse','moonlight','ocean','aurora','sunset','relax']) {
    assert.match(css, new RegExp(`ambient-theme-card\\.theme-${name}:before`));
    assert.match(css, new RegExp(`url\\('./scenes/${name}\\.webp'\\)`));
  }
});

test('prévia visual aplica brilho global, intensidade por LED e duração do efeito', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/themes/land-rover/experience.css', import.meta.url), 'utf8');
  assert.match(main, /led\.opacity \/ 100\) \* \(state\.brightness \/ 100\)/);
  assert.match(main, /--led-animation-duration/);
  assert.match(css, /var\(--led-animation-duration/);
});

test('mudar um LED de zona sincroniza o resumo da zona antiga e da nova', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /const previousZone = led\.zone/);
  assert.match(main, /if \(previousZone === 'front' \|\| previousZone === 'rear'\) syncZoneControlsFromMap\(previousZone\)/);
  assert.match(main, /if \(led\.zone === 'front' \|\| led\.zone === 'rear'\) syncZoneControlsFromMap\(led\.zone\)/);
});


test('efeito Arco-íris do firmware acompanha a faixa de velocidade exibida na interface', () => {
  const firmware = readFileSync(new URL('../firmware/esp32/private/VoyageAmbientBLE_FW_0_5_1.ino', import.meta.url), 'utf8');
  assert.match(firmware, /rainbowPeriod = .*map\(speedValue, 1, 100, 6500, 1000\)/);
  assert.match(firmware, /hueStep = \(65536UL \* interval\) \/ rainbowPeriod/);
});


test('mapa LED suporta atribuição granular para bancos, painel, portas, pés e porta-malas', () => {
  assert.ok(LED_AREAS.some((area) => area.id === 'driver-seat'));
  assert.ok(LED_AREAS.some((area) => area.id === 'rear-left-seat'));
  assert.ok(LED_AREAS.some((area) => area.id === 'dashboard'));
  assert.ok(LED_AREAS.some((area) => area.id === 'trunk'));
  assert.equal(getLedArea('trunk').group, 'trunk');
  assert.equal(getLedAreaLabel('passenger-seat'), 'Banco / pés do passageiro');
});

test('migração de mapa antigo preserva zonas e atribui áreas granulares sem perder os cinco índices', () => {
  const legacy = [
    { index: 1, name: 'Driver', zone: 'front', x: 30, y: 60 },
    { index: 2, name: 'Passenger', zone: 'front', x: 70, y: 60 },
    { index: 3, name: 'Rear L', zone: 'rear', x: 30, y: 80 },
    { index: 4, name: 'Rear R', zone: 'rear', x: 70, y: 80 },
    { index: 5, name: 'Boot', zone: 'trunk', x: 50, y: 93 },
  ];
  const map = normalizeLedMap(legacy);
  assert.equal(map.length, 5);
  assert.deepEqual(map.map((item) => item.area), ['driver-seat', 'passenger-seat', 'rear-left-seat', 'rear-right-seat', 'trunk']);
  assert.deepEqual(map.map((item) => item.zone), ['front', 'front', 'rear', 'rear', 'trunk']);
});

test('firmware 0.5.2 anuncia testes, cor por pixel e efeitos avançados em mensagem BLE curta', () => {
  const firmware = readFileSync(new URL('../firmware/esp32/private/VoyageAmbientBLE_FW_0_5_2.ino', import.meta.url), 'utf8');
  const infoCommand = 'INFO=0.5.2,5,LT,LC,F';
  assert.ok(infoCommand.length <= 20);
  const info = parseFirmwareInfo(infoCommand);
  assert.equal(info.version, '0.5.2');
  assert.equal(info.ledCount, 5);
  assert.deepEqual(info.features, ['LED_TEST', 'LED_COLOR', 'EFFECTS']);
  for (const effect of ['SOLID', 'BREATHE', 'PULSE', 'WAVE', 'CHASE', 'CASCADE', 'TWINKLE', 'RAINBOW']) assert.ok(firmware.includes(`\"${effect}\"`));
  assert.match(firmware, /#define LED_PIN 12/);
  assert.match(firmware, /Preferences/);
});

test('cores por área são salvas no modelo de configuração e enviadas aos LEDs associados', () => {
  const config = loadConfig();
  assert.ok(config.lighting.areaColors['driver-seat']);
  assert.ok(config.lighting.areaColors['rear-left-seat']);
  const saved = saveConfig({ ...config, lighting: { ...config.lighting, areaColors: { ...config.lighting.areaColors, 'driver-seat': '#FF0000' } } });
  assert.equal(saved.ok, true);
  assert.equal(loadConfig().lighting.areaColors['driver-seat'], '#FF0000');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /function setAreaColor\(areaId, color\)/);
  assert.match(main, /state\.ledMap\.filter\(\(item\) => item\.area === area\.id\)/);
});

test('mapa da aba Zonas não anima nem acende os marcadores; a animação fica na prévia Ambiente', () => {
  const css = readFileSync(new URL('../src/themes/land-rover/experience.css', import.meta.url), 'utf8');
  assert.match(css, /\.led-zone-preview \.led-zone-marker:before \{[\s\S]*?animation: none !important/);
  assert.match(css, /#ambientCabinLedMarkers\[data-effect=\"PULSE\"\] \.ambient-live-led:before/);
  assert.match(css, /#ambientCabinLedMarkers\[data-effect=\"CHASE\"\] \.ambient-live-led:before/);
});

test('editor atualiza posição, comprimento, espessura, tipo, nome e cor do marcador sem reconstruir o painel', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /marker\.style\.left = `\$\{item\.x\}%`/);
  assert.match(main, /marker\.style\.top = `\$\{item\.y\}%`/);
  assert.match(main, /--led-length/);
  assert.match(main, /--led-thickness/);
  assert.match(main, /classList\.toggle\('led-map-marker-strip'/);
  assert.match(main, /label\.textContent = `\$\{item\.name\}/);
});

test('marcadores do mapa técnico são identificadores estáticos sobre a foto neutra', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/themes/land-rover/experience.css', import.meta.url), 'utf8');
  assert.match(main, /const opacity = 1;/);
  assert.match(main, /--led-index:\$\{led\.index\}/);
  assert.match(css, /Os pontos do mapa técnico/);
  assert.match(css, /\.led-map-stage\.lighting-off \.led-map-marker:before \{ opacity: 1; \}/);
});
