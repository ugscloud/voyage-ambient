import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
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

import { createDefaultEditorLayout, sortEditorItems } from '../src/editor/editor-ui.js';

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

test('editor ordena os widgets pela posição definida pelo proprietário', () => {
  const sorted = sortEditorItems([{ id: 'b', order: 2 }, { id: 'a', order: 1 }, { id: 'c', order: 3 }]);
  assert.deepEqual(sorted.map((item) => item.id), ['a', 'b', 'c']);
});
