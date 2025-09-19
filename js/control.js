// js/control.js - Corregido sin redeclaración de STANDARDS
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
    } else {
      // Si no hay datos de sensor, generar unos aleatorios
      try {
        const newSensorData = generateSensorData();
        await addSensorData(currentTerrarioId, newSensorData);
        currentState.sensor = newSensorData;
      } catch (error) {
        console.error('Error al generar datos de sensor:', error);
      }
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
    } else if(dev === 'humidifier'){
      await addHumidifierData(currentTerrarioId, { encendido: newState });
      currentState.humidifier.encendido = newState;
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

// Event listeners para botones
document.getElementById('toggle-lamp').addEventListener('click', () => {
  toggleDevice('lamp', !currentState.lamp.encendido);
});

document.getElementById('toggle-hum').addEventListener('click', () => {
  toggleDevice('humidifier', !currentState.humidifier.encendido);
});

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
    setInterval(fetchStatus, 2000);
    
    // Simular datos de sensor cada 5 segundos
    setInterval(async () => {
      if (currentTerrarioId) {
        try {
          const newSensorData = generateSensorData();
          await addSensorData(currentTerrarioId, newSensorData);
          currentState.sensor = newSensorData;
          updateUI(currentState.humidifier, currentState.lamp, currentState.sensor);
          checkStandards(parseFloat(newSensorData.temperatura), parseFloat(newSensorData.humedad));
        } catch (error) {
          console.error('Error al generar datos de sensor:', error);
        }
      }
    }, 5000);
  } catch (error) {
    console.error('Error al cargar terrario:', error);
    showAlert('Error al cargar el terrario', 'danger');
  }
});