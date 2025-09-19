// js/crud.js - Corregido para edición de terrarios
document.addEventListener('DOMContentLoaded', async () => {
  const terrariosContainer = document.getElementById('terrarios-container');
  const saveTerrarioBtn = document.getElementById('saveTerrarioBtn');
  const terrarioNombreInput = document.getElementById('terrarioNombre');
  const editTerrarioForm = document.getElementById('editTerrarioForm');
  
  let currentEditTerrario = null;

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
      
      terrariosContainer.innerHTML = '';
      
      terrarios.forEach(terrario => {
        const latestSensor = getLatestDeviceData(terrario, 'sensorAmbiente');
        const latestLamp = getLatestDeviceData(terrario, 'lamparaUV');
        const latestHumidifier = getLatestDeviceData(terrario, 'humidificador');
        
        const temp = latestSensor ? latestSensor.temperatura : '--';
        const hum = latestSensor ? latestSensor.humedad : '--';
        const lampStatus = latestLamp ? latestLamp.encendido : false;
        const humidifierStatus = latestHumidifier ? latestHumidifier.encendido : false;
        
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        card.innerHTML = `
          <div class="card terrario-card h-100">
            <span class="status-badge badge ${terrario.estado ? 'bg-success' : 'bg-secondary'}">
              ${terrario.estado ? 'Activo' : 'Inactivo'}
            </span>
            <div class="card-body p-4">
              <h5 class="card-title">${terrario.nombre}</h5>
              <p class="text-muted small">ID: ${terrario.id}</p>
              
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
  
  // Abrir modal de edición
  async function openEditModal(terrarioId) {
    try {
      currentEditTerrario = await getTerrario(terrarioId);
      
      document.getElementById('editTerrarioId').value = currentEditTerrario.id;
      document.getElementById('editTerrarioNombre').value = currentEditTerrario.nombre;
      document.getElementById('editTerrarioEstado').value = currentEditTerrario.estado ? 'true' : 'false';
      
      // Cargar datos de dispositivos si existen
      const latestSensor = getLatestDeviceData(currentEditTerrario, 'sensorAmbiente');
      const latestLamp = getLatestDeviceData(currentEditTerrario, 'lamparaUV');
      const latestHumidifier = getLatestDeviceData(currentEditTerrario, 'humidificador');
      
      if (latestSensor) {
        document.getElementById('editTerrarioTemp').value = latestSensor.temperatura || '';
        document.getElementById('editTerrarioHum').value = latestSensor.humedad || '';
        document.getElementById('sensor-fields').style.display = 'block';
      }
      
      if (latestLamp) {
        document.getElementById('editTerrarioLampEstado').value = latestLamp.encendido ? 'true' : 'false';
        document.getElementById('lamp-fields').style.display = 'block';
      }
      
      if (latestHumidifier) {
        document.getElementById('editTerrarioHumEstado').value = latestHumidifier.encendido ? 'true' : 'false';
        document.getElementById('humidifier-fields').style.display = 'block';
      }
      
      const editModal = new bootstrap.Modal(document.getElementById('editTerrarioModal'));
      editModal.show();
    } catch (error) {
      console.error('Error al abrir modal de edición:', error);
      alert('Error al cargar los datos del terrario');
    }
  }
  
  // Guardar nuevo terrario
  saveTerrarioBtn.addEventListener('click', async () => {
    const nombre = terrarioNombreInput.value.trim();
    
    if (!nombre) {
      alert('Por favor ingresa un nombre para el terrario');
      return;
    }
    
    try {
      const nuevoTerrario = {
        nombre,
        estado: false,
        sensorAmbiente: [generateSensorData()],
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
  editTerrarioForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('editTerrarioId').value;
    const nombre = document.getElementById('editTerrarioNombre').value;
    const estado = document.getElementById('editTerrarioEstado').value === 'true';
    const temperatura = document.getElementById('editTerrarioTemp').value;
    const humedad = document.getElementById('editTerrarioHum').value;
    const lampEstado = document.getElementById('editTerrarioLampEstado').value === 'true';
    const humEstado = document.getElementById('editTerrarioHumEstado').value === 'true';
    
    try {
      // Obtener el terrario actual primero
      const terrarioActual = await getTerrario(id);
      
      // Preparar datos actualizados
      const datosActualizados = {
        ...terrarioActual,
        nombre,
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
      
      // Actualizar datos de lámpara si se cambió el estado
      if (document.getElementById('lamp-fields').style.display === 'block') {
        if (!datosActualizados.lamparaUV) datosActualizados.lamparaUV = [];
        
        const ultimoEstado = datosActualizados.lamparaUV[0]?.encendido || false;
        if (ultimoEstado !== lampEstado) {
          datosActualizados.lamparaUV.unshift({
            encendido: lampEstado,
            ultimaEncendido: lampEstado ? new Date().toISOString() : (datosActualizados.lamparaUV[0]?.ultimaEncendido || null),
            ultimaApagado: !lampEstado ? new Date().toISOString() : (datosActualizados.lamparaUV[0]?.ultimaApagado || null),
            fecha: new Date().toISOString()
          });
        }
      }
      
      // Actualizar datos de humidificador si se cambió el estado
      if (document.getElementById('humidifier-fields').style.display === 'block') {
        if (!datosActualizados.humidificador) datosActualizados.humidificador = [];
        
        const ultimoEstado = datosActualizados.humidificador[0]?.encendido || false;
        if (ultimoEstado !== humEstado) {
          datosActualizados.humidificador.unshift({
            encendido: humEstado,
            ultimaEncendido: humEstado ? new Date().toISOString() : (datosActualizados.humidificador[0]?.ultimaEncendido || null),
            ultimaApagado: !humEstado ? new Date().toISOString() : (datosActualizados.humidificador[0]?.ultimaApagado || null),
            fecha: new Date().toISOString()
          });
        }
      }
      
      // Enviar la actualización
      await putTerrario(id, datosActualizados);
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('editTerrarioModal'));
      modal.hide();
      
      await loadTerrarios();
      alert('Terrario actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar terrario:', error);
      alert('Error al actualizar el terrario');
    }
  });
  
  // Cargar terrarios al iniciar
  await loadTerrarios();
});