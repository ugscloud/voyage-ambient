import './style.css';

const SERVICE_UUID = '7b9e0001-7a3d-4f5b-9c2a-6e1d0a5b0001';
const CHARACTERISTIC_UUID = '7b9e0002-7a3d-4f5b-9c2a-6e1d0a5b0001';

const state = {
  view: 'home',
  connected: false,
  powered: true,
  color: '#1476d4',
  brightness: 100,
  effect: 'SOLID',
  speed: 45,
  profile: 'AZUL M SPORT',
};

const ble = { device: null, server: null, characteristic: null };
let toastTimer;

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-lockup">
        <div class="brand-mark">V</div>
        <div><div class="brand-name">VOYAGE</div><div class="brand-sub">AMBIENT EXPERIENCE</div></div>
      </div>
      <div class="top-meta"><span id="dateLabel"></span><span class="connection-pill" id="connectionPill"><i></i><span id="connectionText">ESP32 não conectado</span></span><span id="clock"></span></div>
    </header>

    <aside class="side-rail" aria-label="Menu principal">
      <button class="nav-button active" data-view="home" aria-label="Início" title="Início">⌂</button>
      <button class="nav-button" data-view="lighting" aria-label="Iluminação" title="Iluminação">✧</button>
      <button class="nav-button" data-view="profiles" aria-label="Perfis" title="Perfis">◇</button>
      <button class="nav-button" data-view="vehicle" aria-label="Veículo" title="Veículo">▱</button>
      <div class="rail-spacer"></div>
      <button class="nav-button" data-view="settings" aria-label="Configurações" title="Configurações">⚙</button>
    </aside>

    <main class="main-content">
      <section class="view active" id="view-home">
        <div class="page-heading"><div><div class="eyebrow">PAINEL PRINCIPAL</div><h1>Boa viagem.</h1><p>A experiência de iluminação do seu Voyage.</p></div><button class="outline-button" data-go="lighting">Controlar iluminação <span>→</span></button></div>
        <div class="home-grid">
          <article class="surface hero-surface">
            <div class="surface-heading"><div><div class="eyebrow">AMBIENT LIGHTING</div><h2>Iluminação ambiente</h2></div><button class="toggle on" id="homePower" aria-label="Ligar ou desligar iluminação"><span></span></button></div>
            <div class="ambient-visual" id="homeVisual"><div class="ambient-cabin"><div class="cabin-line"></div><div class="cabin-glow"></div><span>VOYAGE</span></div></div>
            <div class="glow-track"><span id="homeGlow"></span></div>
            <div class="info-row"><span>Cor atual</span><strong id="homeColorName">Azul M Sport</strong></div>
            <div class="micro-status">INTENSIDADE <strong id="homeBrightness">100%</strong> <span class="status-light" id="homePowerLabel">SISTEMA LIGADO</span></div>
          </article>

          <article class="surface quick-surface">
            <div class="eyebrow">ACESSO RÁPIDO</div><h2>Funções</h2>
            <button class="quick-link" data-go="lighting"><span class="quick-icon">✧</span><span><b>Iluminação</b><small>Cor e intensidade</small></span><em>›</em></button>
            <button class="quick-link" data-go="profiles"><span class="quick-icon">◇</span><span><b>Perfis</b><small>Ambientes salvos</small></span><em>›</em></button>
            <button class="quick-link" data-go="vehicle"><span class="quick-icon">▱</span><span><b>Dados do veículo</b><small>OBD2 e sensores</small></span><em>›</em></button>
          </article>

          <article class="surface zones-surface">
            <div class="eyebrow">DISTRIBUIÇÃO DO HABITÁCULO</div><h2>Zonas de iluminação</h2>
            <p class="muted">A instalação atual envia o mesmo comando para os cinco LEDs ligados em sequência.</p>
            <div class="zone-summary"><span>01</span><div><b>Dianteira esquerda</b><small>Motorista</small></div></div>
            <div class="zone-summary"><span>02</span><div><b>Dianteira direita</b><small>Passageiro</small></div></div>
            <div class="zone-summary"><span>03</span><div><b>Áreas traseiras</b><small>Banco posterior</small></div></div>
          </article>
        </div>
      </section>

      <section class="view" id="view-lighting">
        <div class="page-heading"><div><div class="eyebrow">PERSONALIZAÇÃO</div><h1>Iluminação ambiente</h1><p>Ajuste a cor, a intensidade e o efeito do habitáculo.</p></div><button class="outline-button" data-go="home">← Início</button></div>
        <div class="lighting-grid">
          <article class="surface color-surface">
            <h2>Cor da iluminação</h2><p class="muted">Escolha uma tonalidade ou crie sua própria cor.</p>
            <div class="swatches">
              <button class="swatch active" style="--swatch:#1476d4" data-color="#1476d4" data-name="Azul M Sport" aria-label="Azul M Sport"></button>
              <button class="swatch" style="--swatch:#58c9bf" data-color="#58c9bf" data-name="Verde mineral" aria-label="Verde mineral"></button>
              <button class="swatch" style="--swatch:#d7a66a" data-color="#d7a66a" data-name="Âmbar" aria-label="Âmbar"></button>
              <button class="swatch" style="--swatch:#a58bd8" data-color="#a58bd8" data-name="Violeta" aria-label="Violeta"></button>
              <button class="swatch" style="--swatch:#d96e70" data-color="#d96e70" data-name="Vermelho" aria-label="Vermelho"></button>
              <button class="swatch" style="--swatch:#e9eeeb" data-color="#e9eeeb" data-name="Branco" aria-label="Branco"></button>
            </div>
            <div class="custom-color-row"><label for="colorPicker">Cor personalizada</label><input id="colorPicker" type="color" value="#1476d4" /></div>
            <div class="large-preview" id="largePreview"><div class="preview-line"></div><span id="previewName">AZUL M SPORT</span></div>
          </article>
          <article class="surface control-surface">
            <div class="surface-heading"><div><h2>Estado geral</h2><p class="muted">Ative ou desative a iluminação.</p></div><button class="toggle on" id="lightingPower" aria-label="Ligar ou desligar iluminação"><span></span></button></div>
            <div class="state-text" id="lightingState">SISTEMA LIGADO</div>
            <div class="divider"></div>
            <div class="range-heading"><label for="brightness">Intensidade</label><strong id="brightnessValue">100%</strong></div>
            <input class="range" type="range" id="brightness" min="0" max="100" value="100" />
            <div class="range-ends"><span>Suave</span><span>Máxima</span></div>
            <div class="divider"></div>
            <h2>Efeito de iluminação</h2>
            <div class="effect-list">
              <button class="effect-button active" data-effect="SOLID"><b>Fixa</b><small>Cor constante</small></button>
              <button class="effect-button" data-effect="BREATHE"><b>Respiração</b><small>Transição suave</small></button>
              <button class="effect-button" data-effect="RAINBOW"><b>Arco-íris</b><small>Ciclo de cores</small></button>
            </div>
            <div class="range-heading speed-heading"><label for="speed">Velocidade do efeito</label><strong id="speedValue">45%</strong></div>
            <input class="range" type="range" id="speed" min="1" max="100" value="45" />
          </article>
        </div>
      </section>

      <section class="view" id="view-profiles">
        <div class="page-heading"><div><div class="eyebrow">AMBIENTES SALVOS</div><h1>Perfis de iluminação</h1><p>Selecione um ambiente para aplicar no interior.</p></div><button class="outline-button" data-go="lighting">Personalizar →</button></div>
        <div class="profile-grid">
          <button class="profile-card selected" data-color="#1476d4" data-name="Azul M Sport" data-brightness="100"><span class="profile-swatch" style="--swatch:#1476d4"></span><b>AZUL M SPORT</b><small>Azul frio e esportivo</small></button>
          <button class="profile-card" data-color="#58c9bf" data-name="Verde mineral" data-brightness="75"><span class="profile-swatch" style="--swatch:#58c9bf"></span><b>VERDE MINERAL</b><small>Verde azulado discreto</small></button>
          <button class="profile-card" data-color="#d7a66a" data-name="Âmbar" data-brightness="65"><span class="profile-swatch" style="--swatch:#d7a66a"></span><b>ÂMBAR</b><small>Luz quente e confortável</small></button>
          <button class="profile-card" data-color="#a58bd8" data-name="Violeta" data-brightness="80"><span class="profile-swatch" style="--swatch:#a58bd8"></span><b>VIOLETA</b><small>Personalidade noturna</small></button>
          <button class="profile-card" data-color="#d96e70" data-name="Vermelho sport" data-brightness="70"><span class="profile-swatch" style="--swatch:#d96e70"></span><b>VERMELHO SPORT</b><small>Tom esportivo</small></button>
          <button class="profile-card" data-color="#e9eeeb" data-name="Branco clean" data-brightness="55"><span class="profile-swatch" style="--swatch:#e9eeeb"></span><b>BRANCO CLEAN</b><small>Visual discreto</small></button>
        </div>
      </section>

      <section class="view" id="view-vehicle">
        <div class="page-heading"><div><div class="eyebrow">INFORMAÇÕES DO VEÍCULO</div><h1>Dados do Voyage</h1><p>Área reservada para os dados do scanner OBD2.</p></div><span class="connection-pill"><i></i>OBD2 aguardando conexão</span></div>
        <div class="metrics-grid"><article class="surface metric-card"><small>TEMPERATURA DO MOTOR</small><strong>— <em>°C</em></strong><span>Aguardando leitura do scanner</span></article><article class="surface metric-card"><small>ROTAÇÃO DO MOTOR</small><strong>— <em>RPM</em></strong><span>Aguardando leitura do scanner</span></article><article class="surface metric-card"><small>VELOCIDADE</small><strong>— <em>km/h</em></strong><span>Aguardando leitura do scanner</span></article></div>
        <article class="surface info-panel"><h2>Integração OBD2</h2><p class="muted">O scanner será conectado pelo Android em uma etapa posterior. O ESP32 continuará responsável pela iluminação.</p></article>
      </section>

      <section class="view" id="view-settings">
        <div class="page-heading"><div><div class="eyebrow">SISTEMA</div><h1>Configurações</h1><p>Conexões e preferências do controlador.</p></div></div>
        <article class="surface settings-panel">
          <div class="settings-row"><div><b>Controlador de iluminação</b><small>ESP32-S3 • Bluetooth Low Energy</small></div><button class="outline-button primary-outline" id="connectButton">Conectar ESP32</button></div>
          <div class="settings-row"><div><b>Estado da conexão</b><small id="settingsConnection">Nenhum controlador conectado</small></div><button class="outline-button" id="disconnectButton" disabled>Desconectar</button></div>
          <div class="settings-row"><div><b>Nome Bluetooth esperado</b><small>Voyage Ambient</small></div><span class="muted">BLE</span></div>
          <div class="settings-row"><div><b>Versão do aplicativo</b><small>Protótipo com controle BLE</small></div><span class="muted">0.2</span></div>
        </article>
        <p class="footnote">A conexão Bluetooth funciona em navegadores compatíveis com Web Bluetooth, em contexto seguro (HTTPS). A versão APK usará integração Android nativa.</p>
      </section>
    </main>

    <footer class="bottom-bar"><span>VOYAGE AMBIENT EXPERIENCE</span><button data-go="settings">⚙ &nbsp; CONFIGURAÇÕES RÁPIDAS</button><span>PROTÓTIPO 0.2</span></footer>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const encoder = new TextEncoder();

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 2600);
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16));
}

function render() {
  const glow = state.powered ? Math.max(0.06, state.brightness / 100) : 0.025;
  document.documentElement.style.setProperty('--ambient-color', state.color);
  document.documentElement.style.setProperty('--ambient-opacity', String(glow));
  $('#homeColorName').textContent = state.profile;
  $('#homeBrightness').textContent = `${state.brightness}%`;
  $('#homeGlow').style.width = `${state.brightness}%`;
  $('#homePowerLabel').textContent = state.powered ? 'SISTEMA LIGADO' : 'SISTEMA DESLIGADO';
  $('#brightness').value = String(state.brightness);
  $('#brightnessValue').textContent = `${state.brightness}%`;
  $('#colorPicker').value = state.color;
  $('#previewName').textContent = state.profile.toUpperCase();
  $('#lightingState').textContent = state.powered ? 'SISTEMA LIGADO' : 'SISTEMA DESLIGADO';
  $('#speed').value = String(state.speed);
  $('#speedValue').textContent = `${state.speed}%`;
  $('#homePower').classList.toggle('on', state.powered);
  $('#lightingPower').classList.toggle('on', state.powered);
  $$('.swatch').forEach((button) => button.classList.toggle('active', button.dataset.color.toLowerCase() === state.color.toLowerCase()));
  $$('.effect-button').forEach((button) => button.classList.toggle('active', button.dataset.effect === state.effect));
  $('#connectionPill').classList.toggle('connected', state.connected);
  $('#connectionText').textContent = state.connected ? (ble.device?.name || 'ESP32 conectado') : 'ESP32 não conectado';
  $('#settingsConnection').textContent = state.connected ? 'Conectado e pronto para receber comandos' : 'Nenhum controlador conectado';
  $('#connectButton').textContent = state.connected ? 'Conectado' : 'Conectar ESP32';
  $('#connectButton').disabled = state.connected;
  $('#disconnectButton').disabled = !state.connected;
}

function setView(view) {
  state.view = view;
  $$('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${view}`));
  $$('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
}

async function sendCommand(command) {
  if (!ble.characteristic || !state.connected) return;
  try {
    const data = encoder.encode(command);
    if (typeof ble.characteristic.writeValueWithResponse === 'function') {
      await ble.characteristic.writeValueWithResponse(data);
    } else {
      await ble.characteristic.writeValue(data);
    }
  } catch (error) {
    toast(`Falha ao enviar comando: ${error.message}`);
  }
}

async function sendCurrentState() {
  const [r, g, b] = hexToRgb(state.color);
  await sendCommand(`POWER=${state.powered ? 1 : 0}`);
  await sendCommand(`COLOR=${r},${g},${b}`);
  await sendCommand(`BRIGHTNESS=${state.brightness}`);
  await sendCommand(`EFFECT=${state.effect}`);
  await sendCommand(`SPEED=${state.speed}`);
}

function setColor(color, name = 'Personalizada') {
  state.color = color.toLowerCase();
  state.profile = name;
  render();
  const [r, g, b] = hexToRgb(state.color);
  sendCommand(`COLOR=${r},${g},${b}`);
}

function setPower(powered) {
  state.powered = powered;
  render();
  sendCommand(`POWER=${powered ? 1 : 0}`);
}

async function connectBluetooth() {
  if (!('bluetooth' in navigator)) {
    toast('Este navegador não oferece Web Bluetooth. Abra o app em uma versão compatível do Chrome ou use o APK nativo futuramente.');
    return;
  }
  if (!window.isSecureContext) {
    toast('A conexão Bluetooth exige uma página HTTPS segura.');
    return;
  }

  try {
    toast('Procurando o controlador Voyage Ambient…');
    ble.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });
    ble.device.addEventListener('gattserverdisconnected', handleDisconnect);
    ble.server = await ble.device.gatt.connect();
    const service = await ble.server.getPrimaryService(SERVICE_UUID);
    ble.characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    if (ble.characteristic.properties.notify) {
      await ble.characteristic.startNotifications();
      ble.characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const message = new TextDecoder().decode(event.target.value).trim();
        if (message) toast(`ESP32: ${message}`);
      });
    }
    state.connected = true;
    render();
    await sendCurrentState();
    toast('ESP32 conectado. Os comandos já estão sendo enviados.');
  } catch (error) {
    state.connected = false;
    render();
    if (error.name === 'NotFoundError') toast('Nenhum dispositivo selecionado.');
    else toast(`Não foi possível conectar: ${error.message}`);
  }
}

function handleDisconnect() {
  state.connected = false;
  ble.server = null;
  ble.characteristic = null;
  render();
  toast('ESP32 desconectado.');
}

function disconnectBluetooth() {
  if (ble.device?.gatt?.connected) ble.device.gatt.disconnect();
  else handleDisconnect();
}

$$('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
$$('[data-go]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.go)));
$('#homePower').addEventListener('click', () => setPower(!state.powered));
$('#lightingPower').addEventListener('click', () => setPower(!state.powered));
$('#brightness').addEventListener('input', (event) => {
  state.brightness = Number(event.target.value);
  render();
  sendCommand(`BRIGHTNESS=${state.brightness}`);
});
$('#speed').addEventListener('input', (event) => {
  state.speed = Number(event.target.value);
  render();
  sendCommand(`SPEED=${state.speed}`);
});
$('#colorPicker').addEventListener('input', (event) => setColor(event.target.value));
$$('.swatch').forEach((button) => button.addEventListener('click', () => setColor(button.dataset.color, button.dataset.name)));
$$('.effect-button').forEach((button) => button.addEventListener('click', () => {
  state.effect = button.dataset.effect;
  render();
  sendCommand(`EFFECT=${state.effect}`);
}));
$$('.profile-card').forEach((button) => button.addEventListener('click', () => {
  $$('.profile-card').forEach((card) => card.classList.toggle('selected', card === button));
  state.brightness = Number(button.dataset.brightness || 100);
  state.powered = true;
  setColor(button.dataset.color, button.dataset.name);
  render();
  sendCommand(`BRIGHTNESS=${state.brightness}`);
  sendCommand('POWER=1');
  setView('home');
  toast(`Perfil ${state.profile} aplicado`);
}));
$('#connectButton').addEventListener('click', connectBluetooth);
$('#disconnectButton').addEventListener('click', disconnectBluetooth);

function updateClock() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  $('#dateLabel').textContent = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();
}
updateClock();
setInterval(updateClock, 15000);
render();
