import { NoiseSensor, NOISE_LIMITS, VALID_NOISE_RANGE } from "./models/NoiseSensor.js";
import { NoiseMeasurement } from "./models/NoiseMeasurement.js";
import { MonitoringSystem } from "./services/MonitoringSystem.js";

// 1. Попередні вихідні дані та ініціалізація системи (Лаб. №5)
const noiseLevels = [
  42, 55, 61, 78, 83, 67,
  53, 47, 88, 69, 74, 82,
  49, 72, 91, 58,
  64, 76, 95, 51,
  71, -1, 85, 63,
  79, 39, 141, 86
];

const system = new MonitoringSystem();
const sensor = new NoiseSensor("NS-01");
system.addSensor(sensor);

const invalidItems = [];

noiseLevels.forEach((value, index) => {
  if (!NoiseSensor.isValidNoiseLevel(value)) {
    invalidItems.push({ position: index + 1, value });
    return;
  }
  sensor.addMeasurement(new NoiseMeasurement(value));
});

console.group("Акустична варта — лабораторна робота №7");
console.log(`Пороги за методичкою: normal ≤ ${NOISE_LIMITS.normalMax} dB; warning ≤ ${NOISE_LIMITS.warningMax} dB; critical > ${NOISE_LIMITS.warningMax} dB`);
console.groupEnd();


// ==========================================
// 2. ЛОГІКА ЛАБОРАТОРНОЇ РОБОТИ №7 (API та fetch)
// ==========================================

// ЗАМІНІТЬ YOUR_MOCKAPI_URL на вашу реальну адресу з MockAPI!
const API_URL = "https://YOUR_MOCKAPI_URL/api/v1/sensors";

// Глобальний масив для збереження завантажених із сервера даних (потрібен для фільтрації)
let sensors = [];

// Пошук потрібних DOM-елементів через querySelector()
const sensorList = document.querySelector(".sensor-list");
const districtFilter = document.querySelector("#district-filter");
const criticalFilter = document.querySelector("#critical-filter");

// Функція створення картки сенсора
function createSensorCard(sensor) {
  const card = document.createElement("article");
  card.classList.add("sensor-card");
  
  // Визначаємо статус для класу (у MockAPI статус може бути 'active'/'inactive' або 'normal'/'warning'/'critical')
  // Якщо статус текстовий з API, адаптуємо або використовуємо напряму:
  const statusClass = sensor.status === "active" ? "normal" : (sensor.status || "normal");
  card.classList.add(`sensor-card--${statusClass}`);

  const topDiv = document.createElement("div");
  topDiv.classList.add("sensor-card__top");

  const title = document.createElement("h3");
  title.classList.add("sensor-card__id");
  title.textContent = sensor.name || sensor.id;

  const statusBadge = document.createElement("span");
  statusBadge.classList.add("sensor-card__status");
  statusBadge.textContent = sensor.status;

  topDiv.append(title, statusBadge);

  const district = document.createElement("p");
  district.classList.add("sensor-card__address");
  district.textContent = `Район: ${sensor.district}`;

  const location = document.createElement("p");
  location.classList.add("sensor-card__caption");
  location.textContent = `Локація: ${sensor.location || "Не вказано"}`;

  const level = document.createElement("p");
  level.classList.add("sensor-card__value");
  level.innerHTML = `${sensor.noiseLevel} <span>дБ</span>`;

  card.append(topDiv, district, location, level);
  return card;
}

// Функція відображення (рендерингу) масиву сенсорів
function renderSensors(sensorArray) {
  if (!sensorList) return;
  sensorList.replaceChildren(); // Очищення контейнера перед новим рендером
  
  sensorArray.forEach((sensor) => {
    const card = createSensorCard(sensor);
    sensorList.append(card);
  });
}

// Функція завантаження даних із публічного REST API за допомогою async/await та fetch
async function loadSensors() {
  if (!sensorList) return;

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    sensors = await response.json(); // Зберігаємо отримані дані у глобальний масив
    renderSensors(sensors); // Виводимо всі дані на сторінку

  } catch (error) {
    console.error("Не вдалося завантажити сенсори:", error);
    sensorList.innerHTML = "<p style='color: red;'>Не вдалося завантажити дані з сервера.</p>";
  }
}

// Функція фільтрації сенсорів
function applyFilters() {
  const selectedDistrict = districtFilter ? districtFilter.value : "all";
  const criticalOnly = criticalFilter ? criticalFilter.checked : false;

  const filteredSensors = sensors.filter((sensor) => {
    const matchesDistrict = selectedDistrict === "all" || sensor.district === selectedDistrict;
    // Фільтруємо за критичним статусом (якщо шум > 75 або статус critical/inactive залежно від ваших даних)
    const isCritical = sensor.status === "critical" || Number(sensor.noiseLevel) > 75;
    const matchesStatus = !criticalOnly || isCritical;
    
    return matchesDistrict && matchesStatus;
  });

  renderSensors(filteredSensors);
}

// Додавання обробників подій change для фільтрів
if (districtFilter && criticalFilter) {
  districtFilter.addEventListener("change", applyFilters);
  criticalFilter.addEventListener("change", applyFilters);
}

// Запуск завантаження даних при відкритті сторінки
loadSensors();

// Для перевірки з Console
window.noiseMonitoring = { system, sensor, loadSensors, API_URL };