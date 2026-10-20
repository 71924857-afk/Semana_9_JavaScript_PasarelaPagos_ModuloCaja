import { sql } from '../config/neon-config.js';
import { verificarSesionProtegida } from '../auth/auth.js';

const usuarioSesion = verificarSesionProtegida();
const urlParams = new URLSearchParams(window.location.search);
const idEnvio = urlParams.get('id');

const formActualizar = document.getElementById('form-actualizar');
const mensajeEl = document.getElementById('mensaje');

async function cargarDatosEnvio() {
  if (!idEnvio || !usuarioSesion) {
    if (mensajeEl) {
      mensajeEl.style.color = '#dc2626';
      mensajeEl.textContent = 'ID de envío o sesión no válida.';
    }
    return;
  }

  try {
    let registros = [];

    // Intento multi-tabla para obtener el registro por su ID principal
    try {
      registros = await sql`SELECT * FROM cotizaciones_carga WHERE id = ${idEnvio};`;
    } catch (e1) {
      try {
        registros = await sql`SELECT * FROM envíos WHERE id = ${idEnvio};`;
      } catch (e2) {
        registros = await sql`SELECT * FROM envios WHERE id = ${idEnvio};`;
      }
    }

    if (!registros || registros.length === 0) {
      if (mensajeEl) {
        mensajeEl.style.color = '#dc2626';
        mensajeEl.textContent = 'Registro no encontrado.';
      }
      return;
    }

    const envio = registros[0];

    // Autocompletar inputs del formulario
    const inputDestinatario = document.getElementById('destinatario');
    const inputDestino = document.getElementById('destino');
    const inputPeso = document.getElementById('peso');

    if (inputDestinatario) inputDestinatario.value = envio.destinatario || '';
    if (inputDestino) inputDestino.value = envio.destino || '';
    if (inputPeso) inputPeso.value = envio.peso !== null && envio.peso !== undefined ? envio.peso : '';

    // Si el estado no permite edición
    const estadoMin = String(envio.estado || '').toLowerCase();
    if (estadoMin === 'atendido' || estadoMin === 'entregado' || estadoMin === 'en tránsito' || estadoMin === 'en transito') {
      if (mensajeEl) {
        mensajeEl.style.color = '#f59e0b';
        mensajeEl.textContent = 'Este envío está en proceso/completado. Solo lectura.';
      }
    }

  } catch (error) {
    console.error('Error al cargar datos desde Neon:', error);
    if (mensajeEl) {
      mensajeEl.style.color = '#dc2626';
      mensajeEl.textContent = 'Error al conectar con la base de datos.';
    }
  }
}

if (formActualizar) {
  formActualizar.addEventListener('submit', async (e) => {
    e.preventDefault();

    const destinatario = document.getElementById('destinatario').value.trim();
    const destino = document.getElementById('destino').value.trim();
    const peso = parseFloat(document.getElementById('peso').value);

    if (mensajeEl) {
      mensajeEl.style.color = '#2563eb';
      mensajeEl.textContent = 'Guardando cambios...';
    }

    try {
      // Intentar actualización según la tabla disponible
      try {
        await sql`
          UPDATE cotizaciones_carga 
          SET destinatario = ${destinatario}, destino = ${destino}, peso = ${peso}
          WHERE id = ${idEnvio};
        `;
      } catch (e1) {
        try {
          await sql`
            UPDATE envíos 
            SET destinatario = ${destinatario}, destino = ${destino}, peso = ${peso}
            WHERE id = ${idEnvio};
          `;
        } catch (e2) {
          await sql`
            UPDATE envios 
            SET destinatario = ${destinatario}, destino = ${destino}, peso = ${peso}
            WHERE id = ${idEnvio};
          `;
        }
      }

      if (mensajeEl) {
        mensajeEl.style.color = '#16a34a';
        mensajeEl.textContent = '¡Envío actualizado con éxito!';
      }

      setTimeout(() => {
        window.location.href = 'consulta.html';
      }, 1200);

    } catch (error) {
      console.error('Error al actualizar registro:', error);
      if (mensajeEl) {
        mensajeEl.style.color = '#dc2626';
        mensajeEl.textContent = 'Error al guardar los cambios en Neon.';
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', cargarDatosEnvio);