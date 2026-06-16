#include <Arduino.h>

// ---- Pins boutons (INPUT_PULLUP : LOW = appuye) ----
static const uint8_t PIN_FLIPPER_LEFT  = 16;  // boutton black left  -> PL / RL (hold)
static const uint8_t PIN_FLIPPER_RIGHT = 13;  // boutton black right -> PR / RR (hold)
static const uint8_t PIN_START         = 17;  // button front green  -> ST       (impulsion)
static const uint8_t PIN_LAUNCH        = 33;  // button front white  -> LA       (impulsion)

static const unsigned long DEBOUNCE_MS = 8;

enum ButtonMode {
  MODE_HOLD,   // envoie press + release (flippers)
  MODE_PULSE,  // envoie un seul code a l'appui (start, launch)
};

struct Button {
  uint8_t pin;
  ButtonMode mode;
  const char *pressCode;
  const char *releaseCode; // ignore si MODE_PULSE
  bool pressed;
  bool lastReading;
  unsigned long lastChangeMs;
};

Button buttons[] = {
  { PIN_FLIPPER_LEFT,  MODE_HOLD,  "PL", "RL", false, false, 0 },
  { PIN_FLIPPER_RIGHT, MODE_HOLD,  "PR", "RR", false, false, 0 },
  { PIN_START,         MODE_PULSE, "ST", "",   false, false, 0 },
  { PIN_LAUNCH,        MODE_PULSE, "LA", "",   false, false, 0 },
};

static const size_t BUTTON_COUNT = sizeof(buttons) / sizeof(buttons[0]);

void setup() {
  Serial.begin(115200);
  for (size_t i = 0; i < BUTTON_COUNT; i++) {
    pinMode(buttons[i].pin, INPUT_PULLUP);
  }
  Serial.println("READY");
}

void loop() {
  const unsigned long now = millis();

  for (size_t i = 0; i < BUTTON_COUNT; i++) {
    Button &b = buttons[i];

    const bool reading = (digitalRead(b.pin) == LOW);

    if (reading != b.lastReading) {
      b.lastReading = reading;
      b.lastChangeMs = now;
    }

    if ((now - b.lastChangeMs) >= DEBOUNCE_MS && reading != b.pressed) {
      b.pressed = reading;
      if (b.mode == MODE_HOLD) {
        Serial.println(b.pressed ? b.pressCode : b.releaseCode);
      } else if (b.pressed) {
        Serial.println(b.pressCode);
      }
    }
  }
}
