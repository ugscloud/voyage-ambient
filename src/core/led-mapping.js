export const CURRENT_LED_COUNT = 5;
export const LED_ZONES = ['front', 'rear', 'trunk'];
export const LED_TYPES = ['strip', 'spot', 'area'];

const DEFAULTS = [
  { name: 'Motorista', zone: 'front', x: 25, y: 43, type: 'strip', length: 30, thickness: 7, color: '#8B5CFF', opacity: 100 },
  { name: 'Passageiro', zone: 'front', x: 75, y: 43, type: 'strip', length: 30, thickness: 7, color: '#8B5CFF', opacity: 100 },
  { name: 'Traseira esquerda', zone: 'rear', x: 25, y: 73, type: 'strip', length: 25, thickness: 7, color: '#22C7E8', opacity: 100 },
  { name: 'Traseira direita', zone: 'rear', x: 75, y: 73, type: 'strip', length: 25, thickness: 7, color: '#22C7E8', opacity: 100 },
  { name: 'Porta-malas', zone: 'trunk', x: 50, y: 91, type: 'area', length: 22, thickness: 12, color: '#8B5CFF', opacity: 85 },
];

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export function createDefaultLedMap() {
  return DEFAULTS.map((item, index) => ({ id: `led-${index + 1}`, index: index + 1, ...item }));
}

export function normalizeLedEntry(entry, index) {
  const fallback = DEFAULTS[index] || DEFAULTS[0];
  const color = typeof entry?.color === 'string' && /^#[0-9a-f]{6}$/i.test(entry.color) ? entry.color.toLowerCase() : fallback.color;
  return {
    id: `led-${index + 1}`,
    index: index + 1,
    name: String(entry?.name || fallback.name).trim().slice(0, 32) || fallback.name,
    zone: LED_ZONES.includes(entry?.zone) ? entry.zone : fallback.zone,
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
      features: codes.flatMap((code) => code === 'LT' ? ['LED_TEST'] : code === 'LC' ? ['LED_COLOR'] : []),
    };
  }
  if (message.startsWith('INFO;')) {
    const fields = Object.fromEntries(message.split(';').slice(1).map((part) => part.split('=')));
    return {
      version: fields.FW || 'Desconhecido',
      ledCount: clamp(fields.LED_COUNT, 0, 64, 0),
      features: (fields.CAPS || '').split(',').filter(Boolean),
    };
  }
  return null;
}
