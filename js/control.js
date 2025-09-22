// js/control.js - Corregido con control manual y simulación automática
let currentTerrarioId = null;
let currentTerrario = null;
let currentState = { 
  lamp: { encendido: false, ultimaEncendido: null, ultimaApagado: null }, 
  humidifier: { encendido: false, ultimaEncendido: null, ultimaApagado: null }, 
  sensor: { temperatura: 0, humedad: 0, activo: false } 
};

// Obtener ID del terrario desde la URL
function getTerrarioIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('terrario');
}

// Rotación
let rotationY = 0;
document.getElementById('rotate-left').addEventListener('click', ()=>{
  rotationY-=15; 
  document.getElementById('terrario').style.transform=`rotateY(${rotationY}deg)`;
});
document.getElementById('rotate-right').addEventListener('click', ()=>{
  rotationY+=15; 
  document.getElementById('terrario').style.transform=`rotateY(${rotationY}deg)`;
});

// Alertas
const alertShown = new Set();

function showAlert(msg, type='info'){
  if(alertShown.has(msg)) return; // no repetir
  alertShown.add(msg);

  const alertBox = document.querySelector('.alert-box');
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  alertBox.appendChild(alert);

  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => alert.remove(), 300);
    alertShown.delete(msg); // permitir mostrar nuevamente en el futuro si vuelve a dispararse
  }, 5000);
}

// Checar estándares
function checkStandards(temp, hum){
  if(temp < TERRARIO_STANDARDS.temp_min) showAlert(`¡Temperatura baja! (${temp}°C). Considera encender la lámpara UV.`,'warning');
  if(temp > TERRARIO_STANDARDS.temp_max) showAlert(`¡Temperatura alta! (${temp}°C). Considera apagar la lámpara UV.`,'warning');
  if(hum < TERRARIO_STANDARDS.hum_min) showAlert(`¡Humedad baja! (${hum}%). Considera encender el humidificador.`,'warning');
  if(hum > TERRARIO_STANDARDS.hum_max) showAlert(`¡Humedad alta! (${hum}%). Considera apagar el humidificador.`,'warning');
}

// Obtener estado
async function fetchStatus(){
  if (!currentTerrarioId) return;
  
  try {
    currentTerrario = await getTerrario(currentTerrarioId);
    
    const latestSensor = getLatestDeviceData(currentTerrario, 'sensorAmbiente');
    const latestLamp = getLatestDeviceData(currentTerrario, 'lamparaUV');
    const latestHumidifier = getLatestDeviceData(currentTerrario, 'humidificador');

    // Actualizar estado actual
    if (latestLamp) {
      currentState.lamp = latestLamp;
    }
    
    if (latestHumidifier) {
      currentState.humidifier = latestHumidifier;
    }
    
    if (latestSensor) {
      currentState.sensor = latestSensor;
    }
    
    updateUI(currentState.humidifier, currentState.lamp, currentState.sensor);
    
    if (currentState.sensor) {
      checkStandards(parseFloat(currentState.sensor.temperatura), parseFloat(currentState.sensor.humedad));
    }
  } catch(err) {
    console.error('Error al obtener estado:', err);
    showAlert('Error al obtener estado del terrario','danger');
  }
}

// Actualizar UI
function updateUI(humid, lamp, sensor){
  // Botones y SVG
  const lampElement = document.getElementById('lamp');
  const lampBeam = document.getElementById('lamp-beam');
  const humidifier = document.getElementById('humidifier');
  const sensorTemp = document.getElementById('sensor-temp');
  const sensorHum = document.getElementById('sensor-hum');
  const toggleLampBtn = document.getElementById('toggle-lamp');
  const toggleHumBtn = document.getElementById('toggle-hum');
  
  // Actualizar lámpara
  if (lamp && lamp.encendido) {
    lampElement.classList.add('lamp-on');
    lampBeam.classList.add('lamp-beam-on');
    toggleLampBtn.className = 'btn btn-lamp me-3';
    toggleLampBtn.innerHTML = '<i class="bi bi-lightbulb-fill"></i> Apagar Luz UV';
  } else {
    lampElement.classList.remove('lamp-on');
    lampBeam.classList.remove('lamp-beam-on');
    toggleLampBtn.className = 'btn btn-outline-warning me-3';
    toggleLampBtn.innerHTML = '<i class="bi bi-lightbulb"></i> Encender Luz UV';
  }
  
  // Actualizar humidificador
  if (humid && humid.encendido) {
    humidifier.classList.add('humidifier-on');
    document.querySelectorAll('[id^="smoke-"]').forEach(el => {
      el.classList.add('smoke-animation');
      el.style.opacity = '0.8';
    });
    toggleHumBtn.className = 'btn btn-hum';
    toggleHumBtn.innerHTML = '<i class="bi bi-droplet-fill"></i> Apagar Humidificador';
  } else {
    humidifier.classList.remove('humidifier-on');
    document.querySelectorAll('[id^="smoke-"]').forEach(el => {
      el.classList.remove('smoke-animation');
      el.style.opacity = '0';
    });
    toggleHumBtn.className = 'btn btn-outline-info';
    toggleHumBtn.innerHTML = '<i class="bi bi-droplet"></i> Encender Humidificador';
  }
  
  // Actualizar sensor
  if (sensor) {
    sensorTemp.textContent = `${sensor.temperatura || '--'}°C`;
    sensorHum.textContent = `${sensor.humedad || '--'}%`;
  } else {
    sensorTemp.textContent = '--°C';
    sensorHum.textContent = '--%';
  }
}

// Cambiar estado
async function toggleDevice(dev, newState){
  if (!currentTerrarioId) {
    showAlert('Primero selecciona un terrario desde la página principal', 'warning');
    return;
  }
  
  try {
    if(dev === 'lamp'){
      await addLampData(currentTerrarioId, { encendido: newState });
      currentState.lamp.encendido = newState;
      
      // Efecto de la lámpara en la temperatura
      if (newState) {
        simulateLampEffect();
      }
    } else if(dev === 'humidifier'){
      await addHumidifierData(currentTerrarioId, { encendido: newState });
      currentState.humidifier.encendido = newState;
      
      // Efecto del humidificador en la humedad
      if (newState) {
        simulateHumidifierEffect();
      }
    }

    showAlert(`Dispositivo ${newState ? 'activado' : 'desactivado'}`,'success');
    
    // Actualizar el estado del terrario completo
    try {
      await patchTerrario(currentTerrarioId, { 
        estado: true,
        fecha: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error al actualizar estado del terrario:', error);
    }
    
    updateUI(currentState.humidifier, currentState.lamp, currentState.sensor);
  } catch(err) {
    console.error('Error al cambiar dispositivo:', err);
    showAlert('Error al cambiar dispositivo','danger');
  }
}

// Simular efecto de la lámpara en la temperatura
async function simulateLampEffect() {
  if (!currentState.sensor || !currentTerrarioId) return;
  
  let currentTemp = parseFloat(currentState.sensor.temperatura);
  if (isNaN(currentTemp)) currentTemp = 20; // Valor por defecto
  
  // Aumentar temperatura gradualmente (0.5°C cada 10 segundos)
  const interval = setInterval(async () => {
    if (!currentState.lamp.encendido) {
      clearInterval(interval);
      return;
    }
    
    currentTemp += 0.5;
    if (currentTemp > 35) currentTemp = 35; // Límite máximo
    
    try {
      await addSensorData(currentTerrarioId, {
        temperatura: currentTemp.toFixed(1),
        humedad: currentState.sensor.humedad || "50.0",
        activo: true
      });
      
      // Actualizar estado local
      currentState.sensor.temperatura = currentTemp.toFixed(1);
      updateUI(currentState.humidifier, currentState.lamp, currentState.sensor);
      
    } catch (error) {
      console.error('Error al simular efecto lámpara:', error);
      clearInterval(interval);
    }
  }, 10000); // Cada 10 segundos
}

// Simular efecto del humidificador en la humedad
async function simulateHumidifierEffect() {
  if (!currentState.sensor || !currentTerrarioId) return;
  
  let currentHum = parseFloat(currentState.sensor.humedad);
  if (isNaN(currentHum)) currentHum = 50; // Valor por defecto
  
  // Aumentar humedad gradualmente (2% cada 10 segundos)
  const interval = setInterval(async () => {
    if (!currentState.humidifier.encendido) {
      clearInterval(interval);
      return;
    }
    
    currentHum += 2;
    if (currentHum > 90) currentHum = 90; // Límite máximo
    
    try {
      await addSensorData(currentTerrarioId, {
        temperatura: currentState.sensor.temperatura || "25.0",
        humedad: currentHum.toFixed(1),
        activo: true
      });
      
      // Actualizar estado local
      currentState.sensor.humedad = currentHum.toFixed(1);
      updateUI(currentState.humidifier, currentState.lamp, currentState.sensor);
      
    } catch (error) {
      console.error('Error al simular efecto humidificador:', error);
      clearInterval(interval);
    }
  }, 10000); // Cada 10 segundos
}

// Función para agregar lectura manual
async function addManualReading() {
  if (!currentTerrarioId) {
    showAlert('Primero selecciona un terrario', 'warning');
    return;
  }
  
  const tempInput = document.getElementById('manual-temp');
  const humInput = document.getElementById('manual-hum');
  
  const temperatura = parseFloat(tempInput.value);
  const humedad = parseFloat(humInput.value);
  
  if (isNaN(temperatura) || isNaN(humedad)) {
    showAlert('Por favor ingresa valores válidos para temperatura y humedad', 'danger');
    return;
  }
  
  if (temperatura < 0 || temperatura > 50) {
    showAlert('La temperatura debe estar entre 0°C y 50°C', 'danger');
    return;
  }
  
  if (humedad < 0 || humedad > 100) {
    showAlert('La humedad debe estar entre 0% y 100%', 'danger');
    return;
  }
  
  try {
    await addSensorData(currentTerrarioId, {
      temperatura: temperatura.toFixed(1),
      humedad: humedad.toFixed(1),
      activo: true
    });
    
    // Actualizar estado local
    currentState.sensor = {
      temperatura: temperatura.toFixed(1),
      humedad: humedad.toFixed(1),
      activo: true,
      fecha: new Date().toISOString()
    };
    
    updateUI(currentState.humidifier, currentState.lamp, currentState.sensor);
    checkStandards(temperatura, humedad);
    
    // Limpiar inputs
    tempInput.value = '';
    humInput.value = '';
    
    showAlert('Lectura manual agregada correctamente', 'success');
    
  } catch (error) {
    console.error('Error al agregar lectura manual:', error);
    showAlert('Error al agregar lectura manual', 'danger');
  }
}

// Simulación automática de sensor cada hora (3600000 ms)
function startSensorSimulation() {
  setInterval(async () => {
    if (!currentTerrarioId || !currentState.sensor) return;
    
    try {
      // Generar datos realistas con efectos de dispositivos
      const newData = safeGenerateSensorData(
        currentState.sensor, 
        currentState.lamp.encendido, 
        currentState.humidifier.encendido
      );
      
      await addSensorData(currentTerrarioId, newData);
      
      // Actualizar estado local
      currentState.sensor = newData;
      
      updateUI(currentState.humidifier, currentState.lamp, currentState.sensor);
      checkStandards(parseFloat(newData.temperatura), parseFloat(newData.humedad));
      
    } catch (error) {
      console.error('Error en simulación automática:', error);
    }
  }, 1800000); // 1800000
}

// Event listeners para botones
document.getElementById('toggle-lamp').addEventListener('click', () => {
  toggleDevice('lamp', !currentState.lamp.encendido);
});

document.getElementById('toggle-hum').addEventListener('click', () => {
  toggleDevice('humidifier', !currentState.humidifier.encendido);
});

// Event listener para lectura manual
document.getElementById('add-reading-btn').addEventListener('click', addManualReading);

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
  currentTerrarioId = getTerrarioIdFromURL();
  
  if (!currentTerrarioId) {
    document.getElementById('terrario-name').textContent = 'Selecciona un terrario desde la página principal';
    showAlert('Primero selecciona un terrario desde la página principal', 'warning');
    return;
  }
  
  try {
    currentTerrario = await getTerrario(currentTerrarioId);
    document.getElementById('terrario-name').textContent = `Control del Terrario: ${currentTerrario.nombre}`;
    
    // Cargar estado inicial
    await fetchStatus();
    
    // Actualizar cada 2 segundos
    setInterval(fetchStatus, 1800000); //2000
    
    // Iniciar simulación automática de sensor
    startSensorSimulation();
    
  } catch (error) {
    console.error('Error al cargar terrario:', error);
    showAlert('Error al cargar el terrario', 'danger');
  }
});