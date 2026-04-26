/*
  SmartBin Arduino Sketch
  ========================
  Hardware: Arduino Uno/Nano + HC-SR04 Ultrasonic Sensor + ESP8266 Wi-Fi Module
  
  Wiring:
    HC-SR04 TRIG → Pin 9
    HC-SR04 ECHO → Pin 10
    ESP8266 TX   → Arduino RX (Pin 0) [use SoftwareSerial if needed]
    ESP8266 RX   → Arduino TX (Pin 1)
*/

#include <SoftwareSerial.h>

// ── Config ──────────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASS     = "YOUR_WIFI_PASSWORD";
const char* SERVER_HOST   = "192.168.1.100";   // Your PC's local IP running XAMPP
const int   SERVER_PORT   = 8080;
const char* API_PATH      = "/smartbin/backend/api/arduino/data";
const char* DEVICE_ID     = "BIN-001";          // Must match the device_id in DB

// ── Pin definitions ──────────────────────────────────────────────────────────
const int TRIG_PIN  = 9;
const int ECHO_PIN  = 10;
const int LED_GREEN = 4;   // Optional status LEDs
const int LED_YELLOW= 5;
const int LED_RED   = 6;

SoftwareSerial esp8266(2, 3); // RX, TX for ESP8266

// ── Helpers ──────────────────────────────────────────────────────────────────
float measureDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  return (duration == 0) ? -1 : duration * 0.034 / 2.0;
}

bool sendATCommand(const String& cmd, const String& expected, unsigned long timeout = 3000) {
  esp8266.println(cmd);
  unsigned long start = millis();
  String response = "";
  while (millis() - start < timeout) {
    if (esp8266.available()) response += (char)esp8266.read();
    if (response.indexOf(expected) != -1) return true;
  }
  Serial.println("AT ERR: " + response);
  return false;
}

void setupWifi() {
  esp8266.begin(115200);
  delay(1000);
  sendATCommand("AT+RST", "ready", 5000);
  sendATCommand("AT+CWMODE=1", "OK");
  sendATCommand(String("AT+CWJAP=\"") + WIFI_SSID + "\",\"" + WIFI_PASS + "\"", "WIFI GOT IP", 15000);
  Serial.println("WiFi connected.");
}

void postData(float distance) {
  String body = "{\"bin_id\":\"" + String(DEVICE_ID) + "\",\"distance\":" + String(distance, 2) + "}";
  int bodyLen = body.length();

  String httpReq =
    String("POST ") + API_PATH + " HTTP/1.1\r\n" +
    "Host: " + SERVER_HOST + "\r\n" +
    "Content-Type: application/json\r\n" +
    "Content-Length: " + bodyLen + "\r\n" +
    "Connection: close\r\n\r\n" +
    body;

  if (!sendATCommand(
        String("AT+CIPSTART=\"TCP\",\"") + SERVER_HOST + "\"," + SERVER_PORT,
        "CONNECT", 5000)) {
    Serial.println("TCP connect failed");
    return;
  }
  if (!sendATCommand(
        String("AT+CIPSEND=") + httpReq.length(), ">", 3000)) {
    Serial.println("CIPSEND failed");
    return;
  }
  esp8266.print(httpReq);
  delay(2000);
  Serial.println("Data sent: " + body);
}

// ── Setup & Loop ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_GREEN,  OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED,    OUTPUT);
  setupWifi();
}

void loop() {
  float dist = measureDistance();

  if (dist < 0) {
    Serial.println("Sensor error");
    delay(5000);
    return;
  }

  Serial.print("Distance: ");
  Serial.print(dist);
  Serial.println(" cm");

  // Visual indicator (adjust thresholds for your bin height)
  digitalWrite(LED_GREEN,  dist > 20);   // >66% of 30cm
  digitalWrite(LED_YELLOW, dist > 10 && dist <= 20);
  digitalWrite(LED_RED,    dist <= 10);

  postData(dist);
  delay(10000); // Send every 10 seconds
}
