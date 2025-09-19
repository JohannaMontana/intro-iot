// js/historial.js - Historial completo de terrarios (Mejorado)
document.addEventListener('DOMContentLoaded', async () => {
  const selectTerrario = document.getElementById('selectTerrarioHistorial');
  const tablaHistorial = document.getElementById('tablaHistorial');
  const estadisticasContainer = document.getElementById('estadisticasContainer');
  const resumenContainer = document.getElementById('resumenContainer');
  const tituloHistorial = document.getElementById('tituloHistorial');
  const fechaInicio = document.getElementById('fechaInicio');
  const fechaFin = document.getElementById('fechaFin');

  let currentTerrarioId = null;
  let refreshInterval = null;
  let allTerrarios = [];
  let todosLosDatos = [];
  let mostrandoCompleto = false;

  // Obtener ID del terrario desde la URL
  function getTerrarioIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('terrario');
  }

  // Cargar terrarios en el selector
  async function cargarTerrarios() {
    try {
      allTerrarios = await getAllTerrarios();
      
      selectTerrario.innerHTML = '<option value="">Terrario seleccionado...</option>';
      
      allTerrarios.forEach(terrario => {
        const option = document.createElement('option');
        option.value = terrario.id;
        option.textContent = `${terrario.nombre} (ID: ${terrario.id})`;
        option.selected = (terrario.id === currentTerrarioId);
        selectTerrario.appendChild(option);
      });

      // Si hay un terrario en la URL, cargarlo automáticamente y bloquear selector
      if (currentTerrarioId) {
        selectTerrario.value = currentTerrarioId;
        selectTerrario.disabled = true; // Bloquear selector
        await cargarHistorial(currentTerrarioId);
      }
    } catch (error) {
      console.error('Error al cargar terrarios:', error);
      selectTerrario.innerHTML = '<option value="">Error al cargar terrarios</option>';
    }
  }

  // Agregar botón para ver más/menos
  function agregarBotonVerMas() {
    // Eliminar botón anterior si existe
    const existingButton = document.getElementById('verMasButton');
    if (existingButton) {
      existingButton.remove();
    }
    
    if (todosLosDatos.length > 10) {
      const button = document.createElement('button');
      button.id = 'verMasButton';
      button.className = 'btn btn-success btn-sm mt-3';
      button.innerHTML = mostrandoCompleto 
        ? '<i class="bi bi-chevron-double-up"></i> Ver menos (10 más recientes)' 
        : '<i class="bi bi-chevron-double-down"></i> Ver más (mostrar todo)';
      
      button.addEventListener('click', () => {
        mostrandoCompleto = !mostrandoCompleto;
        mostrarDatosEnTabla(mostrandoCompleto ? todosLosDatos : todosLosDatos.slice(0, 10));
        agregarBotonVerMas();
      });
      
      tablaHistorial.parentNode.appendChild(button);
    }
  }

  // Cargar historial de un terrario
  async function cargarHistorial(terrarioId) {
    try {
      const terrario = await getTerrario(terrarioId);
      currentTerrarioId = terrarioId;
      mostrandoCompleto = false;
      
      // Actualizar título
      tituloHistorial.textContent = `Historial: ${terrario.nombre}`;
      
      // Procesar datos para la tabla
      todosLosDatos = [];
      
      // Datos de sensor
      if (terrario.sensorAmbiente && terrario.sensorAmbiente.length > 0) {
        terrario.sensorAmbiente.forEach(sensor => {
          todosLosDatos.push({
            fecha: sensor.fecha,
            tipo: 'sensor',
            temperatura: sensor.temperatura,
            humedad: sensor.humedad,
            lamp: null,
            humidifier: null
          });
        });
      }
      
      // Datos de lámpara
      if (terrario.lamparaUV && terrario.lamparaUV.length > 0) {
        terrario.lamparaUV.forEach(lamp => {
          todosLosDatos.push({
            fecha: lamp.fecha,
            tipo: 'lamp',
            temperatura: null,
            humedad: null,
            lamp: lamp.encendido,
            humidifier: null
          });
        });
      }
      
      // Datos de humidificador
      if (terrario.humidificador && terrario.humidificador.length > 0) {
        terrario.humidificador.forEach(hum => {
          todosLosDatos.push({
            fecha: hum.fecha,
            tipo: 'humidifier',
            temperatura: null,
            humedad: null,
            lamp: null,
            humidifier: hum.encendido
          });
        });
      }
      
      // Ordenar por fecha (más reciente primero)
      todosLosDatos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      
      // Mostrar solo los 10 más recientes inicialmente
      const datosParaMostrar = todosLosDatos.length > 10 ? todosLosDatos.slice(0, 10) : todosLosDatos;
      
      // Mostrar en tabla
      mostrarDatosEnTabla(datosParaMostrar);
      
      // Agregar botón "Ver más" si hay más de 10 registros
      agregarBotonVerMas();
      
      // Mostrar estadísticas
      mostrarEstadisticas(terrario);
      
      // Mostrar resumen
      mostrarResumen(terrario);

      // Iniciar actualización automática
      iniciarActualizacionAutomatica();
      
    } catch (error) {
      console.error('Error al cargar historial:', error);
      const tbody = tablaHistorial.querySelector('tbody');
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Error al cargar el historial</td></tr>';
    }
  }

  // Iniciar actualización automática
  function iniciarActualizacionAutomatica() {
    // Limpiar intervalo anterior
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    // Crear nuevo intervalo
    refreshInterval = setInterval(async () => {
      if (currentTerrarioId) {
        try {
          // Efecto visual de actualización
          const tabla = document.querySelector('#tablaHistorial');
          const badge = document.getElementById('historyUpdateBadge');
          
          tabla.classList.add('updating');
          badge.classList.remove('bg-success');
          badge.classList.add('bg-primary');
          
          // Recargar datos
          await cargarHistorial(currentTerrarioId);
          
          // Restaurar apariencia
          setTimeout(() => {
            tabla.classList.remove('updating');
            badge.classList.remove('bg-primary');
            badge.classList.add('bg-success');
          }, 300);
        } catch (error) {
          console.error('Error en actualización automática:', error);
        }
      }
    }, 2000); // Actualizar cada 2 segundos
  }

  // Mostrar datos en tabla con badges de Bootstrap
  function mostrarDatosEnTabla(datos) {
    const tbody = tablaHistorial.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (datos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay datos históricos</td></tr>';
      return;
    }
    
    datos.forEach(dato => {
      const row = document.createElement('tr');
      
      let lampStatus = '<span class="badge bg-secondary">─</span>';
      let humidifierStatus = '<span class="badge bg-secondary">─</span>';
      
      if (dato.lamp !== null) {
        lampStatus = dato.lamp 
          ? '<span class="badge bg-success"><i class="bi bi-power"></i> ENCENDIDO</span>' 
          : '<span class="badge bg-danger"><i class="bi bi-power"></i> APAGADO</span>';
      }
      
      if (dato.humidifier !== null) {
        humidifierStatus = dato.humidifier 
          ? '<span class="badge bg-success"><i class="bi bi-power"></i> ENCENDIDO</span>' 
          : '<span class="badge bg-danger"><i class="bi bi-power"></i> APAGADO</span>';
      }
      
      row.innerHTML = `
        <td>${formatDateSafe(dato.fecha)}</td>
        <td>${dato.temperatura || '─'}°C</td>
        <td>${dato.humedad || '─'}%</td>
        <td>${lampStatus}</td>
        <td>${humidifierStatus}</td>
      `;
      
      tbody.appendChild(row);
    });
  }

  // Mostrar estadísticas
  function mostrarEstadisticas(terrario) {
    if (!terrario.sensorAmbiente || terrario.sensorAmbiente.length === 0) {
      estadisticasContainer.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-thermometer display-4"></i>
          <p class="mt-2">No hay datos de sensor para estadísticas</p>
        </div>
      `;
      return;
    }
    
    const temps = terrario.sensorAmbiente.map(s => parseFloat(s.temperatura)).filter(t => !isNaN(t));
    const hums = terrario.sensorAmbiente.map(s => parseFloat(s.humedad)).filter(h => !isNaN(h));
    
    const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '─';
    const avgHum = hums.length ? (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1) : '─';
    const maxTemp = temps.length ? Math.max(...temps).toFixed(1) : '─';
    const minTemp = temps.length ? Math.min(...temps).toFixed(1) : '─';
    
    estadisticasContainer.innerHTML = `
      <div class="row text-center">
        <div class="col-6 mb-3">
          <div class="stat-card p-3">
            <i class="bi bi-thermometer-snow stat-icon text-primary fs-1"></i>
            <h6>Temp. Mínima</h6>
            <h4 class="text-primary">${minTemp}°C</h4>
          </div>
        </div>
        <div class="col-6 mb-3">
          <div class="stat-card p-3">
            <i class="bi bi-thermometer-sun stat-icon text-danger fs-1"></i>
            <h6>Temp. Máxima</h6>
            <h4 class="text-danger">${maxTemp}°C</h4>
          </div>
        </div>
        <div class="col-6">
          <div class="stat-card p-3">
            <i class="bi bi-thermometer-half stat-icon text-warning fs-1"></i>
            <h6>Temp. Promedio</h6>
            <h4 class="text-warning">${avgTemp}°C</h4>
          </div>
        </div>
        <div class="col-6">
          <div class="stat-card p-3">
            <i class="bi bi-droplet-half stat-icon text-info fs-1"></i>
            <h6>Hum. Promedio</h6>
            <h4 class="text-info">${avgHum}%</h4>
          </div>
        </div>
      </div>
    `;
  }

  // Mostrar resumen de actividad
  function mostrarResumen(terrario) {
    let lampOnCount = 0;
    let humidifierOnCount = 0;
    let totalReadings = 0;
    
    if (terrario.lamparaUV) {
      lampOnCount = terrario.lamparaUV.filter(lamp => lamp.encendido).length;
    }
    
    if (terrario.humidificador) {
      humidifierOnCount = terrario.humidificador.filter(hum => hum.encendido).length;
    }
    
    if (terrario.sensorAmbiente) {
      totalReadings = terrario.sensorAmbiente.length;
    }
    
    resumenContainer.innerHTML = `
      <div class="activity-summary">
        <div class="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
          <span class="d-flex align-items-center">
            <i class="bi bi-clipboard-data me-2 text-primary"></i>
            Total de lecturas:
          </span>
          <span class="badge bg-primary fs-6">${totalReadings}</span>
        </div>
        <div class="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
          <span class="d-flex align-items-center">
            <i class="bi bi-lightbulb me-2 text-warning"></i>
            Lámpara encendida:
          </span>
          <span class="badge bg-warning text-dark fs-6">${lampOnCount} veces</span>
        </div>
        <div class="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
          <span class="d-flex align-items-center">
            <i class="bi bi-droplet me-2 text-info"></i>
            Humidificador activo:
          </span>
          <span class="badge bg-info fs-6">${humidifierOnCount} veces</span>
        </div>
        <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded">
          <span class="d-flex align-items-center">
            <i class="bi bi-clock me-2 text-success"></i>
            Última actualización:
          </span>
          <span class="badge bg-success fs-6">${formatDateSafe(terrario.fecha)}</span>
        </div>
      </div>
    `;
  }

  // Event listeners
  selectTerrario.addEventListener('change', (e) => {
    if (e.target.value) {
      // Actualizar URL con el nuevo terrario
      const url = new URL(window.location);
      url.searchParams.set('terrario', e.target.value);
      window.history.replaceState({}, '', url);
      
      currentTerrarioId = e.target.value;
      cargarHistorial(e.target.value);
    }
  });

  // Obtener terrario de la URL
  currentTerrarioId = getTerrarioIdFromURL();

  // Inicializar fechas con rango por defecto (últimos 7 días)
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  fechaInicio.value = sevenDaysAgo.toISOString().split('T')[0];
  fechaFin.value = today.toISOString().split('T')[0];

  // Cargar terrarios al iniciar
  await cargarTerrarios();
});