export function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

export function formatearSoles(monto) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(monto);
}

export const marcado = (valor) => valor === 'on' || valor === true || valor === 'true';

// Regla del Caso 35 — LogísticaMax Perú
export function calcularMontoServicio(d) {
  const t = Number(d.toneladas) || 0;
  // S/ 450.00 base (cubre hasta 5 t), S/ 80.00 por cada tonelada extra
  let total = 450.00 + 80.00 * Math.max(0, t - 5);
  
  // +20% si es carga peligrosa (MATPEL)
  if (marcado(d.matpel)) {
    total *= 1.20;
  }
  
  return redondear(total);
}