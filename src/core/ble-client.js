// Transporte BLE legado do Voyage Ambient. UUIDs e protocolo permanecem compatíveis
// com o firmware já instalado no ESP32-S3.
export const BLE_SERVICE_UUID = '7b9e0001-7a3d-4f5b-9c2a-6e1d0a5b0001';
export const BLE_CHARACTERISTIC_UUID = '7b9e0002-7a3d-4f5b-9c2a-6e1d0a5b0001';
export const BLE_DEVICE_NAME = 'Voyage Ambient';
export const BLE_COMMANDS = ['POWER', 'COLOR', 'BRIGHTNESS', 'EFFECT', 'SPEED', 'PING'];

export class VoyageBleClient {
  constructor(callbacks = {}) {
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.callbacks = callbacks;
    this.queue = Promise.resolve();
    this.decoder = new TextDecoder();
  }

  get connected() {
    return Boolean(this.server?.connected && this.characteristic);
  }

  async connect() {
    if (!navigator.bluetooth) throw new Error('Este navegador não oferece Web Bluetooth.');
    if (!window.isSecureContext) throw new Error('Bluetooth exige uma página HTTPS ou localhost.');

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [BLE_SERVICE_UUID] }],
      optionalServices: [BLE_SERVICE_UUID],
    });
    this.device.addEventListener('gattserverdisconnected', () => this.#handleDisconnect());
    this.server = await this.device.gatt.connect();
    const service = await this.server.getPrimaryService(BLE_SERVICE_UUID);
    this.characteristic = await service.getCharacteristic(BLE_CHARACTERISTIC_UUID);

    if (this.characteristic.properties.notify) {
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const message = this.decoder.decode(event.target.value).trim();
        if (message) this.callbacks.onMessage?.(message);
      });
    }
    this.callbacks.onConnectionChange?.(true, this.device.name || BLE_DEVICE_NAME);
    return { name: this.device.name || BLE_DEVICE_NAME };
  }

  send(command) {
    if (!this.connected) return Promise.resolve(false);
    if (typeof command !== 'string' || command.length > 96) throw new Error('Comando BLE inválido.');
    this.queue = this.queue.then(async () => {
      const data = new TextEncoder().encode(command);
      if (this.characteristic.writeValueWithResponse) await this.characteristic.writeValueWithResponse(data);
      else if (this.characteristic.writeValueWithoutResponse) await this.characteristic.writeValueWithoutResponse(data);
      else await this.characteristic.writeValue(data);
      return true;
    });
    return this.queue;
  }

  disconnect() {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    else this.#handleDisconnect();
  }

  #handleDisconnect() {
    this.server = null;
    this.characteristic = null;
    this.callbacks.onConnectionChange?.(false, this.device?.name || BLE_DEVICE_NAME);
  }
}
