import { BLE_SERVICE_UUID, BLE_CHARACTERISTIC_UUID, BLE_DEVICE_NAME, BLE_COMMANDS } from './ble-client.js';
import { MODULE_PROTOCOL_VERSION } from './module-registry.js';
import { THEMES } from './theme-registry.js';

export const APP_VERSION = '0.3.0-foundation';

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportConfiguration(config) {
  downloadJson(`voyage-ambient-config-${new Date().toISOString().slice(0, 10)}.json`, {
    format: 'voyage-ambient-config', exportedAt: new Date().toISOString(), config,
  });
}

export function exportDeveloperPackage({ config, assets = [], connectionState = 'unknown' }) {
  // Não exporta credenciais, chaves de segurança, tokens ou dados pessoais do dispositivo.
  const payload = {
    format: 'voyage-ambient-developer-export',
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    application: { name: 'Voyage Ambient', version: APP_VERSION, runtime: 'Vite / Web' },
    activeTheme: config.theme?.activeId || 'land-rover',
    themeCatalog: THEMES,
    configuration: config,
    moduleProtocol: { version: MODULE_PROTOCOL_VERSION, status: 'draft-not-yet-implemented-on-firmware' },
    bluetooth: {
      deviceName: BLE_DEVICE_NAME,
      serviceUuid: BLE_SERVICE_UUID,
      characteristicUuid: BLE_CHARACTERISTIC_UUID,
      legacyCommands: BLE_COMMANDS,
      connectionState,
      otaStatus: 'not-implemented',
    },
    assets,
    implementationStatus: {
      currentRgbControl: 'implemented-over-existing-ble-protocol',
      userConfigurableRelayDefinitions: 'local-draft-only',
      automations: 'local-draft-only',
      firmwareOta: 'not-implemented',
      nativeAndroidLauncher: 'not-implemented',
      cameraVideoEmbedding: 'not-implemented',
      threeDimensionalVehicle: 'not-implemented',
    },
    sharingNotice: 'Este pacote contém configurações e diagnóstico. Não contém código-fonte, tokens, senhas ou chaves privadas.',
  };
  downloadJson(`voyage-ambient-assistencia-${new Date().toISOString().slice(0, 10)}.json`, payload);
}
