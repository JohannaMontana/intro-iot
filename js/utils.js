// js/utils.js - utilidades globales con simulación realista de sensores

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

// Simulación de ciclo circadiano (variaciones naturales a lo largo del día)
function getCircadianVariation() {
  const now = new Date();
  const hour = now.getHours();
  
  // Patrón circadiano: más frío por la noche, más cálido por el día
  if (hour >= 22 || hour < 6) {
    return -2.5; // Noche: más frío
  } else if (hour >= 6 && hour < 10) {
    return -1.0; // Mañana: fresco
  } else if (hour >= 10 && hour < 14) {
    return 2.0; // Medio día: más cálido
  } else if (hour >= 14 && hour < 18) {
    return 1.5; // Tarde: cálido
  } else {
    return 0.0; // Anochecer: neutral
  }
}

// Simulación de efectos ambientales (estación del año, clima)
function getSeasonalVariation() {
  const now = new Date();
  const month = now.getMonth();
  
  // Simular estaciones del año (para México)
  if (month >= 11 || month < 2) {
    return -1.5; // Invierno: más frío
  } else if (month >= 2 && month < 5) {
    return 0.5; // Primavera: templado
  } else if (month >= 5 && month < 8) {
    return 2.0; // Verano: más cálido
  } else {
    return 1.0; // Otoño: templado
  }
}

// Generar datos de sensor realistas cada hora
function generateRealisticSensorData(previousData = null) {
  const now = new Date();
  const hour = now.getHours();
  
  // Valores base según la hora del día
  let baseTemp, baseHum;
  
  if (hour >= 22 || hour < 6) {
    // Noche (10 PM - 6 AM)
    baseTemp = 22.0;
    baseHum = 65.0;
  } else if (hour >= 6 && hour < 12) {
    // Mañana (6 AM - 12 PM)
    baseTemp = 25.0;
    baseHum = 60.0;
  } else if (hour >= 12 && hour < 18) {
    // Tarde (12 PM - 6 PM)
    baseTemp = 28.0;
    baseHum = 55.0;
  } else {
    // Noche temprana (6 PM - 10 PM)
    baseTemp = 24.0;
    baseHum = 62.0;
  }
  
  // Si hay datos previos, usar como base con variación natural
  if (previousData && previousData.temperatura && previousData.humedad) {
    const prevTemp = parseFloat(previousData.temperatura);
    const prevHum = parseFloat(previousData.humedad);
    
    if (!isNaN(prevTemp) && !isNaN(prevHum)) {
      // Variación suave desde el último valor (máximo ±1.5°C y ±3%)
      const tempVariation = (Math.random() - 0.5) * 3.0;
      const humVariation = (Math.random() - 0.5) * 6.0;
      
      baseTemp = prevTemp + tempVariation;
      baseHum = prevHum + humVariation;
    }
  }
  
  // Aplicar variaciones circadianas y estacionales
  const circadian = getCircadianVariation();
  const seasonal = getSeasonalVariation();
  
  // Variación aleatoria final (±0.8°C y ±2%)
  const finalTempVariation = (Math.random() - 0.5) * 1.6;
  const finalHumVariation = (Math.random() - 0.5) * 4.0;
  
  let finalTemp = baseTemp + circadian + seasonal + finalTempVariation;
  let finalHum = baseHum + finalHumVariation;
  
  // Asegurar límites físicos realistas
  finalTemp = clamp(finalTemp, 18.0, 35.0); // 18-35°C rango realista
  finalHum = clamp(finalHum, 40.0, 85.0);   // 40-85% rango realista
  
  return {
    temperatura: finalTemp.toFixed(1),
    humedad: finalHum.toFixed(1),
    activo: true,
    fecha: new Date().toISOString()
  };
}

// Generar datos de sensor para nuevos terrarios
function generateSensorData() {
  return {
    temperatura: "0.0", // Valor inicial como solicitaste
    humedad: "0.0",     // Valor inicial como solicitaste
    activo: true,
    fecha: new Date().toISOString()
  };
}

// Función para simulación continua con efectos de dispositivos
function generateSensorDataWithEffects(previousData, lampOn = false, humidifierOn = false) {
  const realisticData = generateRealisticSensorData(previousData);
  
  let temp = parseFloat(realisticData.temperatura);
  let hum = parseFloat(realisticData.humedad);
  
  // Efecto de la lámpara UV (+2-4°C cuando está encendida)
  if (lampOn) {
    const lampEffect = 2.0 + (Math.random() * 2.0); // +2-4°C
    temp += lampEffect;
  }
  
  // Efecto del humidificador (+10-20% cuando está encendido)
  if (humidifierOn) {
    const humidifierEffect = 10.0 + (Math.random() * 10.0); // +10-20%
    hum += humidifierEffect;
  }
  
  // Asegurar límites después de aplicar efectos
  temp = clamp(temp, 18.0, 40.0);
  hum = clamp(hum, 30.0, 95.0);
  
  return {
    temperatura: temp.toFixed(1),
    humedad: hum.toFixed(1),
    activo: true,
    fecha: new Date().toISOString()
  };
}

// Función segura para generación de datos
function safeGenerateSensorData(previousData = null, lampOn = false, humidifierOn = false) {
  try {
    // Para nuevos terrarios sin datos previos
    if (!previousData || previousData.temperatura === "0.0") {
      return generateSensorData();
    }
    
    // Para terrarios existentes con datos
    return generateSensorDataWithEffects(previousData, lampOn, humidifierOn);
    
  } catch (e) {
    console.log('Error en generación de datos, usando valores por defecto:', e);
    return {
      temperatura: "25.0",
      humedad: "60.0",
      activo: true,
      fecha: new Date().toISOString()
    };
  }
}

// Simulación automática para todos los terrarios (EJECUCIÓN AUTOMÁTICA)
function startGlobalSimulation() {
  console.log('🌍 Iniciando simulación global automática');
  
  // Función que se ejecutará cada hora
  async function simulateAllTerrarios() {
    try {
      console.log('🔄 Simulando datos para todos los terrarios...');
      const terrarios = await getAllTerrarios();
      
      for (const terrario of terrarios) {
        try {
          // Obtener datos actuales del terrario
          const terrarioActual = await getTerrario(terrario.id);
          const latestSensor = getLatestDeviceData(terrarioActual, 'sensorAmbiente');
          const latestLamp = getLatestDeviceData(terrarioActual, 'lamparaUV');
          const latestHumidifier = getLatestDeviceData(terrarioActual, 'humidificador');
          
          // Generar nuevos datos solo si hay datos previos
          if (latestSensor) {
            const newData = generateSensorDataWithEffects(
              latestSensor,
              latestLamp ? latestLamp.encendido : false,
              latestHumidifier ? latestHumidifier.encendido : false
            );
            
            // Guardar nuevos datos
            await addSensorData(terrario.id, newData);
            console.log(`✅ ${terrario.nombre}: ${newData.temperatura}°C, ${newData.humedad}%`);
          }
        } catch (error) {
          console.error(`❌ Error con terrario ${terrario.id}:`, error);
        }
      }
      
      console.log('🎉 Simulación completada para todos los terrarios');
      
      // Disparar evento personalizado para notificar a las páginas
      window.dispatchEvent(new CustomEvent('terrariosUpdated'));
      
    } catch (error) {
      console.error('Error en simulación global:', error);
    }
  }
  
  // Ejecutar inmediatamente y luego cada hora
  simulateAllTerrarios();
  // setInterval(simulateAllTerrarios, 1800000); // 1 hora
}

// Iniciar automáticamente cuando se carga utils.js
console.log('🔧 utils.js cargado - Simulación global disponible');