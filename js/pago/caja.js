import { sql } from './config/neon-config.js';

function formatearSoles(monto) {
  return `S/ ${Number(monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const formCaja = document.getElementById('form-caja');
  const inputId = document.getElementById('id-cotizacion');
  const contenedorResultado = document.getElementById('resultado-caja');

  if (!formCaja) return;

  formCaja.addEventListener('submit', async (e) => {
    // Evita que la página se recargue o pestañee
    e.preventDefault();
    e.stopPropagation();

    if (!inputId || !contenedorResultado) return;

    let rawVal = inputId.value.trim().toUpperCase();
    let numId = rawVal.replace('COT-', '').replace(/^0+/, '');

    if (!numId || isNaN(numId)) {
      contenedorResultado.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 15px; border-radius: 10px; text-align: center; font-weight: 700;">
          <i class="fas fa-exclamation-circle"></i> Ingresa un código válido (Ejemplo: COT-0001).
        </div>
      `;
      return;
    }

    contenedorResultado.innerHTML = `
      <div style="text-align: center; color: #38bdf8; padding: 20px; font-weight: 700;">
        <i class="fas fa-spinner fa-spin fa-2x"></i>
        <p style="margin-top: 10px;">Buscando cotización en Neon DB...</p>
      </div>
    `;

    try {
      const res = await sql`SELECT * FROM cotizaciones_carga WHERE id = ${numId};`;

      if (!res || res.length === 0) {
        contenedorResultado.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 20px; border-radius: 12px; text-align: center; font-weight: 700;">
            <i class="fas fa-times-circle" style="font-size: 2rem; display: block; margin-bottom: 8px;"></i>
            Cotización ${rawVal} no encontrada en la base de datos.
          </div>
        `;
        return;
      }

      const cot = res[0];
      const codigo = `COT-${String(cot.id).padStart(4, '0')}`;
      const esMatpel = cot.matpel === true || cot.matpel === 'true';
      const monto = Number(cot.monto_calculado) || 0;
      const esPagado = cot.estado_pago === 'pagado';

      contenedorResultado.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.12); padding: 22px; border-radius: 14px; margin-top: 10px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
            <div>
              <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 700;">CÓDIGO:</span><br>
              <strong style="color: white; font-size: 1.1rem;"><i class="fas fa-barcode" style="color: #f97316;"></i> ${codigo}</strong>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 700;">PESO CARGA:</span><br>
              <strong style="color: white; font-size: 1.1rem;">${cot.toneladas} TN</strong>
            </div>
            <div style="grid-column: span 2;">
              <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 700;">TIPO CARGA:</span><br>
              <strong style="color: ${esMatpel ? '#f87171' : '#cbd5e1'}; font-size: 0.95rem;">
                ${esMatpel ? '<i class="fas fa-biohazard"></i> Carga Peligrosa (MATPEL +20%)' : 'Carga General'}
              </strong>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); padding: 14px; border-radius: 10px; margin-bottom: 20px;">
            <span style="color: #cbd5e1; font-weight: 700; font-size: 0.9rem;">TOTAL A COBRAR:</span>
            <strong style="color: #4ade80; font-size: 1.5rem; font-weight: 800;">${formatearSoles(monto)}</strong>
          </div>

          ${esPagado ? `
            <div style="text-align: center; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); color: #4ade80; padding: 15px; border-radius: 10px; font-weight: 800;">
              <i class="fas fa-check-circle" style="font-size: 1.3rem;"></i> ¡ESTA COTIZACIÓN YA FUE PAGADA Y AUTORIZADA!
            </div>
          ` : `
            <button id="btn-cobrar-caja" type="button" style="width: 100%; background: linear-gradient(135deg, #22c55e, #16a34a); color: #052e16; padding: 14px; border: none; border-radius: 10px; font-weight: 800; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 20px rgba(34, 197, 94, 0.3);">
              <i class="fas fa-cash-register"></i> Registrar Cobro y Habilitar Garita
            </button>
          `}
        </div>
      `;

      const btnCobrar = document.getElementById('btn-cobrar-caja');
      if (btnCobrar) {
        btnCobrar.addEventListener('click', async () => {
          btnCobrar.disabled = true;
          btnCobrar.textContent = 'Procesando cobro...';

          try {
            await sql`
              UPDATE cotizaciones_carga 
              SET estado_pago = 'pagado', canal_pago = 'Caja Ventanilla' 
              WHERE id = ${cot.id};
            `;

            contenedorResultado.innerHTML = `
              <div style="text-align: center; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); color: #4ade80; padding: 20px; border-radius: 12px; font-weight: 800;">
                <i class="fas fa-circle-check" style="font-size: 2.5rem; display: block; margin-bottom: 10px;"></i>
                ¡Cobro registrado con éxito en Ventanilla!<br>
                <span style="font-size: 0.9rem; font-weight: 600; color: #cbd5e1;">Salida en Garita autorizada correctamente.</span>
              </div>
            `;
          } catch (err) {
            console.error(err);
            alert('Error al registrar el cobro.');
            btnCobrar.disabled = false;
          }
        });
      }

    } catch (err) {
      console.error(err);
      contenedorResultado.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 15px; border-radius: 10px; text-align: center; font-weight: 700;">
          Error al consultar DB: ${err.message}
        </div>
      `;
    }
  });
});