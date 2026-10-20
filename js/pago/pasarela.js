import { sql } from '../config/neon-config.js';

function formatearSoles(monto) {
  return `S/ ${Number(monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const contenedorDetalle = document.getElementById('detalle-cotizacion');
  if (!contenedorDetalle) return;

  const urlParams = new URLSearchParams(window.location.search);
  let idCotizacion = urlParams.get('id');

  // Si no hay ID en la URL (al entrar desde el menú), buscar la última cotización en Neon DB
  if (!idCotizacion) {
    try {
      // Priorizar la última pendiente de pago
      const pendientes = await sql`
        SELECT id FROM cotizaciones_carga 
        WHERE estado_pago = 'pendiente' OR estado_pago IS NULL 
        ORDER BY id DESC LIMIT 1;
      `;

      if (pendientes && pendientes.length > 0) {
        idCotizacion = pendientes[0].id;
      } else {
        // Si no hay pendientes, tomar la última registrada
        const ultimas = await sql`SELECT id FROM cotizaciones_carga ORDER BY id DESC LIMIT 1;`;
        if (ultimas && ultimas.length > 0) {
          idCotizacion = ultimas[0].id;
        }
      }
    } catch (e) {
      console.warn('Error al obtener cotización automática:', e);
    }
  }

  // Si la base de datos está totalmente vacía
  if (!idCotizacion) {
    contenedorDetalle.innerHTML = `
      <div style="background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; padding: 40px; text-align: center; color: #f8fafc;">
        <i class="fas fa-receipt" style="font-size: 3rem; color: #f97316; margin-bottom: 15px;"></i>
        <h2 style="margin: 0 0 10px 0;">No tienes cotizaciones registradas aún</h2>
        <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 20px;">Crea una cotización en el cotizador antes de realizar el pago.</p>
        <a href="registro.html" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">
          <i class="fas fa-plus"></i> Ir al Cotizador
        </a>
      </div>
    `;
    return;
  }

  try {
    const resultados = await sql`SELECT * FROM cotizaciones_carga WHERE id = ${idCotizacion};`;

    if (!resultados || resultados.length === 0) {
      contenedorDetalle.innerHTML = `
        <div style="text-align: center; padding: 40px; background: rgba(30, 41, 59, 0.7); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); color: #f87171;">
          <i class="fas fa-triangle-exclamation" style="font-size: 3rem; margin-bottom: 15px;"></i>
          <h2>Cotización no encontrada en la base de datos</h2>
          <a href="consulta.html" style="background: #f97316; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 15px; font-weight: bold;">Volver a Mis Envíos</a>
        </div>
      `;
      return;
    }

    const cotizacion = resultados[0];
    const codigo = `COT-${String(cotizacion.id).padStart(4, '0')}`;
    const toneladas = cotizacion.toneladas || 0;
    const esMatpel = cotizacion.matpel === true || cotizacion.matpel === 'true';
    const monto = Number(cotizacion.monto_calculado) || 0;
    const estadoPago = cotizacion.estado_pago || 'pendiente';

    contenedorDetalle.innerHTML = `
      <div style="background: linear-gradient(145deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95)); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 20px; padding: 35px; backdrop-filter: blur(12px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
        
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 20px;">
          <div style="width: 55px; height: 55px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; box-shadow: 0 8px 20px rgba(34, 197, 94, 0.3);">
            <i class="fas fa-credit-card" style="font-size: 1.5rem; color: #ffffff;"></i>
          </div>
          <h2 style="color: #ffffff; margin: 0; font-size: 1.6rem; font-weight: 800;">Pasarela de Pago Online</h2>
          <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 6px;">Confirms los datos de tu carga para autorizar el pago</p>
        </div>

        <!-- Resumen de la Carga -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.9rem;">
            <div>
              <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 700; display: block;">CÓDIGO:</span>
              <strong style="color: #ffffff; font-size: 1.05rem;"><i class="fas fa-barcode" style="color: #f97316;"></i> ${codigo}</strong>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 700; display: block;">PESO CARGA:</span>
              <strong style="color: #ffffff; font-size: 1.05rem;">${toneladas} Toneladas</strong>
            </div>
            <div style="grid-column: span 2;">
              <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 700; display: block;">TIPO CARGA:</span>
              <strong style="color: ${esMatpel ? '#f87171' : '#cbd5e1'}; font-size: 0.95rem;">
                ${esMatpel ? '<i class="fas fa-biohazard"></i> Carga Peligrosa (MATPEL +20%)' : 'Carga General'}
              </strong>
            </div>
          </div>

          <hr style="margin: 15px 0; border: 0; border-top: 1px solid rgba(255,255,255,0.08);">
          
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #94a3b8; font-weight: 700; font-size: 0.9rem;">TOTAL A PAGAR:</span>
            <strong style="color: #4ade80; font-size: 1.5rem; font-weight: 800;">${formatearSoles(monto)}</strong>
          </div>
        </div>

        ${estadoPago === 'pagado' ? `
          <div style="text-align: center; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; padding: 20px; border-radius: 12px; font-weight: 700;">
            <i class="fas fa-circle-check" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
            ¡Esta cotización ya fue pagada con éxito y cuenta con autorización en Garita!
            <div style="margin-top: 18px;">
              <a href="consulta.html" style="background: #22c55e; color: #052e16; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 800; display: inline-block;">
                Volver a Mis Envíos
              </a>
            </div>
          </div>
        ` : `
          <form id="form-pago-online" style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #cbd5e1; margin-bottom: 6px; text-transform: uppercase;">Titular de la Tarjeta</label>
              <div style="position: relative;">
                <i class="fas fa-user" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748b;"></i>
                <input type="text" id="titular" placeholder="Juan Pérez" required style="width: 100%; box-sizing: border-box; padding: 12px 14px 12px 40px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; outline: none;">
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #cbd5e1; margin-bottom: 6px; text-transform: uppercase;">Número de Tarjeta</label>
              <div style="position: relative;">
                <i class="fas fa-credit-card" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748b;"></i>
                <input type="text" id="tarjeta" placeholder="4557 **** **** 8899" maxlength="16" required style="width: 100%; box-sizing: border-box; padding: 12px 14px 12px 40px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; outline: none;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #cbd5e1; margin-bottom: 6px; text-transform: uppercase;">Vencimiento</label>
                <input type="text" placeholder="MM/AA" maxlength="5" required style="width: 100%; box-sizing: border-box; padding: 12px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; outline: none; text-align: center;">
              </div>
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #cbd5e1; margin-bottom: 6px; text-transform: uppercase;">CVV</label>
                <input type="password" placeholder="123" maxlength="3" required style="width: 100%; box-sizing: border-box; padding: 12px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #ffffff; outline: none; text-align: center;">
              </div>
            </div>

            <button type="submit" id="btn-pagar" style="margin-top: 10px; background: linear-gradient(135deg, #22c55e, #16a34a); color: #052e16; padding: 14px; border: none; border-radius: 10px; font-weight: 800; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 20px rgba(34, 197, 94, 0.3);">
              <i class="fas fa-lock"></i> Confirmar y Pagar ${formatearSoles(monto)}
            </button>
          </form>
          <p id="mensaje-pago" style="text-align: center; font-weight: 700; margin-top: 15px; min-height: 20px;"></p>
        `}
      </div>
    `;

    // Manejar evento de confirmación de pago
    const formPago = document.getElementById('form-pago-online');
    if (formPago) {
      formPago.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('mensaje-pago');
        const btn = document.getElementById('btn-pagar');

        btn.disabled = true;
        btn.textContent = 'Procesando pago en línea...';
        if (msg) {
          msg.style.color = '#38bdf8';
          msg.textContent = 'Verificando datos de tarjeta con el banco...';
        }

        try {
          await sql`
            UPDATE cotizaciones_carga 
            SET estado_pago = 'pagado', canal_pago = 'Pasarela Online' 
            WHERE id = ${idCotizacion};
          `;

          if (msg) {
            msg.style.color = '#4ade80';
            msg.textContent = '¡Pago procesado con éxito! Redirigiendo a tus envíos...';
          }

          setTimeout(() => {
            window.location.href = 'consulta.html';
          }, 1500);

        } catch (err) {
          console.error('Error al procesar el pago:', err);
          btn.disabled = false;
          btn.textContent = `Confirmar y Pagar ${formatearSoles(monto)}`;
          if (msg) {
            msg.style.color = '#f87171';
            msg.textContent = 'Error al actualizar el pago en la base de datos.';
          }
        }
      });
    }

  } catch (error) {
    console.error('Error al cargar detalle:', error);
    if (contenedorDetalle) {
      contenedorDetalle.innerHTML = '<p style="text-align: center; color: #f87171;">Error al consultar la cotización en Neon DB.</p>';
    }
  }
});