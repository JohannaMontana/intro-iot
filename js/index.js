// js/index.js - Corregido para edición y actualización en tiempo real
document.addEventListener('DOMContentLoaded', async () => {
  const terrariosContainer = document.getElementById('terrarios-container');
  const saveTerrarioBtn = document.getElementById('saveTerrarioBtn');
  const terrarioNombreInput = document.getElementById('terrarioNombre');
  const editTerrarioForm = document.getElementById('editTerrarioForm');
  
  let pollInterval = null;

  // Cargar y mostrar terrarios
  async function loadTerrarios() {
    try {
      terrariosContainer.innerHTML = `
        <div class="col-12 text-center">
          <div class="spinner-border text-success" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">Cargando terrarios...</p>
        </div>
      `;
      
      const terrarios = await getAllTerrarios();
      
      if (!terrarios || terrarios.length === 0) {
        terrariosContainer.innerHTML = `
          <div class="col-12 text-center py-5">
            <i class="bi bi-inbox display-1 text-muted"></i>
            <h4 class="mt-3 text-muted">No hay terrarios registrados</h4>
            <p class="text-muted">Comienza agregando tu primer terrario</p>
          </div>
        `;
        return;
      }
      
      renderTerrarios(terrarios);
      
    } catch (error) {
      console.error('Error al cargar terrarios:', error);
      terrariosContainer.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-exclamation-triangle display-1 text-danger"></i>
          <h4 class="mt-3 text-danger">Error al cargar los terrarios</h4>
          <p class="text-muted">Intenta recargar la página</p>
        </div>
      `;
    }
  }

  // Renderizar terrarios en el DOM
  function renderTerrarios(terrarios) {
    terrariosContainer.innerHTML = '';
    
    terrarios.forEach(terrario => {
      const latestSensor = getLatestDeviceData(terrario, 'sensorAmbiente');
      const latestLamp = getLatestDeviceData(terrario, 'lamparaUV');
      const latestHumidifier = getLatestDeviceData(terrario, 'humidificador');
      
      const temp = latestSensor ? latestSensor.temperatura : '--';
      const hum = latestSensor ? latestSensor.humedad : '--';
      const lampStatus = latestLamp ? latestLamp.encendido : false;
      const humidifierStatus = latestHumidifier ? latestHumidifier.encendido : false;
      
      // Usar el color personalizado o el predeterminado
      const cardColor = terrario.color || '#2E8B57';
      const cardAvatar = terrario.avatar || '🦎';
      
      const card = document.createElement('div');
      card.className = 'col-md-6 col-lg-4';
      card.innerHTML = `
        <div class="card terrario-card h-100" data-id="${terrario.id}" style="border-top: 4px solid ${cardColor}">
          <span class="status-badge badge ${terrario.estado ? 'bg-success' : 'bg-secondary'}">
            ${terrario.estado ? 'Activo' : 'Inactivo'}
          </span>
          <div class="card-body p-4">
            <div class="d-flex align-items-center mb-2">
              <span class="display-6 me-2">${cardAvatar}</span>
              <h5 class="card-title mb-0">${terrario.nombre}</h5>
            </div>
           ${terrario.especie && terrario.especie !== 'otro' ? `<p class="text-muted small">Especie: ${getEspecieDisplayName(terrario.especie)}</p>` : ''}
            
            <div class="device-status">
              <div>
                <i class="bi bi-thermometer-half device-icon"></i>
                <span>${temp}°C</span>
              </div>
              <div>
                <i class="bi bi-droplet-half device-icon"></i>
                <span>${hum}%</span>
              </div>
            </div>
            
            <div class="mt-3">
              <div class="d-flex justify-content-between small mb-1">
                <span>Temperatura</span>
                <span>${temp}°C</span>
              </div>
              <div class="progress">
                <div class="progress-bar bg-danger" role="progressbar" 
                  style="width: ${Math.min(100, (temp/40)*100)}%" 
                  aria-valuenow="${temp}" aria-valuemin="0" aria-valuemax="40"></div>
              </div>
              
              <div class="d-flex justify-content-between small mb-1 mt-2">
                <span>Humedad</span>
                <span>${hum}%</span>
              </div>
              <div class="progress">
                <div class="progress-bar bg-info" role="progressbar" 
                  style="width: ${hum}%" 
                  aria-valuenow="${hum}" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
            </div>
            
            <div class="device-status mt-3">
              <div>
                <i class="bi bi-lightbulb${lampStatus ? '-fill' : ''} device-icon ${lampStatus ? 'text-warning' : 'text-muted'}"></i>
                <small>Luz ${lampStatus ? 'ON' : 'OFF'}</small>
              </div>
              <div>
                <i class="bi bi-droplet${humidifierStatus ? '-fill' : ''} device-icon ${humidifierStatus ? 'text-info' : 'text-muted'}"></i>
                <small>Hum. ${humidifierStatus ? 'ON' : 'OFF'}</small>
              </div>
            </div>
            
            <div class="terrario-actions mt-3 d-flex gap-2">
              <a href="control.html?terrario=${terrario.id}" class="btn btn-sm btn-terrario flex-fill">
                <i class="bi bi-controller"></i> Control
              </a>
              <a href="monitor.html?terrario=${terrario.id}" class="btn btn-sm btn-terrario-outline flex-fill">
                <i class="bi bi-graph-up"></i> Monitoreo
              </a>
              <a href="historial.html?terrario=${terrario.id}" class="btn btn-sm btn-terrario-outline flex-fill">
                <i class="bi bi-clock-history"></i> Historial
              </a>
            </div>
          </div>
          <div class="card-footer bg-transparent d-flex justify-content-between">
            <small class="text-muted">Actualizado: ${formatDateSafe(terrario.fecha)}</small>
            <div>
              <button class="btn btn-sm btn-outline-primary btn-edit-terrario" data-id="${terrario.id}">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger btn-delete-terrario" data-id="${terrario.id}">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
      
      terrariosContainer.appendChild(card);
    });

    // Función para obtener el nombre display de la especie
function getEspecieDisplayName(especieValue) {
  if (!especieValue) return '';
  
  const especies = {
    'gecko': 'Gecko Leopardo',
    'serpiente': 'Serpiente',
    'tortuga': 'Tortuga', 
    'iguana': 'Iguana',
    'camaleon': 'Camaleón',
    'otro': 'Otra especie'
  };
  
  return especies[especieValue] || especieValue;
}
    
    // Agregar event listeners para botones de editar
    document.querySelectorAll('.btn-edit-terrario').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        await openEditModal(id);
      });
    });
    
    // Agregar event listeners para botones de eliminar
    document.querySelectorAll('.btn-delete-terrario').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('¿Estás seguro de que quieres eliminar este terrario?')) {
          try {
            await deleteTerrario(id);
            await loadTerrarios();
          } catch (error) {
            console.error('Error al eliminar terrario:', error);
            alert('Error al eliminar el terrario');
          }
        }
      });
    });
  }

  // Abrir modal de edición
 // Abrir modal de edición
async function openEditModal(terrarioId) {
  try {
    const terrario = await getTerrario(terrarioId);
    
    // Llenar el formulario de edición
    document.getElementById('editTerrarioId').value = terrario.id;
    document.getElementById('editTerrarioNombre').value = terrario.nombre;
    document.getElementById('editTerrarioEstado').value = terrario.estado ? 'true' : 'false';
    
    // Seleccionar avatar actual
    if (terrario.avatar) {
      document.querySelector(`input[name="editTerrarioAvatar"][value="${terrario.avatar}"]`).checked = true;
    }
    
    // Seleccionar color actual
    if (terrario.color) {
      document.querySelector(`input[name="editTerrarioColor"][value="${terrario.color}"]`).checked = true;
    }
    
    // Cargar datos del sensor más reciente si existe
    const latestSensor = getLatestDeviceData(terrario, 'sensorAmbiente');
    if (latestSensor) {
      document.getElementById('editTerrarioTemp').value = latestSensor.temperatura || '';
      document.getElementById('editTerrarioHum').value = latestSensor.humedad || '';
    }
    
    const editModal = new bootstrap.Modal(document.getElementById('editTerrarioModal'));
    editModal.show();
  } catch (error) {
    console.error('Error al abrir modal de edición:', error);
    alert('Error al cargar los datos del terrario');
  }
}
  
  // Guardar nuevo terrario
  // En la función de guardar nuevo terrario, modificar:
saveTerrarioBtn.addEventListener('click', async () => {
  const nombre = terrarioNombreInput.value.trim();
  const avatar = document.querySelector('input[name="terrarioAvatar"]:checked').value;
  const color = document.querySelector('input[name="terrarioColor"]:checked').value;
  const especie = document.getElementById('terrarioEspecie').value;
  
  if (!nombre) {
    alert('Por favor ingresa un nombre para el terrario');
    return;
  }
  
  try {
    const nuevoTerrario = {
      nombre,
      avatar,
      color,
      especie,
      estado: false,
      // NO incluir sensorAmbiente aquí, dejar que postTerrario lo maneje
      fecha: new Date().toISOString()
    };
    
    await postTerrario(nuevoTerrario);
    
    // Cerrar modal y recargar lista
    const modal = bootstrap.Modal.getInstance(document.getElementById('addTerrarioModal'));
    modal.hide();
    terrarioNombreInput.value = '';
    
    await loadTerrarios();
  } catch (error) {
    console.error('Error al crear terrario:', error);
    alert('Error al crear el terrario');
  }
});
  
  // Guardar edición de terrario
 // Guardar edición de terrario
editTerrarioForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('editTerrarioId').value;
  const nombre = document.getElementById('editTerrarioNombre').value;
  const estado = document.getElementById('editTerrarioEstado').value === 'true';
  const avatar = document.querySelector('input[name="editTerrarioAvatar"]:checked').value;
  const color = document.querySelector('input[name="editTerrarioColor"]:checked').value;
  const temperatura = document.getElementById('editTerrarioTemp').value;
  const humedad = document.getElementById('editTerrarioHum').value;
  
  try {
    // Obtener el terrario actual
    const terrarioActual = await getTerrario(id);
    
    // Preparar datos actualizados
    const datosActualizados = {
      ...terrarioActual,
      nombre,
      avatar,
      color,
      estado,
      fecha: new Date().toISOString()
    };
    
    // Actualizar datos de sensor si se proporcionaron
    if (temperatura && humedad) {
      if (!datosActualizados.sensorAmbiente) datosActualizados.sensorAmbiente = [];
      datosActualizados.sensorAmbiente.unshift({
        temperatura: parseFloat(temperatura),
        humedad: parseFloat(humedad),
        activo: true,
        fecha: new Date().toISOString()
      });
    }
    
    // Enviar la actualización
    await putTerrario(id, datosActualizados);
    
    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editTerrarioModal'));
    modal.hide();
    
    // Recargar y mostrar mensaje
    await loadTerrarios();
    showTemporaryMessage('Terrario actualizado correctamente', 'success');
  } catch (error) {
    console.error('Error al actualizar terrario:', error);
    alert('Error al actualizar el terrario');
  }
});
  // Mostrar mensaje temporal
  function showTemporaryMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '1050';
    messageDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.classList.remove('show');
        setTimeout(() => messageDiv.remove(), 300);
      }
    }, 3000);
  }

  // Actualizar los terrarios automáticamente cada 2 segundos
  async function updateTerrariosPeriodically() {
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
      try {
        const terrarios = await getAllTerrarios();
        if (terrarios && terrarios.length > 0) {
          renderTerrarios(terrarios);
          
          // Mostrar indicador de actualización
          const indicator = document.getElementById('refresh-indicator');
          if (indicator) {
            indicator.classList.add('text-success');
            setTimeout(() => indicator.classList.remove('text-success'), 500);
          }
        }
      } catch (error) {
        console.error('Error en actualización automática:', error);
      }
    }, 1800000); // Actualizar cada 2 segundos
  }

  // Cargar terrarios al iniciar y comenzar actualización automática
  await loadTerrarios();
  await updateTerrariosPeriodically();


  // En index.js, después de await loadTerrarios();
await loadTerrarios();

// Escuchar eventos de actualización de simulación
window.addEventListener('terrariosUpdated', async () => {
  console.log('📢 Recibida actualización de simulación, actualizando vista...');
  await loadTerrarios();
});

// Actualizar automáticamente cada 30 segundos por si fallan los eventos
setInterval(async () => {
  await loadTerrarios();
}, 30000);
});