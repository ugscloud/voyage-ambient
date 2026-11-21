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
  { id: 'flora', name: 'FLORA', subtitle: 'Verde natural', color: '#28C76F', brightness: 78, effect: 'BREATHE' },
  { id: 'sport', name: 'SPORT', subtitle: 'Vermelho intenso', color: '#FF0000', brightness: 90, effect: 'SOLID' },
  { id: 'calm', name: 'CALM', subtitle: 'Âmbar acolhedor', color: '#FFB347', brightness: 62, effect: 'BREATHE' },
  { id: 'moonlight', name: 'MOONLIGHT', subtitle: 'Azul noturno', color: '#91B4D8', brightness: 72, effect: 'SOLID' },
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
    cameraPackage: appConfig.camera.frontPackage || '',
  };
}

const state = loadSavedState();
let bleClient;
let toastTimer;

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
        <div class="page-title-row home-intro"><div><div class="eyebrow">VOYAGE AMBIENT</div><h1 id="homeGreetingTitle" aria-live="polite">Bem-vindo.</h1></div></div>
        <div class="home-dashboard" id="home-dashboard">
          <button class="dash-tile ambient-tile" data-go="lighting">
            <div class="tile-top"><div><span class="eyebrow">AMBIENT LIGHTING</span><h2>Iluminação ambiente</h2><p id="homeMood">MOONLIGHT • AZUL NOTURNO</p></div><span class="tile-arrow">↗</span></div>
            <div class="ambient-car-scene"><div class="car-glow" id="homeGlow"></div><svg viewBox="0 0 520 180" role="img" aria-label="Ilustração estilizada do veículo"><path class="car-window" d="M94 108 L128 54 Q141 34 174 29 L344 29 Q374 30 394 58 L431 109 Z"/><path class="car-body" d="M57 113 Q68 102 99 101 L125 71 Q141 49 175 47 L348 47 Q376 49 397 78 L430 103 Q454 107 463 119 L454 139 L67 139 Z"/><path class="car-roofline" d="M130 100 L162 59 Q172 51 190 51 L333 51 Q362 53 385 100"/><path class="car-light" d="M72 117 H447"/><circle class="car-wheel" cx="142" cy="136" r="19"/><circle class="car-wheel" cx="382" cy="136" r="19"/><path class="car-interior-line" d="M177 108 L190 79 L325 79 L346 108 M258 80 V111"/></svg><span class="car-caption">VOYAGE • CABIN LIGHTING</span></div>
            <div class="tile-bottom"><span><i class="live-dot"></i> <b id="homePowerText">SISTEMA LIGADO</b></span><span>INTENSIDADE <b id="homeBrightness">80%</b></span><span class="color-indicator" id="homeColorDot"></span></div>
          </button>
          <button class="dash-tile camera-tile" data-go="camera">
            <div class="tile-top"><div><span class="eyebrow">DRIVER ASSIST</span><h2>Câmera frontal</h2><p>Visualização dianteira do veículo</p></div><span class="tile-arrow">↗</span></div>
            <div class="camera-art"><div class="camera-frame"><div class="camera-lens"></div><span class="camera-crosshair">＋</span><div class="camera-gridline"></div></div><div class="camera-car-front"><span></span><i></i><b></b></div></div>
            <div class="tile-bottom"><span>APLICATIVO DA MULTIMÍDIA</span><span class="small-pill">ABRIR CÂMERA</span></div>
          </button>
          <button class="dash-tile vehicle-tile" data-go="vehicle">
            <div class="tile-top"><div><span class="eyebrow">VEHICLE INFORMATION</span><h2>Dados do veículo</h2><p>Informações e diagnóstico</p></div><span class="tile-arrow">↗</span></div>
            <div class="vehicle-data-visual"><div class="gauge"><span>—</span><small>RPM</small></div><div class="gauge"><span>—</span><small>KM/H</small></div><div class="gauge"><span>—</span><small>°C</small></div></div>
            <div class="tile-bottom"><span>OBD2</span><span class="small-pill muted-pill">EM PREPARAÇÃO</span></div>
          </button>
          <div class="shortcut-strip"><div class="shortcut-heading"><span class="eyebrow">ATALHOS</span><span>ACESSO RÁPIDO</span></div>
            <button data-go="lighting"><span class="shortcut-icon">✧</span><b>Iluminação</b><small>Cor e efeitos</small></button>
            <button data-go="camera"><span class="shortcut-icon">◉</span><b>Câmera</b><small>Visão frontal</small></button>
            <button data-go="apps"><span class="shortcut-icon">▦</span><b>Aplicativos</b><small>Todos os recursos</small></button>
            <button data-go="modes"><span class="shortcut-icon">◇</span><b>Estilos</b><small>Temas visuais</small></button>
          </div>
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
        <div class="page-title-row"><div><div class="eyebrow">VEHICLE SETTINGS • AMBIENT LIGHTING</div><h1>Iluminação ambiente</h1><p>Personalize a atmosfera dentro do seu Voyage.</p></div><div class="active-scene"><span class="scene-dot" id="sceneDot"></span><span><small>CENA ATUAL</small><b id="sceneName">MOONLIGHT</b></span></div></div>
        <div class="lighting-layout">
          <article class="pivi-panel palette-panel">
            <div class="panel-heading"><div><span class="eyebrow">PERSONALIZAÇÃO</span><h2>Escolha sua cor</h2></div><span class="count-label">30 TONS</span></div>
            <div class="mood-row">
              <button class="mood-button" data-mood="flora"><span class="mood-swatch" style="--mood:#28C76F"></span><b>FLORA</b><small>Natural</small></button>
              <button class="mood-button" data-mood="sport"><span class="mood-swatch" style="--mood:#FF0000"></span><b>SPORT</b><small>Dinâmico</small></button>
              <button class="mood-button" data-mood="calm"><span class="mood-swatch" style="--mood:#FFB347"></span><b>CALM</b><small>Conforto</small></button>
              <button class="mood-button" data-mood="moonlight"><span class="mood-swatch" style="--mood:#91B4D8"></span><b>MOONLIGHT</b><small>Noturno</small></button>
            </div>
            <div class="palette-divider"><span>PALETA DE CORES</span><span>TONS INSPIRADOS NA RANGE ROVER</span></div>
            <div class="color-palette" id="colorPalette"></div>
            <div class="custom-color-row"><label for="colorPicker">Cor personalizada</label><input id="colorPicker" type="color" value="#91B4D8" aria-label="Selecionar cor personalizada" /></div>
            <div class="selected-color-row"><span class="selected-color-chip" id="selectedColorChip"></span><span><small>COR SELECIONADA</small><b id="selectedColorName">Moonlight</b></span><strong id="selectedHex">#91B4D8</strong></div>
          </article>
          <div class="lighting-side-column">
            <article class="pivi-panel lighting-control-panel">
              <div class="panel-heading"><div><span class="eyebrow">CONTROLE GERAL</span><h2>Iluminação do habitáculo</h2></div><button class="power-control on" id="lightingPower" aria-label="Ligar ou desligar iluminação"><span>⏻</span></button></div>
              <div class="status-line"><span class="live-dot" id="lightingStatusDot"></span><span id="lightingState">ILUMINAÇÃO ATIVA</span><span class="status-right">5 LEDs • GPIO 12</span></div>
              <div class="control-block"><div class="range-heading"><label for="brightness">Intensidade</label><strong id="brightnessValue">80%</strong></div><input class="range" type="range" id="brightness" min="0" max="100" value="80"/><div class="range-ends"><span>Suave</span><span>Máxima</span></div></div>
              <div class="control-separator"></div>
              <div class="panel-heading effect-heading"><div><span class="eyebrow">ANIMAÇÃO</span><h2>Efeito de luz</h2></div></div>
              <div class="effect-grid">
                <button class="effect-button active" data-effect="SOLID"><span>●</span><b>Fixa</b><small>Cor constante</small></button>
                <button class="effect-button" data-effect="BREATHE"><span>≈</span><b>Respiração</b><small>Suave e gradual</small></button>
                <button class="effect-button" data-effect="RAINBOW"><span>◌</span><b>Espectro</b><small>Ciclo de cores</small></button>
              </div>
              <div class="control-block speed-block"><div class="range-heading"><label for="speed">Velocidade do efeito</label><strong id="speedValue">45%</strong></div><input class="range" type="range" id="speed" min="1" max="100" value="45"/><div class="range-ends"><span>Lenta</span><span>Rápida</span></div></div>
            </article>
            <article class="pivi-panel zones-panel">
              <div class="panel-heading"><div><span class="eyebrow">DISTRIBUIÇÃO</span><h2>Zonas do habitáculo</h2></div><span class="count-label">SINCRONIZADAS</span></div>
              <div class="cabin-zones"><div class="zone front-left"><span></span><small>MOTORISTA</small></div><div class="zone front-right"><span></span><small>PASSAGEIRO</small></div><div class="zone rear-left"><span></span><small>TRASEIRA E.</small></div><div class="zone rear-right"><span></span><small>TRASEIRA D.</small></div><div class="cabin-center"></div></div>
              <p class="small-note">No circuito atual, os cinco LEDs recebem a mesma cor e os mesmos efeitos. O controle independente de cada zona será liberado quando ampliarmos a instalação.</p>
            </article>
          </div>
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
    render();
    if (!connected) toast('ESP32 desconectado.');
  },
  onMessage: (message) => {
    if (message !== 'CONNECTED') toast(`ESP32: ${message}`);
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
      effect: state.effect, speed: state.speed, profile: state.profile,
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
  if ($('#homeMood')) $('#homeMood').textContent = `${state.profile} • ${colorName(color).toUpperCase()}`;
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
}

function setView(view) {
  $$('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${view}`));
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
}

function setColor(color, name = colorName(color)) {
  state.color = color.toLowerCase();
  state.profile = name.toUpperCase();
  saveState(); render();
  const [r, g, b] = hexToRgb(state.color);
  sendCommand(`COLOR=${r},${g},${b}`);
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
  state.brightness = mood.brightness;
  state.effect = mood.effect;
  saveState(); render(); sendCurrentState();
  toast(`Cena ${mood.name} aplicada.`);
}

async function connectBluetooth() {
  try {
    toast('Procurando o controlador Voyage Ambient…');
    await bleClient.connect();
    state.connected = true;
    render();
    await sendCurrentState();
    toast('ESP32 conectado. Controle de iluminação ativo.');
  } catch (error) {
    state.connected = false;
    render();
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
    <button class="mood-card" data-mood="${mood.id}" style="--mood:${mood.color}"><span class="mood-card-glow"></span><span class="eyebrow">AMBIENT PRESET</span><b>${mood.name}</b><small>${mood.subtitle}</small><em>APLICAR CENA ↗</em></button>
  `).join('');
}

$$('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
$$('[data-go]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.go)));
$('#lightingPower').addEventListener('click', () => setPower(!state.powered));
$('#brightness').addEventListener('input', (event) => { state.brightness = Number(event.target.value); saveState(); render(); sendCommand(`BRIGHTNESS=${state.brightness}`); });
$('#speed').addEventListener('input', (event) => { state.speed = Number(event.target.value); saveState(); render(); sendCommand(`SPEED=${state.speed}`); });
$('#colorPicker').addEventListener('input', (event) => setColor(event.target.value));
$$('.effect-button').forEach((button) => button.addEventListener('click', () => { state.effect = button.dataset.effect; saveState(); render(); sendCommand(`EFFECT=${state.effect}`); }));
$$('[data-mood]').forEach((button) => button.addEventListener('click', () => applyMood(button.dataset.mood)));
$('#connectButton').addEventListener('click', connectBluetooth);
$('#disconnectButton').addEventListener('click', disconnectBluetooth);
$('#saveCameraPackage').addEventListener('click', saveCameraPackage);
$('#launchCamera').addEventListener('click', launchCameraApp);

$('#exportSupport').addEventListener('click', exportSupportPackage);
$('#exportBackup').addEventListener('click', () => exportConfiguration(appConfig));
$('#importBackupFile').addEventListener('change', importBackupFile);
$('#assetUpload').addEventListener('change', handleAssetUpload);
$('#saveRelayConfig').addEventListener('click', saveRelayConfig);
$('#addAutomation').addEventListener('click', addAutomationDraft);

function updateClock() {
  const now = new Date();
  $('#clock').textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(now);
  $('#dateLabel').textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' }).format(now).replace('.', '').toUpperCase();
}

// Tela de entrada: saudação breve e, depois, mensagem permanente de viagem.
function startWelcomeSequence() {
  const greeting = $('#homeGreetingTitle');
  if (!greeting) return;
  greeting.textContent = 'Bem-vindo.';
  window.setTimeout(() => {
    const current = $('#homeGreetingTitle');
    if (current) current.textContent = 'Boa viagem.';
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
render();
updateClock();
startWelcomeSequence();
setInterval(updateClock, 15000);
