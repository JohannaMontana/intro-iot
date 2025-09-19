// js/utils.js - utilidades globales

// Formatea una fecha ISO a zona CDMX, con fallback
function formatDateSafe(iso) {
  if (!iso) return '-';
  const parsed = Date.parse(iso);
  if (isNaN(parsed)) return iso; // devolver original si no parsea
  try {
    return new Date(parsed).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  } catch(e) {
    return new Date(parsed).toLocaleString();
  }
}

// Mover STANDARDS a un objeto para evitar conflictos de redeclaración
const TERRARIO_STANDARDS = {
  temp_min: 26,
  temp_max: 32,
  hum_min: 50,
  hum_max: 70,
  hum_target: 60
};

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

/* Local logs (usamos para reconstruir historial toggles/sensor_update) */
const LOG_KEY = 'terrario_logs_v3';
function addLog(deviceKey, deviceId, action, detail) {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    logs.unshift({ ts: new Date().toISOString(), deviceKey, deviceId: String(deviceId), action, detail });
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0,1000)));
  } catch(e) { console.error('log save error', e); }
}
function getLogs(deviceKey, deviceId, limit = 10) {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    return logs.filter(l => l.deviceKey === deviceKey && l.deviceId === String(deviceId)).slice(0, limit);
  } catch(e) { return []; }
}
function getAllLogs(limit = 200) {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    return logs.slice(0, limit);
  } catch(e) { return []; }
}

// alerts builder
function buildAlerts(temp, hum) {
  const out = [];
  if (temp < TERRARIO_STANDARDS.temp_min) out.push(`Temperatura baja (${temp} °C) — considerar encender lámpara UV.`);
  if (temp > TERRARIO_STANDARDS.temp_max) out.push(`Temperatura alta (${temp} °C) — considerar apagar lámpara UV.`);
  if (hum < TERRARIO_STANDARDS.hum_min) out.push(`Humedad baja (${hum}%) — considerar encender humidificador.`); 
  if (hum > TERRARIO_STANDARDS.hum_max) out.push(`Humedad alta (${hum}%) — considerar apagar humidificador.`);
  return out;
}

// Generar datos de sensor 
// Generar datos de sensor aleatorios para simulación
function generateSensorData() {
  // Si ya hay datos del sensor, usar como base con pequeña variación
  if (currentState && currentState.sensor && currentState.sensor.temperatura !== "0.0") {
    let temp = parseFloat(currentState.sensor.temperatura);
    let hum = parseFloat(currentState.sensor.humedad);
    
    // Pequeña variación aleatoria
    const tempVariation = (Math.random() - 0.5) * 2.0;
    const humVariation = (Math.random() - 0.5) * 5.0;
    
    return {
      temperatura: Math.max(15, Math.min(35, temp + tempVariation)).toFixed(1),
      humedad: Math.max(30, Math.min(80, hum + humVariation)).toFixed(1),
      activo: true,
      fecha: new Date().toISOString()
    };
  }
  
  // Si no hay datos previos, generar valores aleatorios base
  return {
    temperatura: (Math.random() * 10 + 20).toFixed(1), // 20-30°C
    humedad: (Math.random() * 30 + 40).toFixed(1), // 40-70%
    activo: true,
    fecha: new Date().toISOString()
  };
}