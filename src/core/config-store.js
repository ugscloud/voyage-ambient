export const CONFIG_KEY = 'voyage-ambient-config-v2';
export const LEGACY_KEY = 'voyage-ambient-settings-v1';
export const CONFIG_SCHEMA_VERSION = 2;

const relayOutputs = Array.from({ length: 5 }, (_, index) => ({
  id: `relay-${index + 1}`,
  name: `Saída ${index + 1}`,
  icon: 'toggle',
  behavior: 'toggle',
  group: '',
  enabled: true,
}));

export function createDefaultConfig() {
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    app: { id: 'voyage-ambient', version: '0.3.0', name: 'Voyage Ambient' },
    theme: { activeId: 'land-rover', ownerEditingEnabled: true },
    vehicle: { name: 'Volkswagen Voyage', model3dId: null },
    lighting: {
      powered: true,
      color: '#91B4D8',
      brightness: 80,
      effect: 'SOLID',
      speed: 45,
      profile: 'MOONLIGHT',
    },
    camera: { frontPackage: '', rearPackage: '', showFrontIn3d: false, showRearIn3d: false },
    modules: [
      {
        id: 'voyage-core', type: 'controller', name: 'Voyage Core',
        installed: true, state: 'legacy-controller', transport: 'ble', firmwareVersion: 'unknown',
      },
      {
        id: 'ambient-led-chain', type: 'lighting-rgb', name: 'Iluminação ambiente',
        installed: true, state: 'working', transport: 'ble-legacy', ledCount: 5,
        note: 'Cinco LEDs WS2812B sincronizados no GPIO 12. Não há zonas independentes ainda.',
      },
      {
        id: 'relay-5-template', type: 'relay-output', name: 'Módulo de 5 relés',
        installed: false, state: 'template-only', transport: 'not-connected', draft: true,
        outputs: relayOutputs,
        note: 'Modelo de configuração. Não representa hardware instalado nem aciona relés.',
      },
    ],
    automations: [],
    personalization: { customThemes: [], layouts: [] },
    developer: { modeEnabled: true },
  };
}

function safeParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function mergeKnownConfig(defaults, saved) {
  if (!saved || typeof saved !== 'object') return defaults;
  return {
    ...defaults,
    ...saved,
    app: { ...defaults.app, ...(saved.app || {}) },
    theme: { ...defaults.theme, ...(saved.theme || {}) },
    vehicle: { ...defaults.vehicle, ...(saved.vehicle || {}) },
    lighting: { ...defaults.lighting, ...(saved.lighting || {}) },
    camera: { ...defaults.camera, ...(saved.camera || {}) },
    modules: Array.isArray(saved.modules) ? saved.modules : defaults.modules,
    automations: Array.isArray(saved.automations) ? saved.automations : defaults.automations,
    personalization: { ...defaults.personalization, ...(saved.personalization || {}) },
    developer: { ...defaults.developer, ...(saved.developer || {}) },
    schemaVersion: CONFIG_SCHEMA_VERSION,
  };
}

export function loadConfig() {
  const defaults = createDefaultConfig();
  try {
    const current = safeParse(localStorage.getItem(CONFIG_KEY) || 'null');
    if (current) return mergeKnownConfig(defaults, current);

    // Migra as preferências da primeira versão para a configuração estruturada.
    const legacy = safeParse(localStorage.getItem(LEGACY_KEY) || 'null');
    if (legacy) {
      const migrated = mergeKnownConfig(defaults, {
        lighting: {
          powered: legacy.powered,
          color: legacy.color,
          brightness: legacy.brightness,
          effect: legacy.effect,
          speed: legacy.speed,
          profile: legacy.profile,
        },
        camera: { frontPackage: legacy.cameraPackage || '' },
      });
      saveConfig(migrated);
      return migrated;
    }
  } catch (error) {
    console.warn('Não foi possível ler as configurações locais:', error);
  }
  return defaults;
}

export function saveConfig(config) {
  const normalized = mergeKnownConfig(createDefaultConfig(), config);
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(normalized));
    return { ok: true, config: normalized };
  } catch (error) {
    console.error('Falha ao salvar configuração:', error);
    return { ok: false, error: error.message, config: normalized };
  }
}

export function updateConfig(current, patch) {
  const next = {
    ...current,
    ...patch,
    lighting: { ...current.lighting, ...(patch.lighting || {}) },
    camera: { ...current.camera, ...(patch.camera || {}) },
    theme: { ...current.theme, ...(patch.theme || {}) },
    vehicle: { ...current.vehicle, ...(patch.vehicle || {}) },
    developer: { ...current.developer, ...(patch.developer || {}) },
    personalization: { ...current.personalization, ...(patch.personalization || {}) },
  };
  return saveConfig(next);
}

export function validateBackup(data) {
  if (!data || typeof data !== 'object') return { ok: false, message: 'O arquivo não contém um objeto JSON válido.' };
  const candidate = data.config || data;
  if (!candidate || typeof candidate !== 'object' || !candidate.lighting || !Array.isArray(candidate.modules)) {
    return { ok: false, message: 'O arquivo não parece ser um backup do Voyage Ambient.' };
  }
  return { ok: true, config: mergeKnownConfig(createDefaultConfig(), candidate) };
}
