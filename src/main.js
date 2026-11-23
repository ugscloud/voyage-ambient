import './style.css';
import './editor/editor.css';
import { createEditorMarkup, initVisualEditor, openVisualEditor } from './editor/editor-ui.js';
import { loadConfig, saveConfig, updateConfig, validateBackup } from './core/config-store.js';
import { VoyageBleClient } from './core/ble-client.js';
import { THEMES } from './core/theme-registry.js';
import { createRelayModuleTemplate, normalizeOutput } from './core/module-registry.js';
import { createAutomationDraft } from './core/automation-store.js';
import { saveAsset, listAssets, deleteAsset } from './core/asset-library.js';
import { exportConfiguration, exportDeveloperPackage } from './core/developer-tools.js';
import { normalizeLedMap, makeLedTestCommand, makeLedColorCommand, parseFirmwareInfo } from './core/led-mapping.js';
import cabinImageUrl from './themes/land-rover/land-rover-cabin.webp';
import floraCabinUrl from './themes/land-rover/interiors/flora.webp';
import sportCabinUrl from './themes/land-rover/interiors/sport.webp';
import sportPulseCabinUrl from './themes/land-rover/interiors/sport-pulse.webp';
import moonlightCabinUrl from './themes/land-rover/interiors/moonlight.webp';
import oceanCabinUrl from './themes/land-rover/interiors/ocean.webp';
import auroraCabinUrl from './themes/land-rover/interiors/aurora.webp';
import sunsetCabinUrl from './themes/land-rover/interiors/sunset.webp';
import relaxCabinUrl from './themes/land-rover/interiors/relax.webp';

const CABIN_SCENE_IMAGES = {
  flora: floraCabinUrl, sport: sportCabinUrl, 'sport-pulse': sportPulseCabinUrl,
  moonlight: moonlightCabinUrl, ocean: oceanCabinUrl, aurora: auroraCabinUrl,
  sunset: sunsetCabinUrl, relax: relaxCabinUrl,
};

// A configuração é única e versionada. A migração preserva as preferências da versão anterior.
let appConfig = loadConfig();

// Paleta de 30 tons inspirada nas opções de iluminação Range Rover.
// Os códigos RGB são escolhas do Voyage Ambient, não códigos oficiais da fábrica.
const PALETTE = [
  ['Ice White', '#F1F7FF'], ['Moonlight', '#91B4D8'], ['Arctic Blue', '#70D8FF'],
  ['Electric Blue', '#087CFF'], ['Sapphire', '#1746D1'], ['Ocean', '#007FA8'],
  ['Turquoise', '#00D6C9'], ['Mint', '#64F0C1'], ['Jade', '#00B77A'],
  ['Flora', '#28C76F'], ['Emerald', '#009B55'], ['Lime', '#A8E600'],
  ['Golden', '#FFC247'], ['Amber', '#FF9D22'], ['Candle', '#FFD0A0'],
  ['Copper', '#CF743F'], ['Racing Red', '#FF0000'], ['Ruby', '#D90032'],
  ['Crimson', '#A8002A'], ['Coral', '#FF5A55'], ['Rose', '#FF6FAE'],
  ['Magenta', '#E000A8'], ['Pink', '#FF43D0'], ['Violet', '#9D4DFF'],
  ['Amethyst', '#7441C8'], ['Indigo', '#4936A8'], ['Lavender', '#B5A0FF'],
  ['Ice Green', '#B4FFD9'], ['Warm White', '#FFE6C7'], ['Deep Teal', '#006B68'],
].map(([name, color]) => ({ name, color }));

const MOODS = [
  { id: 'flora', name: 'FLORA', subtitle: 'Verde natural e sereno', color: '#37D67A', frontColor: '#36D67A', rearColor: '#83F0A9', brightness: 72, effect: 'BREATHE' },
  { id: 'sport', name: 'SPORT', subtitle: 'Vermelho intenso', color: '#FF0000', frontColor: '#FF0000', rearColor: '#D90018', brightness: 92, effect: 'SOLID' },
  { id: 'sport-pulse', name: 'SPORT PULSE', subtitle: 'Pulso vermelho suave', color: '#FF1A1A', frontColor: '#FF1A1A', rearColor: '#980018', brightness: 88, effect: 'BREATHE' },
  { id: 'moonlight', name: 'MOONLIGHT', subtitle: 'Azul frio e sofisticado', color: '#91B4D8', frontColor: '#91B4D8', rearColor: '#517CB2', brightness: 68, effect: 'SOLID' },
  { id: 'ocean', name: 'OCEAN', subtitle: 'Azul oceânico', color: '#00BBD4', frontColor: '#00BBD4', rearColor: '#007F9F', brightness: 74, effect: 'BREATHE' },
  { id: 'aurora', name: 'AURORA', subtitle: 'Ciclo cromático imersivo', color: '#8E5BFF', frontColor: '#8E5BFF', rearColor: '#13C6D8', brightness: 72, effect: 'RAINBOW' },
  { id: 'sunset', name: 'SUNSET', subtitle: 'Âmbar e pôr do sol', color: '#FF8A42', frontColor: '#FF8A42', rearColor: '#FFC16C', brightness: 70, effect: 'BREATHE' },
  { id: 'relax', name: 'RELAX', subtitle: 'Branco quente e conforto', color: '#FFD6A0', frontColor: '#FFD6A0', rearColor: '#F4E4CD', brightness: 54, effect: 'BREATHE' },
];

function loadSavedState() {
  return {
    connected: false,
    powered: appConfig.lighting.powered ?? true,
    color: appConfig.lighting.color || '#91B4D8',
    brightness: appConfig.lighting.brightness ?? 80,
    effect: appConfig.lighting.effect || 'SOLID',
    speed: appConfig.lighting.speed ?? 45,
    profile: appConfig.lighting.profile || 'MOONLIGHT',
    sceneId: appConfig.lighting.sceneId || (MOODS.find((mood) => mood.name === appConfig.lighting.profile)?.id || 'moonlight'),
    zones: {
      front: appConfig.lighting.zones?.front || appConfig.lighting.color || '#91B4D8',
      rear: appConfig.lighting.zones?.rear || appConfig.lighting.color || '#91B4D8',
      linked: Boolean(appConfig.lighting.zones?.linked ?? true),
    },
    cameraPackage: appConfig.camera.frontPackage || '',
    ledMap: normalizeLedMap(appConfig.lighting.ledMap),
    firmwareVersion: 'Não identificado',
    firmwareFeatures: [],
    firmwareLedCount: 5,
  };
}

const state = loadSavedState();
state.zones ||= { front: state.color, rear: state.color, linked: true };
let bleClient;
let toastTimer;
let selectedLedIndex = 1;
let ledTestSequenceAbort = false;

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="pivi-shell">
    <header class="topbar">
      <div class="brand-lockup"><div class="brand-mark">V</div><div class="brand-copy"><b>VOYAGE</b><span>AMBIENT EXPERIENCE</span></div></div>
      <button class="mode-chip" data-view="modes"><span class="mode-dot"></span> LAND ROVER <span class="mode-chevron">⌄</span></button>
      <div class="top-meta"><div class="date-stack"><span id="dateLabel">SÁBADO, 21 NOV</span><b id="clock">00:00</b></div><div class="top-divider"></div><div class="ble-status" id="connectionPill"><i></i><span id="connectionText">ESP32 DESCONECTADO</span></div></div>
    </header>

    <aside class="left-rail" aria-label="Navegação principal">
      <button class="rail-button active" data-view="home" title="Início"><span class="icon">⌂</span><small>HOME</small></button>
      <button class="rail-button" data-view="apps" title="Aplicativos"><span class="icon">▦</span><small>APPS</small></button>
      <button class="rail-button" data-view="lighting" title="Iluminação"><span class="icon">✧</span><small>LUZES</small></button>
      <button class="rail-button" data-view="camera" title="Câmera frontal"><span class="icon">◉</span><small>CÂMERA</small></button>
      <div class="rail-spacer"></div>
      <button class="rail-button" data-view="settings" title="Configurações"><span class="icon">⚙</span><small>AJUSTES</small></button>
      <button class="rail-button developer-rail" data-view="developer" title="Desenvolvedor"><span class="icon">⌘</span><small>DEV</small></button>
    </aside>

    <main class="main-content">
      <section class="view active" id="view-home">
        <div class="home-hero">
          <div class="home-hero-shade"></div>
          <div class="home-hero-topline">
            <div class="home-hero-brand"><span class="home-brand-mark">V</span><span><b>VOYAGE AMBIENT</b><small>LAND ROVER DESIGN THEME</small></span></div>
            <div class="home-hero-weather"><span>EXPERIÊNCIA DE CONDUÇÃO</span><b id="heroGreetingTime">—</b></div>
          </div>
          <div class="home-welcome-wrap">
            <div class="home-welcome-rule"></div>
            <h1 id="homeGreetingTitle" class="home-greeting" aria-live="polite">Boa viagem</h1>
          </div>
          <div class="home-hero-spacer"></div>
          <div class="home-hero-cards home-dashboard" id="home-dashboard">
            <button class="home-feature-card home-feature-lighting" data-go="lighting">
              <span class="feature-card-icon">✧</span><span class="feature-card-copy"><small>AMBIENTE</small><b>Iluminação</b><em id="homeMood">MOONLIGHT • AZUL NOTURNO</em></span><span class="feature-card-arrow">↗</span>
              <span class="feature-card-status"><i class="live-dot"></i><b id="homePowerText">SISTEMA LIGADO</b><span id="homeBrightness">80%</span><i class="color-indicator" id="homeColorDot"></i></span><span id="homeGlow" class="feature-card-glow"></span>
            </button>
            <button class="home-feature-card home-feature-camera" data-go="camera">
              <span class="feature-card-icon">◉</span><span class="feature-card-copy"><small>DRIVER ASSIST</small><b>Câmera frontal</b><em>VISUALIZAÇÃO DO VEÍCULO</em></span><span class="feature-card-arrow">↗</span>
            </button>
            <button class="home-feature-card home-feature-vehicle" data-go="vehicle">
              <span class="feature-card-icon">⌁</span><span class="feature-card-copy"><small>VEÍCULO</small><b>Dados e status</b><em>INFORMAÇÕES DO SISTEMA</em></span><span class="feature-card-arrow">↗</span>
            </button>
            <button class="home-feature-card home-feature-scenes" data-go="profiles">
              <span class="feature-card-icon">◇</span><span class="feature-card-copy"><small>PERSONALIZAÇÃO</small><b>Temas de ambiente</b><em>FLORA · SPORT · OCEAN</em></span><span class="feature-card-arrow">↗</span>
            </button>
          </div>
          <div class="home-hero-footer"><span>VOYAGE AMBIENT <i>•</i> LAND ROVER DESIGN</span><span class="home-hero-page-dots"><i class="active"></i><i></i><i></i></span><span class="home-hero-live"><i></i> <span id="homeConnectionLabel">CONTROLADOR PRONTO</span></span></div>
        </div>
      </section>

      <section class="view" id="view-apps">
        <div class="page-title-row"><div><div class="eyebrow">MENU PRINCIPAL</div><h1>Aplicativos</h1><p>Escolha uma função do Voyage Ambient.</p></div></div>
        <div class="apps-grid">
          <button class="app-tile" data-go="lighting"><span class="app-icon">✧</span><b>ILUMINAÇÃO</b><small>Cor, brilho e efeitos</small></button>
          <button class="app-tile" data-go="camera"><span class="app-icon">◉</span><b>CÂMERA FRONTAL</b><small>Visualização dianteira</small></button>
          <button class="app-tile" data-go="vehicle"><span class="app-icon">▱</span><b>DADOS DO VEÍCULO</b><small>OBD2 e sensores</small></button>
          <button class="app-tile" data-go="profiles"><span class="app-icon">◈</span><b>AMBIENTES</b><small>Cenas de iluminação</small></button>
          <button class="app-tile" data-go="modes"><span class="app-icon">◇</span><b>ESTILO VISUAL</b><small>Land Rover e outros</small></button>
          <button class="app-tile" data-go="settings"><span class="app-icon">⚙</span><b>CONFIGURAÇÕES</b><small>Conexões do sistema</small></button>
          <button class="app-tile developer-app-tile" data-go="developer"><span class="app-icon">⌘</span><b>DESENVOLVEDOR</b><small>Ferramentas e exportação</small></button>
          <div class="app-tile disabled"><span class="app-icon">♫</span><b>MÍDIA</b><small>Integração futura</small><em>EM BREVE</em></div>
          <div class="app-tile disabled"><span class="app-icon">♧</span><b>CONFORTO</b><small>Funções futuras</small><em>EM BREVE</em></div>
        </div>
      </section>

      <section class="view" id="view-lighting">
        <div class="ambient-console">
          <header class="ambient-console-head">
            <div class="ambient-title-group">
              <span class="eyebrow">VOYAGE AMBIENT • CABIN EXPERIENCE</span>
              <h1>Iluminação ambiente</h1>
              <p>Personalize a atmosfera do habitáculo com controle preciso.</p>
            </div>
            <div class="ambient-live-status">
              <span class="scene-dot" id="sceneDot"></span>
              <span><small>CENA ATIVA</small><b id="sceneName">MOONLIGHT</b></span>
              <button class="power-control on" id="lightingPower" aria-label="Ligar ou desligar iluminação"><span>⏻</span></button>
            </div>
          </header>

          <nav class="ambient-tabs" aria-label="Controles de iluminação">
            <button class="ambient-tab active" type="button" data-light-tab="ambiente"><span>◈</span>Ambiente</button>
            <button class="ambient-tab" type="button" data-light-tab="cor"><span>◉</span>Cor personalizada</button>
            <button class="ambient-tab" type="button" data-light-tab="zonas"><span>⌗</span>Zonas</button>
            <button class="ambient-tab" type="button" data-light-tab="efeitos"><span>∿</span>Efeitos</button>
          </nav>

          <div class="ambient-workspace">
            <section class="ambient-cabin-panel" id="ambientCabinPanel" aria-label="Prévia do habitáculo">
              <div class="ambient-cabin-photo"></div>
              <div class="ambient-cabin-vignette"></div>
              <div class="ambient-cabin-heading">
                <span class="eyebrow">AMBIENTE PERSONALIZÁVEL</span>
                <h2>Uma atmosfera.<br><em>Do seu jeito.</em></h2>
                <p>Escolha cores, zonas e efeitos para o interior.</p>
              </div>
              <div class="ambient-cabin-led-layer" id="ambientCabinLedMarkers" aria-label="Iluminação mapeada em tempo real"></div>
              <div class="ambient-cabin-caption"><span><i class="live-dot" id="lightingStatusDot"></i><b id="lightingState">ILUMINAÇÃO ATIVA</b></span><small>5 PIXELS ENDEREÇÁVEIS • GPIO 12</small></div>
            </section>

            <div class="ambient-control-panel">
              <section class="ambient-tab-panel active" id="lighting-panel-ambiente" data-light-panel="ambiente">
                <div class="ambient-panel-heading"><div><span class="eyebrow">CENAS PREDEFINIDAS</span><h2>Temas de ambiente</h2><p>Selecione uma atmosfera pronta para o habitáculo.</p></div><span class="panel-counter">08 CENAS</span></div>
                <div class="ambient-theme-grid">
                  <button class="ambient-theme-card theme-flora" data-mood="flora" type="button"><span class="theme-card-art"></span><span class="theme-card-copy"><b>Flora</b><small>Natural e sereno</small></span><i>↗</i></button>
                  <button class="ambient-theme-card theme-sport" data-mood="sport" type="button"><span class="theme-card-art"></span><span class="theme-card-copy"><b>Sport</b><small>Vermelho intenso</small></span><i>↗</i></button>
                  <button class="ambient-theme-card theme-sport-pulse" data-mood="sport-pulse" type="button"><span class="theme-card-art"></span><span class="theme-card-copy"><b>Sport Pulse</b><small>Pulso vermelho</small></span><i>↗</i></button>
                  <button class="ambient-theme-card theme-moonlight" data-mood="moonlight" type="button"><span class="theme-card-art"></span><span class="theme-card-copy"><b>Moonlight</b><small>Azul noturno</small></span><i>↗</i></button>
                  <button class="ambient-theme-card theme-ocean" data-mood="ocean" type="button"><span class="theme-card-art"></span><span class="theme-card-copy"><b>Ocean</b><small>Azul oceânico</small></span><i>↗</i></button>
                  <button class="ambient-theme-card theme-aurora" data-mood="aurora" type="button"><span class="theme-card-art"></span><span class="theme-card-copy"><b>Aurora</b><small>Ciclo imersivo</small></span><i>↗</i></button>
                  <button class="ambient-theme-card theme-sunset" data-mood="sunset" type="button"><span class="theme-card-art"></span><span class="theme-card-copy"><b>Sunset</b><small>Âmbar acolhedor</small></span><i>↗</i></button>
                  <button class="ambient-theme-card theme-relax" data-mood="relax" type="button"><span class="theme-card-art"></span><span class="theme-card-copy"><b>Relax</b><small>Conforto suave</small></span><i>↗</i></button>
                </div>
                <div class="ambient-selected-scene"><span class="selected-scene-swatch" id="selectedColorChip"></span><div><small>AMBIENTE SELECIONADO</small><b id="selectedColorName">Moonlight</b><em id="selectedHex">#91B4D8</em></div><button type="button" class="ambient-inline-action" data-light-tab="cor">PERSONALIZAR COR <span>→</span></button></div>
              </section>

              <section class="ambient-tab-panel" id="lighting-panel-cor" data-light-panel="cor" hidden>
                <div class="ambient-panel-heading"><div><span class="eyebrow">PALETA DE ILUMINAÇÃO</span><h2>Escolha sua cor</h2><p>30 tons de referência e seleção livre.</p></div><span class="panel-counter">RGB</span></div>
                <div class="ambient-color-selector"><div class="ambient-color-preview" id="ambientColorPreview"><span id="ambientColorCore"></span></div><div class="ambient-color-picker-copy"><small>COR PRINCIPAL</small><b id="ambientColorName">Moonlight</b><strong id="ambientColorHex">#91B4D8</strong><label class="ambient-color-input-wrap" for="colorPicker"><span>ABRIR SELETOR COMPLETO</span><input id="colorPicker" type="color" value="#91B4D8" aria-label="Selecionar qualquer cor" /></label></div></div>
                <div class="ambient-quick-colors"><div class="ambient-panel-subhead"><b>Cores rápidas</b><small>SELECIONE UM TOM</small></div><div class="color-palette color-palette-premium" id="colorPalette"></div></div>
              </section>

              <section class="ambient-tab-panel" id="lighting-panel-zonas" data-light-panel="zonas" hidden>
                <div class="ambient-panel-heading"><div><span class="eyebrow">PERSONALIZAÇÃO POR ÁREA</span><h2>Zonas de iluminação</h2><p>Defina uma cor para a frente e outra para a traseira.</p></div><span class="panel-counter">2 ZONAS</span></div>
                <div class="ambient-zone-preview led-zone-preview"><img class="ambient-zone-photo" id="ambientZonePhoto" src="${cabinImageUrl}" alt="Interior do veículo visto da cabine"/><div class="ambient-zone-photo-shade"></div><div class="led-zone-markers" id="lightingLedMarkers" aria-label="Posições configuradas dos LEDs"></div><div class="ambient-zone-preview-caption"><span>MAPA DE ILUMINAÇÃO DO HABITÁCULO</span><small>PRÉVIA CONFIGURÁVEL</small></div></div>
                <div class="ambient-zone-controls">
                  <article class="ambient-zone-control"><div class="ambient-zone-top"><span class="zone-index">01</span><div><b>Dianteira</b><small>Motorista e passageiro</small></div><span class="zone-swatch" id="frontZoneSwatch"></span></div><div class="ambient-zone-input-row"><label for="frontZoneColor">Cor dianteira</label><input id="frontZoneColor" type="color" value="#91B4D8"/><strong id="frontZoneHex">#91B4D8</strong></div></article>
                  <article class="ambient-zone-control"><div class="ambient-zone-top"><span class="zone-index">02</span><div><b>Traseira</b><small>Banco traseiro</small></div><span class="zone-swatch" id="rearZoneSwatch"></span></div><div class="ambient-zone-input-row"><label for="rearZoneColor">Cor traseira</label><input id="rearZoneColor" type="color" value="#91B4D8"/><strong id="rearZoneHex">#91B4D8</strong></div></article>
                </div>
                <div class="ambient-zone-footer"><button class="ambient-inline-action" id="syncZoneColors" type="button">⛓ UNIFICAR CORES</button><p id="zoneFirmwareNote">As cores por zona são salvas no aplicativo. O firmware atual ainda envia uma cor única para os cinco LEDs; o firmware Voyage Core 0.5.1 habilita o controle por pixel e a gravação das preferências no controlador.</p></div>
                <div class="lighting-led-summary"><div><b>Mapeamento físico dos LEDs</b><small>Configure a posição e o nome de cada ponto no Modo Desenvolvedor.</small></div><button class="ambient-inline-action" type="button" data-go="developer">ABRIR MAPEAMENTO ↗</button></div>
              </section>

              <section class="ambient-tab-panel" id="lighting-panel-efeitos" data-light-panel="efeitos" hidden>
                <div class="ambient-panel-heading"><div><span class="eyebrow">MOVIMENTO DA ILUMINAÇÃO</span><h2>Efeitos de luz</h2><p>Escolha como a cor se comporta no habitáculo.</p></div><span class="panel-counter">3 ATIVOS</span></div>
                <div class="ambient-effects-grid">
                  <button class="effect-button active" data-effect="SOLID" type="button"><span class="effect-visual effect-static"></span><b>Estático</b><small>Cor contínua</small></button>
                  <button class="effect-button" data-effect="BREATHE" type="button"><span class="effect-visual effect-breathe"></span><b>Respiração</b><small>Brilho suave</small></button>
                  <button class="effect-button" data-effect="RAINBOW" type="button"><span class="effect-visual effect-spectrum"></span><b>Arco-íris</b><small>Ciclo de cores</small></button>
                </div>
                <div class="ambient-future-effects"><div class="ambient-panel-subhead"><b>Próximos efeitos</b><small>DISPONÍVEIS APÓS ATUALIZAÇÃO DO CONTROLADOR</small></div><div class="future-effect-list"><span>Onda</span><span>Cometa</span><span>Ritmo da música</span><span>Cascata</span><span>Sequencial</span></div></div>
                <div class="ambient-effect-speed"><div class="range-heading"><label for="speed">Velocidade do efeito</label><strong id="speedValue">45%</strong></div><input class="range premium-range" type="range" id="speed" min="1" max="100" value="45"/><div class="range-ends"><span>Gradual</span><span>Rápido</span></div></div>
              </section>
            </div>
          </div>

          <footer class="ambient-bottom-bar">
            <div class="ambient-power-label"><span class="live-dot" id="ambientBottomStatus"></span><b id="ambientBottomText">ILUMINAÇÃO ATIVA</b></div>
            <div class="ambient-master-brightness"><span>☼</span><div class="range-heading"><label for="brightness">Brilho geral</label><strong id="brightnessValue">80%</strong></div><input class="range premium-range" type="range" id="brightness" min="0" max="100" value="80"/></div>
            <div class="ambient-current-summary"><span class="selected-color-chip"></span><b id="ambientSummaryColor">MOONLIGHT</b><small id="ambientSummaryHex">#91B4D8</small></div>
          </footer>
        </div>
      </section>

      <section class="view" id="view-camera">
        <div class="page-title-row"><div><div class="eyebrow">DRIVER ASSIST • CAMERA</div><h1>Câmera frontal</h1><p>Acesso ao aplicativo de câmera instalado na multimídia.</p></div><span class="count-label">INTEGRAÇÃO ANDROID</span></div>
        <div class="camera-layout">
          <article class="camera-preview-panel">
            <div class="camera-preview-top"><span><i class="live-dot"></i> VISUALIZAÇÃO FRONTAL</span><span>VOYAGE • FRONT VIEW</span></div>
            <div class="camera-preview-screen"><div class="camera-reticle">＋</div><div class="camera-guides"><i></i><i></i><i></i></div><div class="camera-placeholder-icon">◉</div><b>IMAGEM DA CÂMERA</b><small>Aguardando abertura do aplicativo da multimídia</small></div>
            <div class="camera-preview-bottom"><span>FRONT CAMERA</span><span>SINAL DE VÍDEO NÃO DISPONÍVEL NESTA PÁGINA</span></div>
          </article>
          <article class="pivi-panel camera-launch-panel"><span class="eyebrow">APLICATIVO INSTALADO</span><h2>Câmera frontal</h2>
            <p>O atalho está preparado para abrir o aplicativo nativo da central. Para iniciar diretamente, precisamos do identificador Android do aplicativo — o nome que aparece no menu não é suficiente.</p>
            <label class="field-label" for="cameraPackage">Identificador do aplicativo (package name)</label>
            <input class="text-field" id="cameraPackage" value="" placeholder="Ex.: com.fabricante.camerafront" autocomplete="off" />
            <button class="primary-button" id="saveCameraPackage">SALVAR IDENTIFICADOR</button>
            <button class="launch-button" id="launchCamera">◉ &nbsp; ABRIR CÂMERA FRONTAL</button>
            <p class="small-note">Ainda não sabemos o identificador técnico. Podemos descobrir quando estivermos na multimídia Android.</p>
          </article>
        </div>
        <div class="camera-note"><b>Sobre a visualização 360°:</b> por enquanto, o app oferece o atalho para a câmera frontal. Exibir o vídeo dentro desta tela ou criar uma visão 360° depende de acesso ao sinal de vídeo da câmera; isso não é fornecido automaticamente pelo nome do aplicativo.</div>
      </section>

      <section class="view" id="view-vehicle">
        <div class="page-title-row"><div><div class="eyebrow">VEHICLE INFORMATION</div><h1>Dados do veículo</h1><p>Central de informações do Voyage.</p></div><span class="count-label">OBD2 • FUTURA INTEGRAÇÃO</span></div>
        <div class="vehicle-metrics"><article class="metric-panel"><small>TEMPERATURA DO MOTOR</small><b>— <em>°C</em></b><span>Aguardando scanner OBD2</span></article><article class="metric-panel"><small>ROTAÇÃO DO MOTOR</small><b>— <em>RPM</em></b><span>Aguardando scanner OBD2</span></article><article class="metric-panel"><small>VELOCIDADE</small><b>— <em>km/h</em></b><span>Aguardando scanner OBD2</span></article></div>
        <article class="pivi-panel info-panel"><span class="eyebrow">INTEGRAÇÃO</span><h2>Informações em tempo real</h2><p>Esta área está reservada para temperatura, RPM, velocidade e outras leituras do veículo. A integração OBD2 será adicionada em uma etapa separada, sem interferir no controle de iluminação.</p><div class="future-label">RECURSO EM PREPARAÇÃO</div></article>
      </section>

      <section class="view" id="view-profiles"><div class="page-title-row"><div><div class="eyebrow">AMBIENT EXPERIENCES</div><h1>Ambientes</h1><p>Escolha uma atmosfera e aplique no habitáculo.</p></div></div><div class="mood-cards" id="moodCards"></div></section>

      <section class="view" id="view-modes">
        <div class="page-title-row"><div><div class="eyebrow">PERSONALIZAÇÃO DO SISTEMA</div><h1>Estilo visual</h1><p>Escolha a identidade visual de toda a central.</p></div></div>
        <div class="theme-grid">
          <button class="theme-card selected"><span class="theme-preview landrover-preview"><i></i><i></i><i></i></span><b>LAND ROVER</b><small>Interface Pivi inspirada • Ativo</small><em>ATIVO</em></button>
          <div class="theme-card locked"><span class="theme-preview bmw-preview"><i></i><i></i><i></i></span><b>BMW</b><small>Identidade visual futura</small><em>EM BREVE</em></div>
          <div class="theme-card locked"><span class="theme-preview custom-preview"><i></i><i></i><i></i></span><b>PERSONALIZADO</b><small>Crie sua própria interface</small><em>EM BREVE</em></div>
        </div>
      </section>

      <section class="view" id="view-developer">
        <div class="page-title-row"><div><div class="eyebrow">FERRAMENTAS DO PROPRIETÁRIO</div><h1>Modo desenvolvedor</h1><p>Configuração, biblioteca de recursos e diagnóstico do Voyage Ambient.</p></div><span class="count-label">BASE DO SISTEMA • v0.4</span></div>
        <div class="dev-notice"><b>Área de desenvolvimento ativa.</b> Os temas padrão são editáveis neste modo. Antes da comercialização, esta área deverá receber autenticação de proprietário e permissões de produção.</div>
        <button class="editor-entry-button" data-go="editor"><span class="editor-entry-icon">✦</span><span><b>ABRIR EDITOR VISUAL</b><small>Personalize temas, organize widgets, imagens, menus e pop-ups</small></span><strong>↗</strong></button>
        <div class="dev-grid">
          <article class="pivi-panel dev-card">
            <span class="eyebrow">EXPORTAÇÃO PARA ASSISTÊNCIA</span><h2>Pacote para continuar o desenvolvimento</h2>
            <p>Gera um JSON com versão, configurações, tema, módulos, protocolo BLE e estados de implementação. Não inclui senhas ou chaves privadas.</p>
            <button class="primary-button" id="exportSupport">GERAR PACOTE PARA ENVIAR AO CHATGPT</button>
            <button class="secondary-button dev-wide-button" id="exportBackup">BAIXAR BACKUP DE CONFIGURAÇÃO</button>
            <label class="secondary-button dev-import-label" for="importBackupFile">IMPORTAR BACKUP JSON</label><input id="importBackupFile" type="file" accept="application/json,.json" hidden />
          </article>
          <article class="pivi-panel dev-card">
            <span class="eyebrow">ARQUITETURA ATUAL</span><h2>Estado do ecossistema</h2>
            <div class="dev-stat-row"><span>Núcleo web</span><b>Organizado</b></div>
            <div class="dev-stat-row"><span>BLE iluminação legado</span><b class="dev-good">Compatibilidade preservada</b></div>
            <div class="dev-stat-row"><span>Editor visual</span><b class="dev-good">Primeira versão disponível</b></div>
            <div class="dev-stat-row"><span>OTA Wi-Fi / BLE</span><b class="dev-pending">Ainda não implementado</b></div>
            <div class="dev-stat-row"><span>APK Android / launcher</span><b class="dev-pending">Ainda não implementado</b></div>
          </article>
        </div>
        <div class="dev-grid">
          <article class="pivi-panel dev-card dev-wide">
            <div class="dev-section-heading"><div><span class="eyebrow">CATÁLOGO DE HARDWARE</span><h2>Módulos reconhecidos e modelos</h2></div><span class="count-label" id="moduleCount">—</span></div>
            <div id="moduleList" class="dev-module-list"></div>
          </article>
          <article class="pivi-panel dev-card dev-wide led-mapping-card">
            <div class="dev-section-heading"><div><span class="eyebrow">ILUMINAÇÃO • HARDWARE</span><h2>Editor de zonas e mapeamento dos LEDs</h2><p>Associe cada pixel físico a uma posição do carro. Arraste os pontos sobre a imagem para ajustar o local.</p></div><span class="count-label" id="ledFirmwareBadge">FIRMWARE LEGADO</span></div>
            <div class="led-map-layout">
              <div class="led-map-stage" id="ledMapStage">
                <img id="ledMapPhoto" src="${cabinImageUrl}" alt="Interior do veículo para mapear os LEDs" draggable="false"/>
                <div class="led-map-shade"></div>
                <div class="led-map-markers" id="ledMapMarkers"></div>
                <div class="led-map-stage-label"><span>VISTA DO HABITÁCULO</span><small>SELECIONE OU ARRASTE UM PONTO</small></div>
              </div>
              <div class="led-map-side">
                <div class="led-map-list-head"><b>LEDs reconhecidos</b><small>5 CANAIS FÍSICOS</small></div>
                <div class="led-map-list" id="ledMapList"></div>
                <div class="led-map-editor" id="ledMapEditor"></div>
              </div>
            </div>
            <div class="led-tester-panel">
              <div class="led-tester-head"><div><b>Testador de LEDs</b><small>Identifique fisicamente cada fita ou ponto antes de nomear.</small></div><div class="led-tester-actions"><button class="secondary-button" id="startLedSequence" type="button">TESTAR EM SEQUÊNCIA</button><button class="secondary-button" id="stopLedTest" type="button" disabled>PARAR</button></div></div>
              <div class="led-tester-list" id="ledTesterList"></div>
              <p class="small-note" id="ledTesterStatus">O teste físico individual requer o firmware Voyage Core 0.5.1. Com o firmware atual, os cinco LEDs ainda acendem juntos.</p>
            </div>
            <div class="led-map-save-row"><span>As posições e nomes ficam salvos na configuração deste navegador e entram no pacote de exportação do desenvolvedor.</span><button class="primary-button" id="saveLedMap" type="button">SALVAR MAPEAMENTO</button></div>
          </article>

          <article class="pivi-panel dev-card dev-wide">
            <div class="dev-section-heading"><div><span class="eyebrow">MODELO DE MÓDULO</span><h2>Configuração de cinco relés</h2></div><span class="count-label">RASCUNHO LOCAL</span></div>
            <p>Defina nomes e comportamentos para um futuro módulo. Estas opções ficam salvas no navegador, mas ainda não são enviadas ao ESP32 nem acionam relés físicos.</p>
            <div id="relayEditor" class="relay-editor"></div>
            <button class="primary-button" id="saveRelayConfig">SALVAR MODELO DE RELÉS</button>
          </article>
          <article class="pivi-panel dev-card">
            <span class="eyebrow">REGRAS DO VEÍCULO</span><h2>Automações em preparação</h2>
            <p>Crie rascunhos das regras que futuramente serão enviadas ao Voyage Core.</p>
            <button class="secondary-button dev-wide-button" id="addAutomation">CRIAR RASCUNHO: PORTA → LUZ</button>
            <div id="automationList" class="dev-list"></div>
          </article>
          <article class="pivi-panel dev-card">
            <span class="eyebrow">BIBLIOTECA LOCAL</span><h2>Imagens, sons e modelos 3D</h2>
            <p>Arquivos adicionados aqui ficam neste navegador/dispositivo (IndexedDB). Eles não são enviados ao GitHub nem sincronizados automaticamente.</p>
            <label class="primary-button dev-import-label" for="assetUpload">ADICIONAR ARQUIVOS</label>
            <input id="assetUpload" type="file" accept="image/*,audio/*,model/gltf-binary,.glb,.gltf,.bin,.mp3,.wav,.ogg" multiple hidden />
            <div id="assetList" class="dev-list"></div>
          </article>
          <article class="pivi-panel dev-card dev-wide">
            <span class="eyebrow">BIBLIOTECA DE INTERFACES</span><h2>Temas separados do núcleo</h2>
            <div id="themeList" class="dev-theme-list"></div>
            <p class="small-note">Nesta entrega, Land Rover continua sendo o único tema visual funcional. BMW e Personalizado já têm pastas e manifestos iniciais, mas ainda não possuem layouts próprios.</p>
          </article>
        </div>
      </section>

      ${createEditorMarkup()}

      <section class="view" id="view-settings">
        <div class="page-title-row"><div><div class="eyebrow">SYSTEM SETTINGS</div><h1>Configurações</h1><p>Conexões e preferências do Voyage Ambient.</p></div></div>
        <article class="pivi-panel settings-panel">
          <div class="settings-row"><div><b>Controlador de iluminação</b><small>ESP32-S3 • Bluetooth Low Energy • Nome: Voyage Ambient</small></div><button class="primary-button compact" id="connectButton">CONECTAR ESP32</button></div>
          <div class="settings-row"><div><b>Estado da conexão</b><small id="settingsConnection">Nenhum controlador conectado</small></div><button class="secondary-button" id="disconnectButton" disabled>DESCONECTAR</button></div>
          <div class="settings-row"><div><b>Aplicativo de câmera</b><small id="savedCameraPackage">Identificador ainda não configurado</small></div><button class="secondary-button" data-go="camera">CONFIGURAR</button></div>
          <div class="settings-row"><div><b>Estilo visual</b><small>Land Rover • Pivi inspired</small></div><button class="secondary-button" data-go="modes">ALTERAR ESTILO</button></div>
          <div class="settings-row"><div><b>Ferramentas do proprietário</b><small>Editor visual, módulos, backups e exportação</small></div><button class="secondary-button" data-go="developer">ABRIR DESENVOLVEDOR</button></div>
          <div class="settings-row"><div><b>Versão</b><small>Voyage Ambient • núcleo modular • v0.4.0</small></div><span class="version-mark">0.4</span></div>
        </article>
        <p class="small-note settings-footnote">A conexão BLE via navegador requer suporte a Web Bluetooth e HTTPS. Algumas multimídias Android exigem uma versão APK com Bluetooth nativo.</p>
      </section>
    </main>

    <footer class="bottom-status"><span>VOYAGE AMBIENT EXPERIENCE</span><span class="footer-separator"></span><span>LAND ROVER DESIGN MODE</span><span class="footer-spacer"></span><span id="footerConnection">CONTROLADOR NÃO CONECTADO</span></footer>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 3400);
}

bleClient = new VoyageBleClient({
  onConnectionChange: (connected) => {
    state.connected = connected;
    if (!connected) { state.firmwareFeatures = []; state.firmwareVersion = 'Não identificado'; ledTestSequenceAbort = false; }
    render();
    updateLedFirmwareStatus();
    if (!connected) toast('ESP32 desconectado.');
  },
  onMessage: async (message) => {
    const firmwareInfo = parseFirmwareInfo(message);
    if (firmwareInfo) {
      state.firmwareVersion = firmwareInfo.version;
      state.firmwareLedCount = firmwareInfo.ledCount;
      state.firmwareFeatures = firmwareInfo.features;
      updateLedFirmwareStatus();
      if (state.firmwareFeatures.includes('LED_COLOR')) {
        for (const item of state.ledMap) await sendCommand(makeLedColorCommand(item.index, item.color));
      }
      toast(`Controlador identificado: firmware ${state.firmwareVersion}.`);
      return;
    }
    if (message.startsWith('LED_TEST_STARTED=')) {
      if ($('#ledTesterStatus')) $('#ledTesterStatus').textContent = `Testando LED ${message.split('=')[1]}… observe qual ponto acendeu.`;
      return;
    }
    if (message.startsWith('LED_TEST_DONE=')) {
      if ($('#ledTesterStatus')) $('#ledTesterStatus').textContent = `Teste do LED ${message.split('=')[1]} concluído.`;
      return;
    }
    if (message.startsWith('LC_OK=')) return;
    if (message === 'CONNECTED' || message === 'PONG') return;
    toast(`ESP32: ${message}`);
  },
});

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16));
}

function saveState() {
  const result = updateConfig(appConfig, {
    lighting: {
      powered: state.powered, color: state.color, brightness: state.brightness,
      effect: state.effect, speed: state.speed, profile: state.profile, sceneId: state.sceneId, zones: { ...state.zones }, ledMap: normalizeLedMap(state.ledMap),
    },
    camera: { frontPackage: state.cameraPackage },
  });
  appConfig = result.config;
  if (!result.ok) toast('Não foi possível salvar as preferências neste navegador.');
}

function colorName(color) {
  return PALETTE.find((item) => item.color.toLowerCase() === color.toLowerCase())?.name || 'Personalizada';
}

function render() {
  const color = state.color;
  document.documentElement.style.setProperty('--ambient', color);
  document.documentElement.style.setProperty('--ambient-soft', `${color}44`);
  document.documentElement.style.setProperty('--front-zone', state.zones.front);
  document.documentElement.style.setProperty('--rear-zone', state.zones.rear);
  if ($('#homeMood')) $('#homeMood').textContent = `${state.profile} • ${colorName(color).toUpperCase()}`;
  if ($('#heroGreetingTime')) $('#heroGreetingTime').textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  if ($('#homeConnectionLabel')) $('#homeConnectionLabel').textContent = state.connected ? 'CONTROLADOR CONECTADO' : 'CONTROLADOR PRONTO';
  if ($('#frontZoneColor')) $('#frontZoneColor').value = state.zones.front;
  if ($('#rearZoneColor')) $('#rearZoneColor').value = state.zones.rear;
  if ($('#frontZoneHex')) $('#frontZoneHex').textContent = state.zones.front.toUpperCase();
  if ($('#rearZoneHex')) $('#rearZoneHex').textContent = state.zones.rear.toUpperCase();
  if ($('#frontZoneSwatch')) $('#frontZoneSwatch').style.background = state.zones.front;
  if ($('#rearZoneSwatch')) $('#rearZoneSwatch').style.background = state.zones.rear;
  if ($('#zoneFirmwareNote')) {
    $('#zoneFirmwareNote').dataset.linked = state.zones.linked ? 'true' : 'false';
    $('#zoneFirmwareNote').textContent = state.firmwareFeatures.includes('LED_COLOR')
      ? `Voyage Core ${state.firmwareVersion}: controle individual por pixel ativo. As cores dianteira e traseira seguem o mapeamento salvo.`
      : 'As cores e posições ficam salvas no aplicativo. Para aplicar cores e testes individualmente nos cinco pixels, conecte o Voyage Core 0.5.1.';
  }
  if ($('#homeBrightness')) $('#homeBrightness').textContent = `${state.brightness}%`;
  if ($('#homePowerText')) $('#homePowerText').textContent = state.powered ? 'SISTEMA LIGADO' : 'SISTEMA DESLIGADO';
  if ($('#homeColorDot')) $('#homeColorDot').style.background = color;
  if ($('#homeGlow')) $('#homeGlow').style.background = `radial-gradient(ellipse, ${color}88 0%, ${color}00 70%)`;
  $('#brightness').value = String(state.brightness);
  $('#brightnessValue').textContent = `${state.brightness}%`;
  $('#speed').value = String(state.speed);
  $('#speedValue').textContent = `${state.speed}%`;
  $('#colorPicker').value = color;
  $('#sceneDot').style.background = color;
  $('#sceneName').textContent = state.profile;
  $('#selectedColorChip').style.background = color;
  $('#selectedColorName').textContent = colorName(color);
  $('#selectedHex').textContent = color.toUpperCase();
  if ($('#ambientColorName')) $('#ambientColorName').textContent = colorName(color);
  if ($('#ambientColorHex')) $('#ambientColorHex').textContent = color.toUpperCase();
  if ($('#ambientColorPreview')) $('#ambientColorPreview').style.setProperty('--preview-color', color);
  if ($('#ambientColorCore')) $('#ambientColorCore').style.background = color;
  if ($('#ambientSummaryColor')) $('#ambientSummaryColor').textContent = colorName(color).toUpperCase();
  if ($('#ambientSummaryHex')) $('#ambientSummaryHex').textContent = color.toUpperCase();
  if ($('#ambientBottomText')) $('#ambientBottomText').textContent = state.powered ? 'ILUMINAÇÃO ATIVA' : 'ILUMINAÇÃO DESLIGADA';
  if ($('#ambientBottomStatus')) $('#ambientBottomStatus').classList.toggle('off', !state.powered);
  const activeMood = MOODS.find((mood) => mood.name === state.profile);
  $$('.ambient-theme-card').forEach((button) => button.classList.toggle('active', button.dataset.mood === activeMood?.id));
  $('#lightingPower').classList.toggle('on', state.powered);
  $('#lightingState').textContent = state.powered ? 'ILUMINAÇÃO ATIVA' : 'ILUMINAÇÃO DESLIGADA';
  $('#lightingStatusDot').classList.toggle('off', !state.powered);
  $('#connectionPill').classList.toggle('connected', state.connected);
  $('#connectionText').textContent = state.connected ? 'ESP32 CONECTADO' : 'ESP32 DESCONECTADO';
  $('#settingsConnection').textContent = state.connected ? 'Conectado e pronto para receber comandos' : 'Nenhum controlador conectado';
  $('#connectButton').textContent = state.connected ? 'CONECTADO' : 'CONECTAR ESP32';
  $('#connectButton').disabled = state.connected;
  $('#disconnectButton').disabled = !state.connected;
  $('#footerConnection').textContent = state.connected ? 'CONTROLADOR CONECTADO' : 'CONTROLADOR NÃO CONECTADO';
  $('#savedCameraPackage').textContent = state.cameraPackage || 'Identificador ainda não configurado';
  $('#cameraPackage').value = state.cameraPackage;
  $$('.effect-button').forEach((button) => button.classList.toggle('active', button.dataset.effect === state.effect));
  $$('.color-choice').forEach((button) => button.classList.toggle('selected', button.dataset.color.toLowerCase() === color.toLowerCase()));
  renderLedLightingMarkers();
  renderLightingVisuals();
}

function setLightingTab(tab) {
  const safeTab = ['ambiente', 'cor', 'zonas', 'efeitos'].includes(tab) ? tab : 'ambiente';
  $$('[data-light-tab]').forEach((button) => {
    const active = button.dataset.lightTab === safeTab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  $$('[data-light-panel]').forEach((panel) => {
    const active = panel.dataset.lightPanel === safeTab;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
}

function setView(view) {
  $$('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${view}`));
  $('.main-content')?.classList.toggle('home-active', view === 'home');
  $$('.rail-button').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  if (view === 'camera') $('#cameraPackage').value = state.cameraPackage;
  if (view === 'developer') refreshDeveloperView();
  if (view === 'editor') openVisualEditor();
}

function sendCommand(command) {
  if (!bleClient?.connected || !state.connected) return Promise.resolve(false);
  return bleClient.send(command).catch((error) => {
    toast(`Falha ao enviar comando: ${error.message}`);
    return false;
  });
}

async function sendCurrentState() {
  const [r, g, b] = hexToRgb(state.color);
  await sendCommand(`POWER=${state.powered ? 1 : 0}`);
  await sendCommand(`COLOR=${r},${g},${b}`);
  await sendCommand(`BRIGHTNESS=${state.brightness}`);
  await sendCommand(`EFFECT=${state.effect}`);
  await sendCommand(`SPEED=${state.speed}`);
  if (state.firmwareFeatures.includes('LED_COLOR')) {
    for (const item of normalizeLedMap(state.ledMap)) await sendCommand(makeLedColorCommand(item.index, item.color));
  }
}

function setColor(color, name = colorName(color)) {
  state.color = color.toLowerCase();
  state.profile = name.toUpperCase();
  if (state.zones.linked) {
    state.zones = { ...state.zones, front: state.color, rear: state.color };
    state.ledMap = normalizeLedMap(state.ledMap).map((item) => ({ ...item, color: state.color }));
  }
  saveState(); render();
  if (state.zones.linked) {
    const [r, g, b] = hexToRgb(state.color);
    sendCommand(`COLOR=${r},${g},${b}`);
  }
  if (state.firmwareFeatures.includes('LED_COLOR')) state.ledMap.forEach((item) => sendCommand(makeLedColorCommand(item.index, item.color)));
}

function setZoneColor(zone, color) {
  if (!['front', 'rear'].includes(zone)) return;
  state.zones = { ...state.zones, [zone]: color.toLowerCase(), linked: false };
  state.ledMap = normalizeLedMap(state.ledMap).map((item) => item.zone === zone ? { ...item, color: color.toLowerCase() } : item);
  document.documentElement.style.setProperty(zone === 'front' ? '--front-zone' : '--rear-zone', color.toLowerCase());
  saveState();
  syncZoneControlsFromMap(zone);
  renderLedLightingMarkers();
  renderLightingVisuals();
  const capable = state.firmwareFeatures.includes('LED_COLOR');
  if (capable) {
    state.ledMap.filter((item) => item.zone === zone).forEach((item) => sendCommand(makeLedColorCommand(item.index, item.color)));
    toast(`Cor ${color.toUpperCase()} aplicada aos ${state.ledMap.filter((item) => item.zone === zone).length} pixel(is) da zona ${zone === 'front' ? 'dianteira' : 'traseira'}.`);
  } else {
    toast('Cor salva no aplicativo. Para aplicar por pixel, conecte o Voyage Core 0.5.1.');
  }
}

function setPower(powered) {
  state.powered = powered;
  saveState(); render();
  sendCommand(`POWER=${powered ? 1 : 0}`);
}

function applyMood(moodId) {
  const mood = MOODS.find((item) => item.id === moodId);
  if (!mood) return;
  state.color = mood.color;
  state.profile = mood.name;
  state.sceneId = mood.id;
  state.brightness = mood.brightness;
  state.effect = mood.effect;
  state.zones = { ...state.zones, front: mood.frontColor || mood.color, rear: mood.rearColor || mood.color, linked: false };
  state.ledMap = normalizeLedMap(state.ledMap).map((item) => ({
    ...item,
    color: item.zone === 'front' ? (mood.frontColor || mood.color) : item.zone === 'rear' ? (mood.rearColor || mood.color) : mood.color,
  }));
  saveState(); render();
  $$('[data-mood]').forEach((button) => button.classList.toggle('active', button.dataset.mood === moodId));
  sendCurrentState();
  toast(`Cena ${mood.name} aplicada.`);
}

async function connectBluetooth() {
  try {
    toast('Procurando o controlador Voyage Ambient…');
    await bleClient.connect();
    state.connected = true;
    render();
    await sendCurrentState();
    await sendCommand('INFO');
    window.setTimeout(() => { renderLedMapping(); updateLedFirmwareStatus(); }, 500);
    toast('ESP32 conectado. Verificando recursos do controlador.');
  } catch (error) {
    state.connected = false;
    state.firmwareFeatures = []; state.firmwareVersion = 'Não identificado';
    render();
    updateLedFirmwareStatus();
    if (error.name === 'NotFoundError') toast('Nenhum dispositivo selecionado.');
    else toast(`Não foi possível conectar: ${error.message}`);
  }
}

function disconnectBluetooth() {
  bleClient?.disconnect();
}

function saveCameraPackage() {
  const packageName = $('#cameraPackage').value.trim();
  if (packageName && !/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/.test(packageName)) {
    toast('O identificador deve ter formato parecido com com.fabricante.camera.'); return;
  }
  state.cameraPackage = packageName; saveState(); render();
  toast(packageName ? 'Identificador da câmera salvo.' : 'Identificador removido.');
}

function launchCameraApp() {
  if (!state.cameraPackage) {
    toast('Ainda falta descobrir o identificador Android do app “Câmera frontal”. O nome exibido não basta para abri-lo por esta página.'); return;
  }
  if (!/Android/i.test(navigator.userAgent)) {
    toast('Este atalho deve ser testado diretamente na multimídia Android.'); return;
  }
  window.location.href = `intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${state.cameraPackage};end`;
}


function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
}

function refreshDeveloperView() {
  renderModuleList();
  renderRelayEditor();
  renderAutomationList();
  renderThemeList();
  renderAssetList();
  renderLedMapping();
  updateLedFirmwareStatus();
}

function renderModuleList() {
  const container = $('#moduleList');
  if (!container) return;
  container.innerHTML = appConfig.modules.map((module) => `
    <div class="dev-module-row">
      <div><b>${escapeHtml(module.name)}</b><small>${escapeHtml(module.type)} • ${module.installed ? 'registrado como instalado' : 'modelo não instalado'}</small></div>
      <span class="dev-status ${module.installed ? 'is-ready' : 'is-pending'}">${module.installed ? 'ATUAL' : 'MODELO'}</span>
    </div>`).join('');
  $('#moduleCount').textContent = `${appConfig.modules.length} REGISTROS`;
}

function saveLedMapConfig() {
  state.ledMap = normalizeLedMap(state.ledMap);
  saveState();
  return true;
}

function renderLedLightingMarkers() {
  const leds = normalizeLedMap(state.ledMap);
  const container = $('#lightingLedMarkers');
  if (container) {
    container.innerHTML = leds.map((led) => {
      const opacity = state.powered ? (led.opacity / 100) * (state.brightness / 100) : 0.035;
      return `
        <button class="led-zone-marker led-zone-marker-${led.type} ${state.powered ? 'is-powered' : 'is-muted'}" type="button" data-select-led="${led.index}" title="LED ${led.index} • ${escapeHtml(led.name)}" aria-label="Editar LED ${led.index}: ${escapeHtml(led.name)}" style="left:${led.x}%;top:${led.y}%;--led-color:${led.color};--led-opacity:${opacity};--led-length:${led.length}%;--led-thickness:${led.thickness}px"><span>${led.index}</span></button>
      `;
    }).join('');
  }
  const liveLayer = $('#ambientCabinLedMarkers');
  if (liveLayer) {
    liveLayer.dataset.effect = state.effect;
    liveLayer.dataset.powered = state.powered ? 'true' : 'false';
    liveLayer.innerHTML = leds.map((led) => {
      const opacity = state.powered ? (led.opacity / 100) * (state.brightness / 100) : 0.035;
      return `
        <button class="ambient-live-led ambient-live-led-${led.type} ${state.powered ? 'is-powered' : 'is-muted'}" type="button" data-select-led="${led.index}" title="${escapeHtml(led.name)} • ${led.color.toUpperCase()}" aria-label="${escapeHtml(led.name)}" style="left:${led.x}%;top:${led.y}%;--led-color:${led.color};--led-opacity:${opacity};--led-length:${led.length}%;--led-thickness:${led.thickness}px"><span class="sr-only">LED ${led.index}: ${escapeHtml(led.name)}</span></button>
      `;
    }).join('');
  }
  updateSceneCabinImages();
}

function getActiveMoodId() {
  return CABIN_SCENE_IMAGES[state.sceneId] ? state.sceneId : (MOODS.find((mood) => mood.name === state.profile)?.id || 'moonlight');
}

function updateSceneCabinImages() {
  const image = CABIN_SCENE_IMAGES[getActiveMoodId()] || cabinImageUrl;
  const cabinPanel = $('#ambientCabinPanel');
  const zonePhoto = $('#ambientZonePhoto');
  const editorPhoto = $('#ledMapPhoto');
  if (cabinPanel) {
    cabinPanel.style.setProperty('--cabin-scene-image', `url("${image}")`);
    cabinPanel.style.backgroundImage = `url("${image}")`;
  }
  if (zonePhoto && zonePhoto.getAttribute('src') !== image) zonePhoto.src = image;
  if (editorPhoto && editorPhoto.getAttribute('src') !== image) editorPhoto.src = image;
  const mood = MOODS.find((item) => item.id === getActiveMoodId());
  if (cabinPanel) {
    cabinPanel.dataset.effect = state.effect;
    cabinPanel.dataset.powered = state.powered ? 'true' : 'false';
    cabinPanel.dataset.scene = getActiveMoodId();
  }
  if (zonePhoto?.parentElement) {
    zonePhoto.parentElement.dataset.effect = state.effect;
    zonePhoto.parentElement.dataset.powered = state.powered ? 'true' : 'false';
    zonePhoto.parentElement.dataset.scene = getActiveMoodId();
  }
  if (editorPhoto?.parentElement) {
    editorPhoto.parentElement.dataset.effect = state.effect;
    editorPhoto.parentElement.dataset.powered = state.powered ? 'true' : 'false';
    editorPhoto.parentElement.dataset.scene = getActiveMoodId();
  }
  if (cabinPanel && mood) cabinPanel.style.setProperty('--scene-accent', mood.color);
}

function renderLightingVisuals() {
  updateSceneCabinImages();
  // Espelha a escala temporal do efeito BREATHE do firmware (6,5 s até 1 s).
  const animationMs = Math.round(6500 - ((Math.max(1, Math.min(100, state.speed)) - 1) * (5500 / 99)));
  document.documentElement.style.setProperty('--led-animation-duration', `${animationMs}ms`);
  const layers = ['#ambientCabinLedMarkers', '#lightingLedMarkers'];
  for (const selector of layers) {
    const layer = $(selector);
    if (!layer) continue;
    layer.dataset.effect = state.effect;
    layer.dataset.powered = state.powered ? 'true' : 'false';
  }
  const cabinPanel = $('#ambientCabinPanel');
  if (cabinPanel) {
    cabinPanel.classList.toggle('lighting-off', !state.powered);
    cabinPanel.dataset.effect = state.effect;
  }
  const zonePreview = $('.led-zone-preview');
  if (zonePreview) {
    zonePreview.classList.toggle('lighting-off', !state.powered);
    zonePreview.dataset.effect = state.effect;
  }
  const mapStage = $('#ledMapStage');
  if (mapStage) {
    mapStage.classList.toggle('lighting-off', !state.powered);
    mapStage.dataset.effect = state.effect;
  }
}

function syncZoneControlsFromMap(zone) {
  const first = state.ledMap.find((item) => item.zone === zone);
  if (!first) return;
  state.zones = { ...state.zones, [zone]: first.color };
  const input = zone === 'front' ? $('#frontZoneColor') : $('#rearZoneColor');
  const hex = zone === 'front' ? $('#frontZoneHex') : $('#rearZoneHex');
  const swatch = zone === 'front' ? $('#frontZoneSwatch') : $('#rearZoneSwatch');
  if (input) input.value = first.color;
  if (hex) hex.textContent = first.color.toUpperCase();
  if (swatch) swatch.style.background = first.color;
  document.documentElement.style.setProperty(zone === 'front' ? '--front-zone' : '--rear-zone', first.color);
}

function renderLedMapping() {
  const leds = normalizeLedMap(state.ledMap);
  const markers = $('#ledMapMarkers');
  const list = $('#ledMapList');
  const editor = $('#ledMapEditor');
  const tester = $('#ledTesterList');
  if (!markers || !list || !editor || !tester) return;
  const selected = leds.find((item) => item.index === selectedLedIndex) || leds[0];
  selectedLedIndex = selected.index;
  updateSceneCabinImages();

  markers.innerHTML = leds.map((led) => {
    const opacity = state.powered ? (led.opacity / 100) * (state.brightness / 100) : 0.035;
    return `
      <button class="led-map-marker led-map-marker-${led.type} ${led.index === selectedLedIndex ? 'selected' : ''} ${state.powered ? 'is-powered' : 'is-muted'}" type="button" data-map-marker="${led.index}" aria-label="Selecionar LED ${led.index}" title="LED ${led.index} • ${escapeHtml(led.name)}" style="left:${led.x}%;top:${led.y}%;--led-color:${led.color};--led-opacity:${opacity};--led-length:${led.length}%;--led-thickness:${led.thickness}px"><span>${led.index}</span></button>
    `;
  }).join('');

  list.innerHTML = leds.map((led) => `
    <div class="led-map-list-row ${led.index === selectedLedIndex ? 'selected' : ''}">
      <button class="led-map-select" type="button" data-select-led="${led.index}"><i style="--led-color:${led.color}"></i><span><b>LED ${led.index}</b><small>${escapeHtml(led.name)} • ${led.zone === 'front' ? 'Dianteira' : led.zone === 'rear' ? 'Traseira' : 'Porta-malas'}</small></span></button>
      <button class="led-map-test-small" type="button" data-test-led="${led.index}" title="Piscar LED ${led.index}" ${state.firmwareFeatures.includes('LED_TEST') && state.connected ? '' : 'disabled'}>TESTAR</button>
    </div>
  `).join('');

  editor.innerHTML = `
    <div class="led-editor-head"><div><span class="eyebrow">PROPRIEDADES DO PONTO</span><b>LED ${selected.index}</b></div><span class="led-editor-zone">${selected.zone === 'front' ? 'DIANTEIRA' : selected.zone === 'rear' ? 'TRASEIRA' : 'PORTA-MALAS'}</span></div>
    <label class="led-field"><span>Nome do ponto</span><input class="text-field" maxlength="32" data-led-field="name" value="${escapeHtml(selected.name)}" /></label>
    <div class="led-field-grid">
      <label class="led-field"><span>Área do veículo</span><select class="text-field" data-led-field="zone"><option value="front" ${selected.zone === 'front' ? 'selected' : ''}>Dianteira</option><option value="rear" ${selected.zone === 'rear' ? 'selected' : ''}>Traseira</option><option value="trunk" ${selected.zone === 'trunk' ? 'selected' : ''}>Porta-malas</option></select></label>
      <label class="led-field"><span>Tipo de iluminação</span><select class="text-field" data-led-field="type"><option value="strip" ${selected.type === 'strip' ? 'selected' : ''}>Fita LED</option><option value="spot" ${selected.type === 'spot' ? 'selected' : ''}>Ponto de luz</option><option value="area" ${selected.type === 'area' ? 'selected' : ''}>Área iluminada</option></select></label>
    </div>
    <label class="led-field"><span>Cor individual <b id="ledSelectedHex">${selected.color.toUpperCase()}</b></span><input class="led-color-input" type="color" data-led-field="color" value="${selected.color}" /></label>
    <div class="led-field-range"><label for="ledX">Posição horizontal</label><strong>${selected.x}%</strong><input id="ledX" type="range" min="3" max="97" value="${selected.x}" data-led-field="x" /></div>
    <div class="led-field-range"><label for="ledY">Posição vertical</label><strong>${selected.y}%</strong><input id="ledY" type="range" min="4" max="96" value="${selected.y}" data-led-field="y" /></div>
    <div class="led-field-range"><label for="ledLength">Comprimento do facho</label><strong>${selected.length}%</strong><input id="ledLength" type="range" min="6" max="70" value="${selected.length}" data-led-field="length" /></div>
    <div class="led-field-range"><label for="ledThickness">Espessura</label><strong>${selected.thickness}px</strong><input id="ledThickness" type="range" min="2" max="24" value="${selected.thickness}" data-led-field="thickness" /></div>
    <div class="led-field-range"><label for="ledOpacity">Transparência / intensidade visual</label><strong>${selected.opacity}%</strong><input id="ledOpacity" type="range" min="10" max="100" value="${selected.opacity}" data-led-field="opacity" /></div>
    <p class="led-editor-note">Arraste o ponto numerado na imagem ou use os controles de posição. O mapeamento descreve os pixels físicos da cadeia WS2812B, não os pinos GPIO.</p>
  `;

  tester.innerHTML = leds.map((led) => `
    <button class="led-test-card ${led.index === selectedLedIndex ? 'selected' : ''}" type="button" data-select-led="${led.index}">
      <span class="led-test-index">LED ${led.index}</span><b>${escapeHtml(led.name)}</b><small>${led.zone === 'front' ? 'Dianteira' : led.zone === 'rear' ? 'Traseira' : 'Porta-malas'}</small>
      <span class="led-test-action" data-test-led="${led.index}" role="button" aria-label="Testar LED ${led.index}" tabindex="0">PISCAR</span>
    </button>
  `).join('');
  updateLedFirmwareStatus();
  attachLedMarkerDragging();
  renderLightingVisuals();
}

function attachLedMarkerDragging() {
  const stage = $('#ledMapStage');
  if (!stage) return;
  stage.querySelectorAll('[data-map-marker]').forEach((marker) => {
    marker.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      selectedLedIndex = Number(marker.dataset.mapMarker);
      marker.classList.add('dragging');
      marker.setPointerCapture?.(event.pointerId);
      const move = (moveEvent) => {
        const rect = stage.getBoundingClientRect();
        const x = Math.max(3, Math.min(97, Math.round(((moveEvent.clientX - rect.left) / rect.width) * 100)));
        const y = Math.max(4, Math.min(96, Math.round(((moveEvent.clientY - rect.top) / rect.height) * 100)));
        const led = state.ledMap.find((item) => item.index === selectedLedIndex);
        if (!led) return;
        led.x = x; led.y = y;
        marker.style.left = `${x}%`; marker.style.top = `${y}%`;
        const inputX = $('#ledX'); const inputY = $('#ledY');
        if (inputX) inputX.value = String(x);
        if (inputY) inputY.value = String(y);
        const rangeLabels = editorRangeLabels();
        if (rangeLabels.x) rangeLabels.x.textContent = `${x}%`;
        if (rangeLabels.y) rangeLabels.y.textContent = `${y}%`;
      };
      const finish = () => {
        marker.classList.remove('dragging');
        marker.removeEventListener('pointermove', move);
        marker.removeEventListener('pointerup', finish);
        marker.removeEventListener('pointercancel', finish);
        saveLedMapConfig();
        renderLedLightingMarkers();
        renderLedMapping();
      };
      marker.addEventListener('pointermove', move);
      marker.addEventListener('pointerup', finish, { once: true });
      marker.addEventListener('pointercancel', finish, { once: true });
    });
    marker.addEventListener('click', () => { selectedLedIndex = Number(marker.dataset.mapMarker); renderLedMapping(); });
  });
}

function editorRangeLabels() {
  const get = (id) => $(id)?.parentElement?.querySelector('strong');
  return { x: get('#ledX'), y: get('#ledY') };
}

function handleLedMapField(event) {
  const field = event.target.dataset.ledField;
  if (!field) return;
  const led = state.ledMap.find((item) => item.index === selectedLedIndex);
  if (!led) return;
  const previousZone = led.zone;
  if (field === 'name' || field === 'zone' || field === 'type' || field === 'color') led[field] = event.target.value;
  else led[field] = Number(event.target.value);
  state.ledMap = normalizeLedMap(state.ledMap);
  if (field === 'color') {
    state.zones.linked = false;
    if (led.zone === 'front' || led.zone === 'rear') syncZoneControlsFromMap(led.zone);
  }
  if (field === 'zone') {
    if (previousZone === 'front' || previousZone === 'rear') syncZoneControlsFromMap(previousZone);
    if (led.zone === 'front' || led.zone === 'rear') syncZoneControlsFromMap(led.zone);
  }
  saveLedMapConfig();
  renderLedLightingMarkers();
  renderLightingVisuals();
  const mapMarker = $(`#ledMapMarkers [data-map-marker="${selectedLedIndex}"]`);
  if (mapMarker) {
    mapMarker.style.left = `${led.x}%`; mapMarker.style.top = `${led.y}%`;
    mapMarker.style.setProperty('--led-color', led.color);
    mapMarker.style.setProperty('--led-opacity', String(led.opacity / 100));
    mapMarker.style.setProperty('--led-length', `${led.length}%`);
    mapMarker.style.setProperty('--led-thickness', `${led.thickness}px`);
    mapMarker.classList.toggle('led-map-marker-strip', led.type === 'strip');
    mapMarker.classList.toggle('led-map-marker-spot', led.type === 'spot');
    mapMarker.classList.toggle('led-map-marker-area', led.type === 'area');
  }
  // Atualiza somente a seleção/indicadores, para não roubar o foco do controle.
  const colorHex = $('#ledSelectedHex');
  if (colorHex) colorHex.textContent = led.color.toUpperCase();
  const value = event.target.parentElement?.querySelector('strong');
  if (value && ['x', 'y', 'length', 'thickness', 'opacity'].includes(field)) value.textContent = `${led[field]}${field === 'thickness' ? 'px' : '%'}`;
  if (field === 'color' && state.firmwareFeatures.includes('LED_COLOR')) sendCommand(makeLedColorCommand(led.index, led.color));
  if (field === 'zone') renderLedMapping();
  renderLedLightingMarkers();
  renderLightingVisuals();
}

function updateLedFirmwareStatus() {
  const supportsTest = state.firmwareFeatures.includes('LED_TEST');
  const supportsColor = state.firmwareFeatures.includes('LED_COLOR');
  const badge = $('#ledFirmwareBadge');
  const note = $('#ledTesterStatus');
  const start = $('#startLedSequence');
  if (badge) {
    badge.textContent = supportsTest && supportsColor ? `FW ${state.firmwareVersion} • LEDS INDIVIDUAIS` : (state.connected ? 'FIRMWARE SEM MAPEAMENTO INDIVIDUAL' : 'CONTROLADOR NÃO IDENTIFICADO');
    badge.classList.toggle('is-ready', supportsTest && supportsColor);
  }
  if (start) start.disabled = !state.connected || !supportsTest;
  $$('#ledMapList [data-test-led], #ledTesterList [data-test-led]').forEach((button) => { button.disabled = !state.connected || !supportsTest; });
  if (note && !supportsTest) note.textContent = state.connected ? 'Controlador conectado, mas sem o recurso LED_TEST. Grave o firmware Voyage Core 0.5.1 para piscar cada pixel individualmente.' : 'Conecte o ESP32 e use o firmware Voyage Core 0.5.1 para testar cada pixel individualmente.';
  const stop = $('#stopLedTest');
  if (stop) stop.disabled = !ledTestSequenceAbort;
}

async function testSingleLed(index) {
  if (!state.connected) { toast('Conecte o ESP32 antes de testar um LED.'); return; }
  if (!state.firmwareFeatures.includes('LED_TEST')) { toast('O firmware atual não reconhece LED_TEST. Atualize para o firmware privado Voyage Core 0.5.1.'); return; }
  selectedLedIndex = index;
  renderLedMapping();
  await sendCommand(makeLedTestCommand(index));
  if ($('#ledTesterStatus')) $('#ledTesterStatus').textContent = `Piscando LED ${index}: ${state.ledMap[index - 1]?.name || 'sem nome'}.`;
}

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function startLedTestSequence() {
  if (!state.connected) { toast('Conecte o ESP32 antes de iniciar a sequência.'); return; }
  if (!state.firmwareFeatures.includes('LED_TEST')) { toast('A sequência individual requer o firmware Voyage Core 0.5.1.'); return; }
  ledTestSequenceAbort = true;
  updateLedFirmwareStatus();
  for (let index = 1; index <= state.ledMap.length; index++) {
    if (!ledTestSequenceAbort) break;
    selectedLedIndex = index;
    renderLedMapping();
    if ($('#ledTesterStatus')) $('#ledTesterStatus').textContent = `Identificando LED ${index} de ${state.ledMap.length}: ${state.ledMap[index - 1].name}.`;
    await sendCommand(makeLedTestCommand(index));
    await wait(2050);
  }
  if (ledTestSequenceAbort) toast('Sequência de identificação concluída. Edite os nomes conforme os pontos que piscaram.');
  ledTestSequenceAbort = false;
  updateLedFirmwareStatus();
}

async function stopLedTestSequence() {
  ledTestSequenceAbort = false;
  await sendCommand('LED_TEST=0');
  updateLedFirmwareStatus();
  if ($('#ledTesterStatus')) $('#ledTesterStatus').textContent = 'Teste interrompido.';
}

function renderRelayEditor() {
  const container = $('#relayEditor');
  if (!container) return;
  let relayModule = appConfig.modules.find((module) => module.id === 'relay-5-template');
  if (!relayModule) relayModule = createRelayModuleTemplate();
  container.innerHTML = relayModule.outputs.map((output, index) => `
    <div class="relay-editor-row">
      <span class="relay-number">${index + 1}</span>
      <input class="text-field" data-relay-name="${index}" value="${escapeHtml(output.name)}" maxlength="32" aria-label="Nome da saída ${index + 1}" />
      <select class="text-field" data-relay-behavior="${index}" aria-label="Comportamento da saída ${index + 1}">
        <option value="toggle" ${output.behavior === 'toggle' ? 'selected' : ''}>Ligar / desligar</option>
        <option value="momentary" ${output.behavior === 'momentary' ? 'selected' : ''}>Momentâneo</option>
        <option value="group" ${output.behavior === 'group' ? 'selected' : ''}>Agrupado</option>
      </select>
    </div>`).join('');
}

function renderAutomationList() {
  const container = $('#automationList');
  if (!container) return;
  if (!appConfig.automations.length) {
    container.innerHTML = '<p class="small-note">Nenhum rascunho criado.</p>';
    return;
  }
  container.innerHTML = appConfig.automations.map((rule) => `
    <div class="dev-list-row"><b>${escapeHtml(rule.name)}</b><small>${escapeHtml(rule.trigger)} → ${escapeHtml(rule.action)} • NÃO ENVIADA AO ESP32</small></div>`).join('');
}

function renderThemeList() {
  const container = $('#themeList');
  if (!container) return;
  container.innerHTML = THEMES.map((theme) => `
    <div class="dev-theme-row"><div><b>${escapeHtml(theme.name)}</b><small>${escapeHtml(theme.path)}</small></div><span class="dev-status ${theme.status === 'active' ? 'is-ready' : 'is-pending'}">${theme.status === 'active' ? 'ATIVO' : 'ESTRUTURA'}</span></div>`).join('');
}

async function renderAssetList() {
  const container = $('#assetList');
  if (!container) return;
  try {
    const assets = await listAssets();
    if (!assets.length) {
      container.innerHTML = '<p class="small-note">Nenhum arquivo salvo neste navegador.</p>';
      return;
    }
    container.innerHTML = assets.map((asset) => `
      <div class="dev-list-row"><div><b>${escapeHtml(asset.name)}</b><small>${(asset.size / 1024 / 1024).toFixed(2)} MB • ${escapeHtml(asset.type)}</small></div><button class="asset-delete" data-delete-asset="${escapeHtml(asset.id)}">REMOVER</button></div>`).join('');
    $$('[data-delete-asset]').forEach((button) => button.addEventListener('click', async () => {
      try { await deleteAsset(button.dataset.deleteAsset); toast('Arquivo removido da biblioteca local.'); renderAssetList(); }
      catch (error) { toast(`Não foi possível remover: ${error.message}`); }
    }));
  } catch (error) {
    container.innerHTML = `<p class="small-note">Biblioteca local indisponível: ${escapeHtml(error.message)}</p>`;
  }
}

async function handleAssetUpload(event) {
  const files = [...(event.target.files || [])];
  if (!files.length) return;
  for (const file of files) {
    try {
      const category = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : /\.(glb|gltf)$/i.test(file.name) ? '3d-model' : 'other';
      await saveAsset(file, category);
    } catch (error) {
      toast(`Não foi possível salvar ${file.name}: ${error.message}`);
    }
  }
  event.target.value = '';
  await renderAssetList();
  toast('Biblioteca local atualizada.');
}

function saveRelayConfig() {
  const existing = appConfig.modules.find((module) => module.id === 'relay-5-template') || createRelayModuleTemplate();
  const outputs = existing.outputs.map((output, index) => normalizeOutput({
    ...output,
    name: $(`[data-relay-name="${index}"]`)?.value,
    behavior: $(`[data-relay-behavior="${index}"]`)?.value,
  }, index));
  const modules = appConfig.modules.filter((module) => module.id !== 'relay-5-template');
  modules.push({ ...existing, outputs, installed: false, state: 'template-only', draft: true });
  const result = saveConfig({ ...appConfig, modules });
  appConfig = result.config;
  if (result.ok) toast('Modelo de cinco relés salvo neste navegador. Ainda não foi enviado ao ESP32.');
  renderModuleList();
}

function addAutomationDraft() {
  try {
    const rule = createAutomationDraft({ name: 'Quando a porta abrir, acender a iluminação', trigger: 'door_open', action: 'ambient_on' });
    const result = saveConfig({ ...appConfig, automations: [...appConfig.automations, rule] });
    appConfig = result.config;
    renderAutomationList();
    toast('Rascunho salvo localmente. O firmware atual ainda não executa automações.');
  } catch (error) { toast(error.message); }
}

async function importBackupFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const validation = validateBackup(parsed);
    if (!validation.ok) throw new Error(validation.message);
    const result = saveConfig(validation.config);
    if (!result.ok) throw new Error(result.error || 'Falha ao gravar configurações.');
    appConfig = result.config;
    const wasConnected = state.connected;
    Object.assign(state, loadSavedState(), { connected: wasConnected });
    render();
    refreshDeveloperView();
    toast('Backup importado.');
  } catch (error) { toast(`Não foi possível importar: ${error.message}`); }
  event.target.value = '';
}

function exportSupportPackage() {
  listAssets().then((assets) => exportDeveloperPackage({
    config: appConfig,
    assets,
    connectionState: state.connected ? 'connected' : 'disconnected',
  })).catch(() => exportDeveloperPackage({
    config: appConfig,
    assets: [],
    connectionState: state.connected ? 'connected' : 'disconnected',
  }));
}

function renderPalette() {
  $('#colorPalette').innerHTML = PALETTE.map((item) => `
    <button class="color-choice" data-color="${item.color}" data-name="${item.name}" style="--swatch:${item.color}" title="${item.name}" aria-label="${item.name}"><span></span><small>${item.name}</small></button>
  `).join('');
  $$('.color-choice').forEach((button) => button.addEventListener('click', () => setColor(button.dataset.color, button.dataset.name.toUpperCase())));
}

function renderMoodCards() {
  $('#moodCards').innerHTML = MOODS.map((mood) => `
    <button class="mood-card mood-card-premium mood-scene-${mood.id}" data-mood="${mood.id}" style="--mood:${mood.color}"><span class="mood-card-glow"></span><span class="eyebrow">VOYAGE AMBIENT SCENE</span><b>${mood.name}</b><small>${mood.subtitle}</small><em>APLICAR AMBIENTE ↗</em></button>
  `).join('');
  $('#moodCards').querySelectorAll('[data-mood]').forEach((button) => button.addEventListener('click', () => applyMood(button.dataset.mood)));
}

$$('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
$$('[data-light-tab]').forEach((button) => button.addEventListener('click', () => setLightingTab(button.dataset.lightTab)));
setLightingTab('ambiente');
$$('[data-go]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.go)));
$('#lightingPower').addEventListener('click', () => setPower(!state.powered));
$('#brightness').addEventListener('input', (event) => { state.brightness = Number(event.target.value); saveState(); render(); sendCommand(`BRIGHTNESS=${state.brightness}`); });
$('#speed').addEventListener('input', (event) => { state.speed = Number(event.target.value); saveState(); render(); sendCommand(`SPEED=${state.speed}`); });
$('#colorPicker').addEventListener('input', (event) => setColor(event.target.value));
$('#frontZoneColor').addEventListener('input', (event) => setZoneColor('front', event.target.value));
$('#rearZoneColor').addEventListener('input', (event) => setZoneColor('rear', event.target.value));
$('#syncZoneColors').addEventListener('click', () => { state.zones = { ...state.zones, front: state.color, rear: state.color, linked: true }; state.ledMap = normalizeLedMap(state.ledMap).map((item) => ({ ...item, color: state.color })); saveState(); render(); if (state.firmwareFeatures.includes('LED_COLOR')) state.ledMap.forEach((item) => sendCommand(makeLedColorCommand(item.index, item.color))); toast('Cores sincronizadas no mapa dos LEDs.'); });
$$('.effect-button').forEach((button) => button.addEventListener('click', () => { state.effect = button.dataset.effect; saveState(); render(); sendCommand(`EFFECT=${state.effect}`); }));
$$('[data-mood]').forEach((button) => button.addEventListener('click', () => applyMood(button.dataset.mood)));
$('#connectButton').addEventListener('click', connectBluetooth);
$('#disconnectButton').addEventListener('click', disconnectBluetooth);
$('#saveCameraPackage').addEventListener('click', saveCameraPackage);
$('#launchCamera').addEventListener('click', launchCameraApp);

$('#exportSupport').addEventListener('click', exportSupportPackage);
$('#saveLedMap').addEventListener('click', () => { saveLedMapConfig(); renderLedLightingMarkers(); toast('Mapeamento dos LEDs salvo.'); });
$('#lightingLedMarkers').addEventListener('click', (event) => { const marker = event.target.closest('[data-select-led]'); if (marker) { selectedLedIndex = Number(marker.dataset.selectLed); setView('developer'); renderLedMapping(); } });
$('#ambientCabinLedMarkers').addEventListener('click', (event) => { const marker = event.target.closest('[data-select-led]'); if (marker) { selectedLedIndex = Number(marker.dataset.selectLed); setView('developer'); renderLedMapping(); } });
$('#startLedSequence').addEventListener('click', startLedTestSequence);
$('#stopLedTest').addEventListener('click', stopLedTestSequence);
$('#ledMapList').addEventListener('click', (event) => { const button = event.target.closest('[data-select-led]'); if (button) { selectedLedIndex = Number(button.dataset.selectLed); renderLedMapping(); } });
$('#ledMapEditor').addEventListener('input', handleLedMapField);
$('#ledMapEditor').addEventListener('change', handleLedMapField);
$('#ledMapList').addEventListener('click', async (event) => { const testButton = event.target.closest('[data-test-led]'); if (testButton) await testSingleLed(Number(testButton.dataset.testLed)); });
$('#ledTesterList').addEventListener('click', async (event) => { const testButton = event.target.closest('[data-test-led]'); if (testButton) await testSingleLed(Number(testButton.dataset.testLed)); });

$('#exportBackup').addEventListener('click', () => exportConfiguration(appConfig));
$('#importBackupFile').addEventListener('change', importBackupFile);
$('#assetUpload').addEventListener('change', handleAssetUpload);
$('#saveRelayConfig').addEventListener('click', saveRelayConfig);
$('#addAutomation').addEventListener('click', addAutomationDraft);

function updateClock() {
  const now = new Date();
  $('#clock').textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(now);
  $('#dateLabel').textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' }).format(now).replace('.', '').toUpperCase();
  if ($('#heroGreetingTime')) $('#heroGreetingTime').textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(now);
}

// A saudação aparece por três segundos e some para liberar a imagem do veículo.
function startWelcomeSequence() {
  const greeting = $('#homeGreetingTitle');
  if (!greeting) return;
  greeting.classList.add('is-visible');
  window.setTimeout(() => {
    const current = $('#homeGreetingTitle');
    if (current) {
      current.classList.remove('is-visible');
      current.setAttribute('aria-hidden', 'true');
    }
  }, 3000);
}


initVisualEditor({
  getConfig: () => appConfig,
  onConfigChange: (nextConfig) => { appConfig = nextConfig; },
  toast,
  setView,
});

renderPalette();
renderMoodCards();
renderLedLightingMarkers();
render();
$('.main-content')?.classList.add('home-active');
render();
updateClock();
startWelcomeSequence();
setInterval(updateClock, 15000);
