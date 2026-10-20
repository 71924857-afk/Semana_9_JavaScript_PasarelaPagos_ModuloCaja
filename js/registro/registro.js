import { sql } from '../config/neon-config.js';

// Cálculo de tarifario del Caso 35
function calcularMontoTotal(toneladas, esMatpel) {
  const tarifaBase = 450;
  const toneladasExtra = Math.max(0, toneladas - 5);
  let subtotal = tarifaBase + (toneladasExtra * 80);
  if (esMatpel) subtotal *= 1.20;
  return subtotal;
}

function formatearSoles(monto) {
  return `S/ ${Number(monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  // ==========================================
  // 1. VALIDACIÓN DE PROTECCIÓN DE SESIÓN
  // ==========================================
  const usuarioGuardado = localStorage.getItem('usuario_logistica');

  if (!usuarioGuardado) {
    alert('Debes iniciar sesión para acceder al cotizador.');
    window.location.href = 'login.html';
    return;
  }

  // Manejo del botón de cerrar sesión
  const btnCerrarSesion = document.getElementById('btn-cerrar-sesion') || document.querySelector('.btn-danger');
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('usuario_logistica');
      window.location.href = 'login.html';
    });
  }

  // ==========================================
  // 2. REFERENCIAS A ELEMENTOS Y EVENTOS UI
  // ==========================================
  const formRegistro = document.getElementById('form-registro');
  const tablaEnvios = document.getElementById('tabla-envios');
  const mensajeEl = document.getElementById('mensaje');

  const inputToneladas = document.getElementById('toneladas');
  const inputMatpel = document.getElementById('matpel');
  const outputMonto = document.getElementById('monto-estimado');

  // Verificar si viene el parámetro 'matpel=true' en la URL desde index.html
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('matpel') === 'true' && inputMatpel) {
    inputMatpel.checked = true;
  }

  function actualizarCalculo() {
    if (!inputToneladas || !outputMonto) return;
    const ton = parseFloat(inputToneladas.value) || 0;
    const mat = inputMatpel ? inputMatpel.checked : false;
    const total = calcularMontoTotal(ton, mat);
    outputMonto.textContent = formatearSoles(total);
  }

  if (inputToneladas) inputToneladas.addEventListener('input', actualizarCalculo);
  if (inputMatpel) inputMatpel.addEventListener('change', actualizarCalculo);

  await cargarTabla();

  // ==========================================
  // 3. ENVÍO DE REGISTRO A NEON DB
  // ==========================================
  if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
      e.preventDefault();

      const ton = parseFloat(inputToneladas.value);
      const mat = inputMatpel ? inputMatpel.checked : false;

      if (isNaN(ton) || ton <= 0) {
        alert('Ingresa una cantidad de toneladas válida.');
        return;
      }

      if (mensajeEl) {
        mensajeEl.style.color = '#38bdf8';
        mensajeEl.textContent = 'Guardando cotización en Neon DB...';
      }

      try {
        const montoCalculado = calcularMontoTotal(ton, mat);

        await sql`
          INSERT INTO cotizaciones_carga (toneladas, matpel, monto_calculado, estado_pago)
          VALUES (${ton}, ${mat}, ${montoCalculado}, 'pendiente');
        `;

        if (mensajeEl) {
          mensajeEl.style.color = '#4ade80';
          mensajeEl.textContent = `¡Cotización de ${ton}t por ${formatearSoles(montoCalculado)} guardada con éxito!`;
        }

        formRegistro.reset();
        actualizarCalculo();
        await cargarTabla();

      } catch (err) {
        console.error('Error al insertar:', err);
        if (mensajeEl) {
          mensajeEl.style.color = '#f87171';
          mensajeEl.textContent = 'Error en base de datos: ' + err.message;
        }
      }
    });
  }

  // ==========================================
  // 4. CARGA DE REGISTROS DESDE NEON DB
  // ==========================================
  async function cargarTabla() {
    if (!tablaEnvios) return;

    try {
      const data = await sql`SELECT * FROM cotizaciones_carga ORDER BY id DESC;`;

      if (!data || data.length === 0) {
        tablaEnvios.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">
              No hay cotizaciones registradas aún.
            </td>
          </tr>
        `;
        return;
      }

      tablaEnvios.innerHTML = data.map(item => {
        const codigo = `COT-${String(item.id).padStart(4, '0')}`;
        const esMatpel = item.matpel === true || item.matpel === 'true';
        const monto = Number(item.monto_calculado) || 0;
        const esPagado = item.estado_pago === 'pagado';

        return `
          <tr>
            <td><strong>${codigo}</strong></td>
            <td>${item.toneladas} t</td>
            <td>
              <span style="color: ${esMatpel ? '#f87171' : '#cbd5e1'}; font-weight: bold;">
                ${esMatpel ? 'MATPEL (+20%)' : 'General'}
              </span>
            </td>
            <td><strong style="color: #4ade80;">${formatearSoles(monto)}</strong></td>
            <td>
              <span style="background: ${esPagado ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)'}; color: ${esPagado ? '#4ade80' : '#fde047'}; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.85rem; text-transform: uppercase;">
                ${item.estado_pago || 'pendiente'}
              </span>
            </td>
            <td>
              ${!esPagado ? `
                <a href="pasarela.html?id=${item.id}" style="background: #22c55e; color: #052e16; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: bold;">Pagar Online</a>
              ` : `
                <span style="color: #4ade80; font-weight: bold; font-size: 0.85rem;">✓ Habilitado Garita</span>
              `}
            </td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      console.error('Error al consultar tabla:', err);
    }
  }

  actualizarCalculo();
});