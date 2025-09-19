// js/monitor.js - Actualizado para usar TERRARIO_STANDARDS
let tempChart = null, statusChart = null, gaugeChart = null, poll = null;
let currentTerrarioId = null;

// Obtener ID del terrario desde la URL
function getTerrarioIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('terrario');
}

function createChartsIfNeeded() {
  // Gráfica de temperatura y humedad (líneas)
  if (!tempChart) {
    const ctx = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(ctx, {
      type: 'line',
      data: { 
        labels: [], 
        datasets: [
          { 
            label: 'Temperatura (°C)', 
            data: [], 
            borderColor: '#dc3545', 
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            tension: 0.3, 
            fill: true,
            borderWidth: 2
          },
          { 
            label: 'Humedad (%)', 
            data: [], 
            borderColor: '#0dcaf0', 
            backgroundColor: 'rgba(13, 202, 240, 0.1)',
            tension: 0.3, 
            fill: true,
            borderWidth: 2,
            yAxisID: 'y1'
          }
        ]
      },
      options: { 
        animation: { duration: 0 },
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Temperatura y Humedad'
          }
        },
        scales: { 
          y: { 
            beginAtZero: false,
            title: {
              display: true,
              text: 'Temperatura (°C)'
            },
            suggestedMin: 20,
            suggestedMax: 35
          }, 
          y1: { 
            position: 'right',
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Humedad (%)'
            }
          } 
        } 
      }
    });
  }
  
  // Gráfica de estado (barras)
  if (!statusChart) {
    const ctx2 = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(ctx2, {
      type: 'bar',
      data: { 
        labels: [], 
        datasets: [
          { 
            label: 'Humidificador', 
            data: [], 
            backgroundColor: 'rgba(23, 162, 184, 0.7)',
            borderColor: '#17a2b8',
            borderWidth: 1
          },
          { 
            label: 'Lámpara UV', 
            data: [], 
            backgroundColor: 'rgba(255, 193, 7, 0.7)',
            borderColor: '#ffc107',
            borderWidth: 1
          }
        ]
      },
      options: { 
        animation: { duration: 0 },
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Estado de Dispositivos'
          }
        },
        scales: { 
          y: { 
            min: 0, 
            max: 1, 
            ticks: { 
              stepSize: 1,
              callback: function(value) {
                return value === 1 ? 'ON' : 'OFF';
              }
            },
            title: {
              display: true,
              text: 'Estado'
            }
          } 
        } 
      }
    });
  }
  
  // Gráfica de gauge (circular)
  if (!gaugeChart) {
    const ctx3 = document.getElementById('gaugeChart').getContext('2d');
    gaugeChart = new Chart(ctx3, {
      type: 'doughnut',
      data: {
        labels: ['Temperatura Ideal', 'Desviación'],
        datasets: [{
          data: [80, 20],
          backgroundColor: [
            '#2E8B57',
            '#e9ecef'
          ],
          borderWidth: 0,
          circumference: 180,
          rotation: 270
        }]
      },
      options: {
        animation: { duration: 0 },
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Temperatura Ideal'
          },
          tooltip: {
            enabled: false
          }
        },
        cutout: '70%'
      }
    });
  }
}

// Actualizar gráfica de gauge
function updateGaugeChart(temp) {
  if (!gaugeChart) return;
  
  const idealTemp = TERRARIO_STANDARDS.temp_min + (TERRARIO_STANDARDS.temp_max - TERRARIO_STANDARDS.temp_min) / 2;
  const maxDeviation = 10; // Máxima desviación considerada (10°C)
  const deviation = Math.min(100, Math.abs(temp - idealTemp) / maxDeviation * 100);
  const idealPercentage = Math.max(0, 100 - deviation);
  
  gaugeChart.data.datasets[0].data = [idealPercentage, 100 - idealPercentage];
  
  // Cambiar color según la desviación
  if (deviation < 20) {
    gaugeChart.data.datasets[0].backgroundColor[0] = '#2E8B57'; // Verde (óptimo)
  } else if (deviation < 40) {
    gaugeChart.data.datasets[0].backgroundColor[0] = '#ffc107'; // Amarillo (advertencia)
  } else {
    gaugeChart.data.datasets[0].backgroundColor[0] = '#dc3545'; // Rojo (peligro)
  }
  
  gaugeChart.update();
}

async function refreshMonitor() {
  if (!currentTerrarioId) return;
  
  try {
    const terrario = await getTerrario(currentTerrarioId);
    document.getElementById('terrario-name').textContent = `Monitoreo: ${terrario.nombre}`;
    
    // Datos de ambiente recientes
    const ambRecent = getRecentDeviceData(terrario, 'sensorAmbiente', 10);
    const ambChron = ambRecent.slice().reverse(); // chronological ascending
    const labels = ambChron.map(a => formatDateSafe(a.fecha));
    const temps = ambChron.map(a => Number(a.temperatura || 0));
    const hums  = ambChron.map(a => Number(a.humedad || 0));

    // Actualizar gráfica de temperatura/humedad
    tempChart.data.labels = labels;
    tempChart.data.datasets[0].data = temps;
    tempChart.data.datasets[1].data = hums;
    tempChart.update();
    
    // Actualizar gráfica de gauge con la temperatura actual
    if (temps.length > 0) {
      updateGaugeChart(temps[temps.length - 1]);
    }

    // Para actuables: obtener últimos 10 registros para cada dispositivo
    const humList = getRecentDeviceData(terrario, 'humidificador', 10);
    const lampList = getRecentDeviceData(terrario, 'lamparaUV', 10);
    
    // Combinar y ordenar por fecha
    const allActuables = [
      ...humList.map(item => ({...item, type: 'humidificador'})),
      ...lampList.map(item => ({...item, type: 'lamparaUV'}))
    ].sort((a, b) => {
      const dateA = new Date(a.fecha || a.ultimaEncendido || a.ultimaApagado || '');
      const dateB = new Date(b.fecha || b.ultimaEncendido || b.ultimaApagado || '');
      return dateA - dateB;
    }).slice(-10); // Obtener últimos 10

    // Preparar datos para gráfica
    const actLabels = allActuables.map(item => 
      formatDateSafe(item.fecha || item.ultimaEncendido || item.ultimaApagado || '')
    );
    
    const humData = allActuables.map(item => 
      item.type === 'humidificador' ? (item.encendido ? 1 : 0) : null
    );
    
    const lampData = allActuables.map(item => 
      item.type === 'lamparaUV' ? (item.encendido ? 1 : 0) : null
    );

    // Actualizar gráfica de estado
    statusChart.data.labels = actLabels;
    statusChart.data.datasets[0].data = humData;
    statusChart.data.datasets[1].data = lampData;
    statusChart.update();

    // Mostrar logs en paneles laterales
    renderListToDiv('log-hum', humList, 'humidificador');
    renderListToDiv('log-lamp', lampList, 'lamparaUV');
    renderListToDiv('log-amb', ambRecent, 'sensorAmbiente');

  } catch (e) {
    console.error('Error en refreshMonitor:', e);
  }
}

function renderListToDiv(divId, list, key) {
  const div = document.getElementById(divId);
  div.innerHTML = '';
  
  if (!list || list.length === 0) { 
    div.innerHTML = '<div class="small text-muted p-2">Sin registros disponibles</div>'; 
    return; 
  }
  
  const ul = document.createElement('ul'); 
  ul.className = 'list-group list-group-flush';
  
  for (const item of list.slice(0, 5)) {
    let info = '';
    let statusClass = '';
    
    if (key === 'sensorAmbiente') {
      info = `Temp: ${item.temperatura || '--'} °C, Hum: ${item.humedad || '--'} %`;
      statusClass = 'primary';
    } else {
      info = item.encendido ? 'Encendido' : 'Apagado';
      statusClass = item.encendido ? 'success' : 'secondary';
    }
    
    const date = item.fecha || item.ultimaEncendido || item.ultimaApagado || '';
    
    const li = document.createElement('li');
    li.className = 'list-group-item bg-transparent';
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <span class="badge bg-${statusClass}">${info}</span>
        <small class="text-muted">${formatDateSafe(date)}</small>
      </div>
    `;
    
    ul.appendChild(li);
  }
  
  div.appendChild(ul);
}

document.addEventListener('DOMContentLoaded', async () => {
  currentTerrarioId = getTerrarioIdFromURL();
  
  if (!currentTerrarioId) {
    document.getElementById('terrario-name').textContent = 'Selecciona un terrario desde la página principal';
    return;
  }
  
  try {
    const terrario = await getTerrario(currentTerrarioId);
    document.getElementById('terrario-name').textContent = `Monitoreo: ${terrario.nombre}`;
    
    createChartsIfNeeded();
    await refreshMonitor();
    if (poll) clearInterval(poll);
    poll = setInterval(refreshMonitor, 2000);
  } catch (error) {
    console.error('Error al cargar terrario:', error);
  }
});