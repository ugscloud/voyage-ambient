#include <Arduino.h>
#include <Adafruit_NeoPixel.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Mesma configuracao do projeto atual: cinco WS2812B em sequencia no GPIO 12.
#define LED_PIN 12
#define NUM_LEDS 5

// Estes UUIDs precisam permanecer iguais aos definidos em src/main.js.
#define SERVICE_UUID        "7b9e0001-7a3d-4f5b-9c2a-6e1d0a5b0001"
#define CHARACTERISTIC_UUID "7b9e0002-7a3d-4f5b-9c2a-6e1d0a5b0001"

Adafruit_NeoPixel pixels(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
BLECharacteristic *commandCharacteristic = nullptr;

bool deviceConnected = false;
bool powerOn = true;
uint8_t redValue = 20;
uint8_t greenValue = 105;
uint8_t blueValue = 210;
uint8_t brightnessValue = 100;
uint8_t speedValue = 45;
String effectName = "SOLID";
uint16_t rainbowHue = 0;
uint32_t lastEffectUpdate = 0;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *server) override {
    deviceConnected = true;
    if (commandCharacteristic) {
      commandCharacteristic->setValue("CONNECTED");
      commandCharacteristic->notify();
    }
  }

  void onDisconnect(BLEServer *server) override {
    deviceConnected = false;
    BLEDevice::startAdvertising();
  }
};

void sendStatus(const String &message) {
  if (deviceConnected && commandCharacteristic) {
    commandCharacteristic->setValue(message.c_str());
    commandCharacteristic->notify();
  }
}

void processCommand(String command) {
  command.trim();
  command.toUpperCase();

  if (command.startsWith("POWER=")) {
    powerOn = command.substring(6).toInt() == 1;
    sendStatus(powerOn ? "LIGHTS_ON" : "LIGHTS_OFF");
  }
  else if (command.startsWith("COLOR=")) {
    int firstComma = command.indexOf(',', 6);
    int secondComma = command.indexOf(',', firstComma + 1);
    if (firstComma > 0 && secondComma > firstComma) {
      redValue = (uint8_t)constrain(command.substring(6, firstComma).toInt(), 0, 255);
      greenValue = (uint8_t)constrain(command.substring(firstComma + 1, secondComma).toInt(), 0, 255);
      blueValue = (uint8_t)constrain(command.substring(secondComma + 1).toInt(), 0, 255);
      sendStatus("COLOR_OK");
    }
  }
  else if (command.startsWith("BRIGHTNESS=")) {
    brightnessValue = (uint8_t)constrain(command.substring(11).toInt(), 0, 100);
    sendStatus("BRIGHTNESS_OK");
  }
  else if (command.startsWith("EFFECT=")) {
    String requested = command.substring(7);
    if (requested == "SOLID" || requested == "BREATHE" || requested == "RAINBOW") {
      effectName = requested;
      sendStatus("EFFECT_OK");
    }
  }
  else if (command.startsWith("SPEED=")) {
    speedValue = (uint8_t)constrain(command.substring(6).toInt(), 1, 100);
    sendStatus("SPEED_OK");
  }
  else if (command == "PING") {
    sendStatus("PONG");
  }
}

class CharacteristicCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    std::string incoming = characteristic->getValue();
    if (!incoming.empty()) {
      processCommand(String(incoming.c_str()));
    }
  }
};

uint8_t scaled(uint8_t component, float factor) {
  return (uint8_t)constrain((int)(component * factor), 0, 255);
}

void renderLeds() {
  if (!powerOn || brightnessValue == 0) {
    pixels.clear();
    pixels.show();
    return;
  }

  uint32_t now = millis();
  float brightness = brightnessValue / 100.0f;
  uint8_t interval = map(speedValue, 1, 100, 130, 12);

  if (effectName == "SOLID") {
    for (int i = 0; i < NUM_LEDS; i++) {
      pixels.setPixelColor(i, pixels.Color(
        scaled(redValue, brightness),
        scaled(greenValue, brightness),
        scaled(blueValue, brightness)
      ));
    }
    pixels.show();
    return;
  }

  if (now - lastEffectUpdate < interval) return;
  lastEffectUpdate = now;

  if (effectName == "BREATHE") {
    float period = map(speedValue, 1, 100, 6500, 1000);
    float phase = (now % (uint32_t)period) / period;
    float wave = (sin(phase * 2.0f * PI - PI / 2.0f) + 1.0f) / 2.0f;
    float factor = brightness * (0.08f + 0.92f * wave);
    for (int i = 0; i < NUM_LEDS; i++) {
      pixels.setPixelColor(i, pixels.Color(
        scaled(redValue, factor),
        scaled(greenValue, factor),
        scaled(blueValue, factor)
      ));
    }
    pixels.show();
  }
  else if (effectName == "RAINBOW") {
    for (int i = 0; i < NUM_LEDS; i++) {
      uint16_t hue = rainbowHue + (uint32_t)i * 65536UL / NUM_LEDS;
      pixels.setPixelColor(i, pixels.gamma32(pixels.ColorHSV(hue, 255, (uint8_t)(brightness * 255))));
    }
    pixels.show();
    rainbowHue += map(speedValue, 1, 100, 80, 900);
  }
}

void setup() {
  Serial.begin(115200);
  pixels.begin();
  pixels.setBrightness(255);
  pixels.clear();
  pixels.show();

  BLEDevice::init("Voyage Ambient");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(SERVICE_UUID);
  commandCharacteristic = service->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_WRITE_NR |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  commandCharacteristic->setCallbacks(new CharacteristicCallbacks());
  commandCharacteristic->addDescriptor(new BLE2902());
  commandCharacteristic->setValue("READY");
  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("Voyage Ambient pronto. Aguardando conexao BLE...");
}

void loop() {
  renderLeds();
  delay(2);
}
