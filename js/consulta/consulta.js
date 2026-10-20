import { sql } from '../config/neon-config.js';

function formatearSoles(monto) {
  return `S/ ${Number(monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Función global para imprimir el ticket individual a pantalla completa (A4)
window.imprimirTicketIndividual = function(codigo, toneladas, matpel, monto, canal) {
  const fecha = new Date().toLocaleDateString('es-PE', { 
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  
  const ventanaImpresion = window.open('', '_blank');
  ventanaImpresion.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Ticket - ${codigo}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        * { box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          background: #fff;
          color: #000;
          margin: 0;
          padding: 20px;
        }
        .ticket-container {
          width: 100%;
          border: 3px solid #000;
          padding: 40px;
          border-radius: 12px;
        }
        .header {
          text-align: center;
          border-bottom: 3px dashed #000;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 { margin: 0; font-size: 2.5rem; font-weight: 900; }
        .header p { margin: 6px 0; font-size: 1.2rem; }
        .status-badge {
          text-align: center;
          background: #f1f5f9;
          border: 2px solid #000;
          padding: 15px;
          font-weight: 900;
          font-size: 1.4rem;
          margin: 25px 0;
          border-radius: 8px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin: 18px 0;
          font-size: 1.4rem;
        }
        .total-box {
          border-top: 3px solid #000;
          border-bottom: 3px solid #000;
          padding: 20px 0;
          margin: 30px 0;
          display: flex;
          justify-content: space-between;
          font-size: 2.2rem;
          font-weight: 900;
        }
        .barcode {
          text-align: center;
          margin-top: 40px;
          font-family: monospace;
          font-weight: bold;
          font-size: 2rem;
          letter-spacing: 6px;
        }
      </style>
    </head>
    <body>
      <div class="ticket-container">
        <div class="header">
          <h1>LOGÍSTICAMAX PERÚ</h1>
          <p>RUC: 20601234567 | Operaciones de Carga Pesada</p>
          <p><strong>TICKET AUTORIZADO DE SALIDA EN GARITA</strong></p>
          <p>Fecha: ${fecha}</p>
        </div>

        <div class="status-badge">
          ✓ ESTADO: PAGO CONFIRMADO
        </div>

        <div class="row">
          <span>Código de Ticket:</span>
          <strong>${codigo}</strong>
        </div>
        <div class="row">
          <span>Canal de Pago:</span>
          <span>${canal}</span>
        </div>
        <div class="row">
          <span>Peso de Carga:</span>
          <span><strong>${toneladas} TN</strong></span>
        </div>
        <div class="row">
          <span>Tipo de Carga:</span>
          <span><strong>${matpel ? 'MATPEL (+20% Recargo)' : 'General'}</strong></span>
        </div>

        <div class="total-box">
          <span>MONTO TOTAL:</span>
          <span>${formatearSoles(monto)}</span>
        </div>

        <div class="barcode">
          |||||||||||||||||||||||||||||||||<br>
          * ${codigo} *
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      <\/script>
    </body>
    </html>
  `);
  ventanaImpresion.document.close();
};

document.addEventListener('DOMContentLoaded', async () => {
  const contenedorEnvios = document.getElementById('contenedor-envios') || document.getElementById('tabla-envios');

  if (!contenedorEnvios) return;

  try {
    let listaCotizaciones = [];

    // 1. Obtener cotizaciones desde la base de datos Neon DB
    try {
      const res1 = await sql`SELECT * FROM cotizaciones_carga ORDER BY id DESC;`;
      if (res1 && res1.length > 0) listaCotizaciones = [...listaCotizaciones, ...res1];
    } catch (e) {}

    try {
      const res2 = await sql`SELECT * FROM cotizaciones ORDER BY id DESC;`;
      if (res2 && res2.length > 0) {
        const idsExistentes = new Set(listaCotizaciones.map(i => i.id));
        res2.forEach(item => {
          if (!idsExistentes.has(item.id)) listaCotizaciones.push(item);
        });
      }
    } catch (e) {}

    if (listaCotizaciones.length === 0) {
      contenedorEnvios.innerHTML = `
        <div style="text-align: center; padding: 50px; background: rgba(30, 41, 59, 0.5); border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); color: #94a3b8;">
          <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 15px; color: #475569;"></i>
          <p style="font-size: 1.1rem; font-weight: 600; color: #f8fafc;">No tienes cotizaciones registradas aún.</p>
          <a href="registro.html" style="display: inline-block; margin-top: 15px; background: #f97316; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Crear Nueva Cotización
          </a>
        </div>
      `;
      return;
    }

    // Renderizar tarjetas en rejilla panorámica
    contenedorEnvios.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; width: 100%;">
        ${listaCotizaciones.map(item => {
          const codigo = `COT-${String(item.id).padStart(4, '0')}`;
          const esMatpel = item.matpel === true || item.matpel === 'true';
          const tonVal = item.toneladas !== undefined ? item.toneladas : (item.peso || 0);
          const monto = Number(item.monto_calculado) || 0;
          const esPagado = item.estado_pago === 'pagado' || item.estado === 'pagado';
          const canal = item.canal_pago || (esPagado ? 'Pasarela Online' : 'Pendiente de pago');

          return `
            <div style="background: linear-gradient(145deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95)); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; padding: 22px; backdrop-filter: blur(10px); display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
              
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                  <span style="font-weight: 800; font-size: 1.1rem; color: #ffffff; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-barcode" style="color: #f97316;"></i> ${codigo}
                  </span>
                  <span style="background: ${esPagado ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)'}; color: ${esPagado ? '#4ade80' : '#fde047'}; border: 1px solid ${esPagado ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}; font-size: 0.75rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">
                    ${esPagado ? '<i class="fas fa-check-circle"></i> PAGADO' : '<i class="fas fa-clock"></i> PENDIENTE'}
                  </span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                  <div style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="display: block; font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Peso Carga</span>
                    <strong style="color: #f8fafc; font-size: 0.95rem;">${tonVal} t</strong>
                  </div>

                  <div style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="display: block; font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Tipo Carga</span>
                    <strong style="color: ${esMatpel ? '#f87171' : '#cbd5e1'}; font-size: 0.9rem;">
                      ${esMatpel ? '<i class="fas fa-biohazard"></i> MATPEL (+20%)' : 'General'}
                    </strong>
                  </div>

                  <div style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); grid-column: span 2;">
                    <span style="display: block; font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Canal Pago</span>
                    <span style="color: #cbd5e1; font-size: 0.85rem; font-weight: 600;">${canal}</span>
                  </div>
                </div>

                <div style="background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); padding: 10px 14px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                  <span style="color: #94a3b8; font-size: 0.75rem; font-weight: 700;">MONTO FLETE:</span>
                  <span style="color: #4ade80; font-size: 1.2rem; font-weight: 800;">${formatearSoles(monto)}</span>
                </div>
              </div>

              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
                ${!esPagado ? `
                  <a href="pasarela.html?id=${item.id}" style="display: flex; justify-content: center; align-items: center; gap: 8px; background: #22c55e; color: #052e16; padding: 10px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 0.85rem; transition: all 0.2s;">
                    <i class="fas fa-credit-card"></i> Pagar Online Ahora
                  </a>
                ` : `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(34, 197, 94, 0.15); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.3);">
                    <span style="color: #4ade80; font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                      <i class="fas fa-shield-halved"></i> Garita Habilitada
                    </span>
                    <button onclick="imprimirTicketIndividual('${codigo}', ${tonVal}, ${esMatpel}, ${monto}, '${canal}')" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: #ffffff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 5px;">
                      <i class="fas fa-print"></i> Ticket
                    </button>
                  </div>
                `}
              </div>

            </div>
          `;
        }).join('')}
      </div>
    `;

  } catch (error) {
    console.error('Error al cargar cotizaciones:', error);
  }
});