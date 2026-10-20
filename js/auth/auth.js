import { sql } from '../config/neon-config.js';

export async function iniciarSesion(correo, contrasena) {
  try {
    const usuarios = await sql`
      SELECT * FROM usuarios 
      WHERE correo = ${correo} AND contrasena = ${contrasena};
    `;

    if (!usuarios || usuarios.length === 0) {
      return null;
    }

    const usuario = usuarios[0];

    const usuarioParaSesion = {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol || 'cliente'
    };

    sessionStorage.setItem('usuarioLogueado', JSON.stringify(usuarioParaSesion));

    return usuarioParaSesion;

  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    throw error;
  }
}

export async function registrarUsuario(nombre, correo, contrasena) {
  try {
    await sql`
      INSERT INTO usuarios (nombre, correo, contrasena, rol)
      VALUES (${nombre}, ${correo}, ${contrasena}, 'cliente');
    `;
    return { exito: true };
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return { exito: false, mensaje: 'Error al registrar usuario.' };
  }
}

export function verificarSesionProtegida() {
  const usuarioGuardado = sessionStorage.getItem('usuarioLogueado');
  if (!usuarioGuardado) {
    window.location.href = 'login.html';
    return null;
  }
  return JSON.parse(usuarioGuardado);
}

export function cerrarSesion() {
  sessionStorage.removeItem('usuarioLogueado');
  window.location.href = 'login.html';
}