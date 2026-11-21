const ALLOWED_TRIGGERS = new Set(['door_open', 'door_closed', 'headlight_on', 'headlight_off', 'manual']);
const ALLOWED_ACTIONS = new Set(['ambient_on', 'ambient_off', 'apply_scene', 'relay_output']);

export function createAutomationDraft({ name = 'Nova automação', trigger = 'door_open', action = 'ambient_on' } = {}) {
  if (!ALLOWED_TRIGGERS.has(trigger) || !ALLOWED_ACTIONS.has(action)) {
    throw new Error('Evento ou ação não reconhecido.');
  }
  return {
    id: `automation-${Date.now()}`,
    name: String(name).slice(0, 48),
    trigger,
    action,
    enabled: false,
    status: 'draft-local',
    createdAt: new Date().toISOString(),
    note: 'Rascunho local. O firmware atual ainda não recebe nem executa regras de automação.',
  };
}
