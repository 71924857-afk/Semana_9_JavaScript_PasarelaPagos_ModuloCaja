import { sql } from '../config/neon-config.js';
import { verificarSesionProtegida, cerrarSesion } from '../auth/auth.js';

// 1. Verificación de sesión
const usuarioSesion = verificarSesionProtegida();

// Si un cliente intenta entrar al panel, lo redirigimos a su vista de consulta
if (usuarioSesion && usuarioSesion.rol === 'cliente') {
  window.location.href = 'consulta.html';
}

if (usuarioSesion) {
  const infoEl = document.getElementById('info-usuario');
  if (infoEl) {
    infoEl.innerHTML = `
      <span>Usuario: <strong>${usuarioSesion.nombre || 'Usuario'}</strong> | Rol: <strong>${usuarioSesion.rol || 'Admin'}</strong></span>
    `;
  }
}

// Evento Cerrar Sesión
const btnCerrar = document.getElementById('btn-cerrar-sesion');
if (btnCerrar) {
  btnCerrar.addEventListener('click', () => cerrarSesion());
}

function generarCodigo() {
  return 'LMX-' + Math.floor(1000 + Math.random() * 9000);
}

// 2. Registrar envío presencial desde el Panel
const formEnvio = document.getElementById('form-envio');
const mensajeEl = document.getElementById('mensaje');

if (formEnvio) {
  formEnvio.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (mensajeEl) {
      mensajeEl.style.color = '#3b82f6';
      mensajeEl.textContent = 'Registrando envío...';
    }

    const destinatario = document.getElementById('destinatario').value;
    const destino = document.getElementById('destino').value;
    const peso = parseFloat(document.getElementById('peso').value);
    const codigo = generarCodigo();

    try {
      await sql`
        INSERT INTO envios (codigo, destinatario, destino, peso, estado)
        VALUES (${codigo}, ${destinatario}, ${destino}, ${peso}, 'En Preparación')
      `;

      if (mensajeEl) {
        mensajeEl.style.color = '#16a34a';
        mensajeEl.textContent = `¡Envío registrado con éxito! Código: ${codigo}`;
      }
      formEnvio.reset();
      cargarEnviosGlobales();
    } catch (error) {
      console.error('Error al registrar envío:', error);
      if (mensajeEl) {
        mensajeEl.style.color = '#dc2626';
        mensajeEl.textContent = 'Error al registrar el envío.';
      }
    }
  });
}

// 3. Cargar lista global (apuntando a la tabla 'envios')
async function cargarEnviosGlobales() {
  const tablaBody = document.getElementById('tabla-envios');
  if (!tablaBody) return;

  tablaBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando registros globales...</td></tr>';

  try {
    const envios = await sql`
      SELECT e.id, e.codigo, e.destinatario, e.destino, e.peso, e.estado, COALESCE(u.nombre, 'Ventanilla') as cliente
      FROM envios e
      LEFT JOIN usuarios u ON e.usuario_id = u.id
      ORDER BY e.id DESC;
    `;

    if (!envios || envios.length === 0) {
      tablaBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay registros en el sistema.</td></tr>';
      return;
    }

    tablaBody.innerHTML = envios.map(e => `
      <tr>
        <td><strong>${e.codigo || 'LMX-' + e.id}</strong></td>
        <td>${e.cliente}</td>
        <td>${e.destinatario}</td>
        <td>${e.destino}</td>
        <td>${e.peso} Kg</td>
        <td>
          <span style="
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 0.85rem; 
            font-weight: 600;
            background-color: ${obtenerColorEstado(e.estado)};
            color: white;">
            ${e.estado || 'En Preparación'}
          </span>
        </td>
        <td style="display: flex; gap: 6px; align-items: center;">
          <select onchange="window.cambiarEstado(${e.id}, this.value)" style="padding: 4px; border-radius: 4px;">
            <option value="">Estado...</option>
            <option value="En Preparación">En Preparación</option>
            <option value="En Tránsito">En Tránsito</option>
            <option value="Entregado">Entregado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
          <button onclick="window.eliminarEnvio(${e.id})" style="background:#dc2626; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:600;">
            Eliminar
          </button>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error al cargar la lista:', error);
    tablaBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error al cargar datos desde Neon.</td></tr>';
  }
}

function obtenerColorEstado(estado) {
  switch (estado) {
    case 'En Preparación': return '#f59e0b';
    case 'En Tránsito': return '#3b82f6';
    case 'Entregado': return '#16a34a';
    case 'Cancelado': return '#dc2626';
    default: return '#64748b';
  }
}

// 4. Cambiar Estado
window.cambiarEstado = async (id, nuevoEstado) => {
  if (!nuevoEstado) return;
  try {
    await sql`UPDATE envios SET estado = ${nuevoEstado} WHERE id = ${id}`;
    cargarEnviosGlobales();
  } catch (error) {
    alert('No se pudo actualizar el estado.');
  }
};

// 5. Eliminar Registro con Confirmación (Exigido en el PDF)
window.eliminarEnvio = async (id) => {
  if (confirm('¿Estás seguro de que deseas eliminar este registro permanentemente?')) {
    try {
      await sql`DELETE FROM envios WHERE id = ${id}`;
      cargarEnviosGlobales();
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar el registro.');
    }
  }
};

document.addEventListener('DOMContentLoaded', cargarEnviosGlobales);