export const CURRENT_LED_COUNT = 5;
export const LED_ZONES = ['front', 'rear', 'trunk'];
export const LED_TYPES = ['strip', 'spot', 'area'];

// Área lógica atribuída a cada pixel físico. O usuário pode trocar livremente
// a associação no editor; a posição física continua identificada pelo índice 1–5.
export const LED_AREAS = [
  { id: 'driver-seat', label: 'Banco / pés do motorista', group: 'front' },
  { id: 'passenger-seat', label: 'Banco / pés do passageiro', group: 'front' },
  { id: 'rear-left-seat', label: 'Banco traseiro esquerdo', group: 'rear' },
  { id: 'rear-right-seat', label: 'Banco traseiro direito', group: 'rear' },
  { id: 'dashboard', label: 'Painel dianteiro', group: 'front' },
  { id: 'front-doors', label: 'Portas dianteiras', group: 'front' },
  { id: 'rear-doors', label: 'Portas traseiras', group: 'rear' },
  { id: 'front-footwell', label: 'Pés dianteiros', group: 'front' },
  { id: 'rear-footwell', label: 'Pés traseiros', group: 'rear' },
  { id: 'center-console', label: 'Console central', group: 'front' },
  { id: 'trunk', label: 'Porta-malas', group: 'trunk' },
];

export const LED_AREA_LABELS = Object.fromEntries(LED_AREAS.map((area) => [area.id, area.label]));
export const getLedArea = (areaId) => LED_AREAS.find((area) => area.id === areaId) || LED_AREAS[0];
export const getLedAreaLabel = (areaId) => getLedArea(areaId).label;

const DEFAULTS = [
  { name: 'Motorista', area: 'driver-seat', zone: 'front', x: 34, y: 65, type: 'strip', length: 27, thickness: 7, color: '#8B5CFF', opacity: 100 },
  { name: 'Passageiro', area: 'passenger-seat', zone: 'front', x: 66, y: 65, type: 'strip', length: 27, thickness: 7, color: '#8B5CFF', opacity: 100 },
  { name: 'Traseira esquerda', area: 'rear-left-seat', zone: 'rear', x: 36, y: 84, type: 'strip', length: 23, thickness: 7, color: '#22C7E8', opacity: 100 },
  { name: 'Traseira direita', area: 'rear-right-seat', zone: 'rear', x: 64, y: 84, type: 'strip', length: 23, thickness: 7, color: '#22C7E8', opacity: 100 },
  { name: 'Porta-malas', area: 'trunk', zone: 'trunk', x: 50, y: 94, type: 'area', length: 20, thickness: 12, color: '#8B5CFF', opacity: 85 },
];

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

function inferArea(entry, index) {
  if (LED_AREAS.some((area) => area.id === entry?.area)) return entry.area;
  // Migração transparente dos mapas antigos que tinham apenas front/rear/trunk.
  if (entry?.zone === 'trunk') return 'trunk';
  if (entry?.zone === 'rear') return index === 2 ? 'rear-left-seat' : 'rear-right-seat';
  if (entry?.zone === 'front') return index === 0 ? 'driver-seat' : 'passenger-seat';
  return DEFAULTS[index]?.area || 'driver-seat';
}

export function createDefaultLedMap() {
  return DEFAULTS.map((item, index) => ({ id: `led-${index + 1}`, index: index + 1, ...item }));
}

export function normalizeLedEntry(entry, index) {
  const fallback = DEFAULTS[index] || DEFAULTS[0];
  const area = inferArea(entry, index);
  const group = getLedArea(area).group;
  const color = typeof entry?.color === 'string' && /^#[0-9a-f]{6}$/i.test(entry.color) ? entry.color.toLowerCase() : fallback.color;
  return {
    id: `led-${index + 1}`,
    index: index + 1,
    name: String(entry?.name || fallback.name).trim().slice(0, 32) || fallback.name,
    area,
    zone: group,
    x: Math.round(clamp(entry?.x, 3, 97, fallback.x)),
    y: Math.round(clamp(entry?.y, 4, 96, fallback.y)),
    type: LED_TYPES.includes(entry?.type) ? entry.type : fallback.type,
    length: Math.round(clamp(entry?.length, 6, 70, fallback.length)),
    thickness: Math.round(clamp(entry?.thickness, 2, 24, fallback.thickness)),
    color,
    opacity: Math.round(clamp(entry?.opacity, 10, 100, fallback.opacity)),
  };
}

export function normalizeLedMap(entries) {
  const source = Array.isArray(entries) ? entries : [];
  return createDefaultLedMap().map((fallback, index) => normalizeLedEntry(source[index] || fallback, index));
}

export function makeLedTestCommand(index) {
  const led = Number(index);
  if (!Number.isInteger(led) || led < 1 || led > CURRENT_LED_COUNT) throw new RangeError(`LED deve estar entre 1 e ${CURRENT_LED_COUNT}.`);
  return `LED_TEST=${led}`;
}

export function makeLedColorCommand(index, color) {
  const led = Number(index);
  if (!Number.isInteger(led) || led < 1 || led > CURRENT_LED_COUNT) throw new RangeError(`LED deve estar entre 1 e ${CURRENT_LED_COUNT}.`);
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw new TypeError('Cor LED inválida.');
  const value = color.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `LC=${led},${r},${g},${b}`;
}

export function parseFirmwareInfo(message) {
  if (typeof message !== 'string') return null;
  if (message.startsWith('INFO=')) {
    const [version = 'Desconhecido', count = '0', ...codes] = message.slice(5).split(',');
    return {
      version,
      ledCount: clamp(count, 0, 64, 0),
      features: codes.flatMap((code) => code === 'LT' ? ['LED_TEST'] : code === 'LC' ? ['LED_COLOR'] : ['FX', 'F'].includes(code) ? ['EFFECTS'] : code === 'CFG' ? ['PERSISTENCE'] : []),
    };
  }
  if (message.startsWith('INFO;')) {
    const fields = Object.fromEntries(message.split(';').slice(1).map((part) => part.split('=')));
    return {
      version: fields.FW || 'Desconhecido',
      ledCount: clamp(fields.LED_COUNT, 0, 64, 0),
      features: (fields.CAPS || '').split(',').flatMap((code) => code === 'LT' ? ['LED_TEST'] : code === 'LC' ? ['LED_COLOR'] : ['FX', 'F'].includes(code) ? ['EFFECTS'] : code === 'CFG' ? ['PERSISTENCE'] : []),
    };
  }
  return null;
}
