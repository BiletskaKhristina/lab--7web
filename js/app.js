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
const API_URL = "https://6ae63e5e877d34ccafc2bf1b.mockapi.io/api/v1/sensors"; // Приклад: "https://your-mockapi-url.mockapi.io/api/v1/sensors"

// Глобальний масив для збереження завантажених із сервера даних (потрібен для фільтрації)
let sensors = [];

// Пошук потрібних DOM-елементів через querySelector()
const sensorList = document.querySelector(".sensor-list");
const districtFilter = document.querySelector("#district-filter");
const criticalFilter = document.querySelector("#critical-filter");

// Функція створення картки сенсора
// Функція створення картки сенсора на основі реальних даних з MockAPI
function createSensorCard(sensor) {
  const card = document.createElement("article");
  card.classList.add("sensor-card");
  
  // Якщо в об'єкті немає випадкового рівня шуму, згенеруємо його на основі id для красивої демонстрації
  const noiseLevel = sensor.noiseLevel || (50 + (Number(sensor.id) * 3) % 40);
  const status = noiseLevel > 75 ? "critical" : (noiseLevel > 60 ? "warning" : "normal");
  const district = sensor.district || "Галицький";

  card.classList.add(`sensor-card--${status}`);

  const topDiv = document.createElement("div");
  topDiv.classList.add("sensor-card__top");

  const title = document.createElement("h3");
  title.classList.add("sensor-card__id");
  title.textContent = sensor.name || `Сенсор #${sensor.id}`;

  const statusBadge = document.createElement("span");
  statusBadge.classList.add("sensor-card__status");
  statusBadge.textContent = status;

  topDiv.append(title, statusBadge);

  // Додаємо аватар оператора, якщо він є у згенерованих даних MockAPI
  if (sensor.avatar) {
    const avatarImg = document.createElement("img");
    avatarImg.src = sensor.avatar;
    avatarImg.alt = sensor.name;
    avatarImg.style.width = "40px";
    avatarImg.style.height = "40px";
    avatarImg.style.borderRadius = "50%";
    avatarImg.style.objectFit = "cover";
    card.append(avatarImg);
  }

  const districtP = document.createElement("p");
  districtP.classList.add("sensor-card__address");
  districtP.textContent = `Район: ${district}`;

  const level = document.createElement("p");
  level.classList.add("sensor-card__value");
  level.innerHTML = `Рівень шуму: ${noiseLevel} <span>дБ</span>`;

  card.append(topDiv, districtP, level);
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
// Функція завантаження даних із публічного REST API за допомогою async/await та fetch
async function loadSensors() {
  if (!sensorList) return;

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const rawData = await response.json(); 

    // Додаємом район та рівень шуму до кожного об'єкта, якщо їх немає в MockAPI
    const districtsList = ["Галицький", "Франківський", "Шевченківський", "Сихівський", "Личаківський", "Залізничний"];
    
    sensors = rawData.map((item, index) => {
      return {
        ...item,
        // Якщо в MockAPI немає району, призначаємо його циклично за індексом
        district: item.district || districtsList[index % districtsList.length],
        // Якщо немає рівню шуму, генеруємо стабільне значення
        noiseLevel: item.noiseLevel || (45 + (index * 7) % 45)
      };
    });

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