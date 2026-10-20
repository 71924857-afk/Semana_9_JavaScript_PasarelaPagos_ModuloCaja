import { sql } from './config/neon-config.js';

document.addEventListener('DOMContentLoaded', () => {

  // 1. CONTROL DE SESIÓN DIRECTO
  const usuarioRaw = sessionStorage.getItem('usuarioLogueado');
  const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;

  const itemLogin = document.getElementById('item-login');
  const itemLogout = document.getElementById('item-logout');
  const btnLogout = document.getElementById('btn-logout');

  if (usuario) {
    if (itemLogin) itemLogin.style.display = 'none';
    if (itemLogout) itemLogout.style.display = 'inline-block';
  } else {
    if (itemLogin) itemLogin.style.display = 'inline-block';
    if (itemLogout) itemLogout.style.display = 'none';
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('usuarioLogueado');
      window.location.href = 'login.html';
    });
  }

  // 2. COTIZAR CARGA
  const btnCotizar = document.getElementById('btn-cotizar');
  if (btnCotizar) {
    btnCotizar.addEventListener('click', async (e) => {
      e.preventDefault();

      const origen = (document.getElementById('origen')?.value || '').trim();
      const destino = (document.getElementById('destino')?.value || '').trim();
      const tipo = document.getElementById('tipo')?.value || '';
      const pesoVal = parseFloat(document.getElementById('peso')?.value || '0');

      if (!origen || !destino || !tipo || isNaN(pesoVal) || pesoVal <= 0) {
        alert('Por favor completa todos los campos del cotizador.');
        return;
      }

      btnCotizar.textContent = 'Procesando...';
      btnCotizar.disabled = true;

      try {
        const codigo = 'COT-' + Math.floor(1000 + Math.random() * 9000);
        const userId = usuario ? (usuario.id || 1) : 1;
        const detalle = `Carga ${tipo} (${origen})`;

        await sql`
          INSERT INTO envios (codigo, usuario_id, destinatario, destino, peso, estado)
          VALUES (${codigo}, ${userId}, ${detalle}, ${destino}, ${pesoVal}, 'En Preparación')
        `;

        const msgOk = document.getElementById('mensaje-ok');
        const codigoGenerado = document.getElementById('codigo-generado');
        if (msgOk && codigoGenerado) {
          codigoGenerado.textContent = codigo;
          msgOk.style.display = 'block';
        }

      } catch (error) {
        console.error('Error Neon:', error);
        alert('Error al guardar cotización: ' + error.message);
      } finally {
        btnCotizar.textContent = 'Guardar y Cotizar Carga';
        btnCotizar.disabled = false;
      }
    });
  }

  // 3. SEGUIMIENTO DE ENVÍO
  const btnConsultar = document.getElementById('btn-consultar');
  const inputCodigo = document.getElementById('codigo-rastreo');
  const resultadoRastreo = document.getElementById('resultado-rastreo');
  const barraProgreso = document.getElementById('barra-progreso');

  async function ejecutarRastreo(e) {
    if (e) e.preventDefault();

    const codigo = inputCodigo ? inputCodigo.value.trim().toUpperCase() : '';

    if (!codigo) {
      alert('Ingresa un código de envío.');
      return;
    }

    if (resultadoRastreo) {
      resultadoRastreo.innerHTML = '<p style="color: #ea580c; font-weight: bold; margin-top: 10px;">🔍 Buscando en Neon DB...</p>';
    }

    try {
      const resultados = await sql`
        SELECT * FROM envios WHERE UPPER(TRIM(codigo)) = ${codigo}
      `;

      if (!resultadoRastreo) return;

      if (resultados.length === 0) {
        resultadoRastreo.innerHTML = `
          <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 10px; border-radius: 6px; color: #991b1b; margin-top: 10px;">
            ❌ No se encontró el envío <strong>${codigo}</strong>.
          </div>
        `;
        actualizarEtapas(1);
        return;
      }

      const envio = resultados[0];
      let numEtapa = 1;
      const estadoNorm = (envio.estado || '').toLowerCase();

      if (estadoNorm.includes('preparaci') || estadoNorm.includes('recolectado')) numEtapa = 1;
      else if (estadoNorm.includes('almacen') || estadoNorm.includes('almacén')) numEtapa = 2;
      else if (estadoNorm.includes('ruta') || estadoNorm.includes('camino')) numEtapa = 3;
      else if (estadoNorm.includes('entregado')) numEtapa = 4;

      actualizarEtapas(numEtapa);

      resultadoRastreo.innerHTML = `
        <div style="background-color: #f0fdf4; border: 1px solid #86efac; padding: 12px; border-radius: 6px; text-align: left; color: #166534; margin-top: 10px;">
          <p style="margin: 2px 0;"><strong>Código:</strong> ${envio.codigo}</p>
          <p style="margin: 2px 0;"><strong>Detalle:</strong> ${envio.destinatario || 'N/A'}</p>
          <p style="margin: 2px 0;"><strong>Destino:</strong> ${envio.destino || 'N/A'}</p>
          <p style="margin: 2px 0;"><strong>Estado:</strong> <span style="background-color: #16a34a; color: white; padding: 2px 6px; border-radius: 4px;">${envio.estado}</span></p>
        </div>
      `;

    } catch (error) {
      console.error('Error:', error);
      if (resultadoRastreo) {
        resultadoRastreo.innerHTML = `<p style="color: #dc2626; margin-top: 10px;">Error: ${error.message}</p>`;
      }
    }
  }

  if (btnConsultar) btnConsultar.addEventListener('click', ejecutarRastreo);
  if (inputCodigo) {
    inputCodigo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') ejecutarRastreo(e);
    });
  }

  function actualizarEtapas(etapa) {
    const radio = document.getElementById(`etapa${etapa}`);
    if (radio) radio.checked = true;

    if (barraProgreso) {
      const porcentajes = { 1: '0%', 2: '33%', 3: '66%', 4: '100%' };
      barraProgreso.style.width = porcentajes[etapa] || '0%';
    }
  }
});