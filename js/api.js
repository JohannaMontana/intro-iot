// js/api.js - Corregido para funcionamiento completo
const API_BASE = "https://68cc2ba7716562cf5076b810.mockapi.io/terrarios/v1/terrarios";

async function safeFetch(url, opts = {}) {
  try {
    const r = await fetch(url, opts);
    if (!r.ok) {
      const text = await r.text().catch(()=>'');
      throw new Error(`${r.status} ${r.statusText} - ${text}`);
    }
    return r.json().catch(()=>null);
  } catch (error) {
    console.error('Error en safeFetch:', error);
    throw error;
  }
}

// Obtener todos los terrarios
async function getAllTerrarios() {
  return await safeFetch(API_BASE);
}

// Obtener un terrario específico
async function getTerrario(id) {
  return await safeFetch(`${API_BASE}/${id}`);
}

// Crear un nuevo terrario
async function postTerrario(body) {
  try {
    // Asegurarnos de que los datos del sensor sean válidos
    const terrarioData = {
      ...body,
      // Forzar datos iniciales del sensor a 0.0 como solicitaste
      sensorAmbiente: [{
        temperatura: "0.0",
        humedad: "0.0", 
        activo: true,
        fecha: new Date().toISOString()
      }],
      // Datos iniciales de dispositivos
      lamparaUV: [{
        encendido: false,
        ultimaEncendido: null,
        ultimaApagado: new Date().toISOString(),
        fecha: new Date().toISOString()
      }],
      humidificador: [{
        encendido: false,
        ultimaEncendido: null,
        ultimaApagado: new Date().toISOString(),
        fecha: new Date().toISOString()
      }],
      fecha: new Date().toISOString()
    };
    
    return await safeFetch(API_BASE, { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(terrarioData) 
    });
  } catch (error) {
    console.error('Error en postTerrario:', error);
    throw error;
  }
}

// Actualizar un terrario completo
async function putTerrario(id, body) {
  return await safeFetch(`${API_BASE}/${id}`, { 
    method: 'PUT', 
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify(body) 
  });
}

// Actualizar parcialmente un terrario
async function patchTerrario(id, body) {
  return await safeFetch(`${API_BASE}/${id}`, { 
    method: 'PATCH', 
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify(body) 
  });
}

// Eliminar un terrario
async function deleteTerrario(id) {
  return await safeFetch(`${API_BASE}/${id}`, { method: 'DELETE' });
}

// Funciones para dispositivos específicos dentro de un terrario
async function addSensorData(terrarioId, sensorData) {
  try {
    const terrario = await getTerrario(terrarioId);
    if (!terrario.sensorAmbiente) terrario.sensorAmbiente = [];
    
    // Añadir nuevo dato de sensor
    terrario.sensorAmbiente.unshift({
      ...sensorData,
      fecha: new Date().toISOString()
    });
    
    // Limitar a 50 registros máximo
    if (terrario.sensorAmbiente.length > 50) {
      terrario.sensorAmbiente = terrario.sensorAmbiente.slice(0, 50);
    }
    
    return await putTerrario(terrarioId, terrario);
  } catch (error) {
    console.error('Error en addSensorData:', error);
    throw error;
  }
}

async function addLampData(terrarioId, lampData) {
  try {
    const terrario = await getTerrario(terrarioId);
    if (!terrario.lamparaUV) terrario.lamparaUV = [];
    
    // Crear nuevo registro de lámpara
    const newLampData = {
      encendido: lampData.encendido,
      ultimaEncendido: lampData.encendido ? new Date().toISOString() : (terrario.lamparaUV[0]?.ultimaEncendido || null),
      ultimaApagado: !lampData.encendido ? new Date().toISOString() : (terrario.lamparaUV[0]?.ultimaApagado || null),
      fecha: new Date().toISOString()
    };
    
    // Añadir al inicio del array
    terrario.lamparaUV.unshift(newLampData);
    
    // Limitar a 50 registros máximo
    if (terrario.lamparaUV.length > 50) {
      terrario.lamparaUV = terrario.lamparaUV.slice(0, 50);
    }
    
    return await putTerrario(terrarioId, terrario);
  } catch (error) {
    console.error('Error en addLampData:', error);
    throw error;
  }
}

async function addHumidifierData(terrarioId, humidifierData) {
  try {
    const terrario = await getTerrario(terrarioId);
    if (!terrario.humidificador) terrario.humidificador = [];
    
    // Crear nuevo registro de humidificador
    const newHumidifierData = {
      encendido: humidifierData.encendido,
      ultimaEncendido: humidifierData.encendido ? new Date().toISOString() : (terrario.humidificador[0]?.ultimaEncendido || null),
      ultimaApagado: !humidifierData.encendido ? new Date().toISOString() : (terrario.humidificador[0]?.ultimaApagado || null),
      fecha: new Date().toISOString()
    };
    
    // Añadir al inicio del array
    terrario.humidificador.unshift(newHumidifierData);
    
    // Limitar a 50 registros máximo
    if (terrario.humidificador.length > 50) {
      terrario.humidificador = terrario.humidificador.slice(0, 50);
    }
    
    return await putTerrario(terrarioId, terrario);
  } catch (error) {
    console.error('Error en addHumidifierData:', error);
    throw error;
  }
}

// Obtener los últimos datos de un dispositivo específico
function getLatestDeviceData(terrario, deviceType) {
  if (!terrario[deviceType] || terrario[deviceType].length === 0) {
    return null;
  }
  
  // Devolver el registro más reciente (primero en el array)
  return terrario[deviceType][0];
}

// Obtener datos recientes de un dispositivo
function getRecentDeviceData(terrario, deviceType, limit = 10) {
  if (!terrario[deviceType] || terrario[deviceType].length === 0) {
    return [];
  }
  
  return terrario[deviceType].slice(0, limit);
}

// Generar datos de sensor aleatorios para simulación
function generateSensorData() {
  return {
    temperatura: (Math.random() * 10 + 20).toFixed(1), // 20-30°C
    humedad: (Math.random() * 30 + 40).toFixed(1), // 40-70%
    activo: true,
    fecha: new Date().toISOString()
  };
}