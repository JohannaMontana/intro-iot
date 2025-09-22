// js/global-simulation.js - Simulación global para todos los terrarios
class GlobalSimulation {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    
    console.log('🌍 Iniciando simulación global...');
    this.isRunning = true;
    
    // Ejecutar inmediatamente
    await this.simulateAllTerrarios();
    
    // Programar cada 30 minutos (1800000 ms)
    this.intervalId = setInterval(() => {
      this.simulateAllTerrarios();
    }, 1800000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      console.log('⏹️ Simulación global detenida');
    }
  }

  async simulateAllTerrarios() {
    try {
      console.log('🔄 Simulando datos para todos los terrarios...');
      const terrarios = await getAllTerrarios();
      
      for (const terrario of terrarios) {
        if (terrario.estado) { // Solo terrarios activos
          await this.simulateTerrario(terrario.id);
        }
      }
      
      console.log('✅ Simulación global completada:', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('❌ Error en simulación global:', error);
    }
  }

  async simulateTerrario(terrarioId) {
    try {
      const terrario = await getTerrario(terrarioId);
      const latestSensor = getLatestDeviceData(terrario, 'sensorAmbiente');
      
      const newData = safeGenerateSensorData(
        latestSensor,
        getLatestDeviceData(terrario, 'lamparaUV')?.encendido || false,
        getLatestDeviceData(terrario, 'humidificador')?.encendido || false
      );
      
      await addSensorData(terrarioId, newData);
      return newData;
    } catch (error) {
      console.error(`❌ Error simulando terrario ${terrarioId}:`, error);
    }
  }
}

// Inicializar simulación global
const globalSimulation = new GlobalSimulation();

// Iniciar cuando la página cargue
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Iniciando simulación global automática');
  globalSimulation.start();
});

// Opcional: Detener cuando la página se cierre
window.addEventListener('beforeunload', () => {
  globalSimulation.stop();
});