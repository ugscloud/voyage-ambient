export const MODULE_PROTOCOL_VERSION = '0.1-draft';

export const MODULE_CATALOG = [
  { type: 'controller', label: 'Controlador principal', description: 'Voyage Core: comunicação, regras e gerenciamento.' },
  { type: 'lighting-rgb', label: 'Iluminação RGB', description: 'Controle de fitas e LEDs endereçáveis.' },
  { type: 'relay-output', label: 'Módulo de relés', description: 'Saídas configuráveis para acessórios.' },
  { type: 'input-sense', label: 'Leitura de sinais', description: 'Entradas protegidas para sensores e sinais de 12 V.' },
  { type: 'sound', label: 'Áudio e avisos', description: 'Reprodução de alertas e sinais sonoros.' },
];

export function createRelayModuleTemplate() {
  return {
    id: 'relay-5-template', type: 'relay-output', name: 'Módulo de 5 relés',
    installed: false, state: 'template-only', transport: 'not-connected', draft: true,
    outputs: Array.from({ length: 5 }, (_, index) => ({
      id: `relay-${index + 1}`, name: `Saída ${index + 1}`,
      behavior: 'toggle', icon: 'toggle', group: '', enabled: true,
    })),
    note: 'Modelo de configuração. Não representa hardware instalado nem aciona relés.',
  };
}

export function normalizeOutput(output, index) {
  const allowedBehaviors = new Set(['toggle', 'momentary', 'group']);
  return {
    id: `relay-${index + 1}`,
    name: String(output?.name || `Saída ${index + 1}`).slice(0, 32),
    behavior: allowedBehaviors.has(output?.behavior) ? output.behavior : 'toggle',
    icon: String(output?.icon || 'toggle').slice(0, 24),
    group: String(output?.group || '').slice(0, 24),
    enabled: output?.enabled !== false,
  };
}
