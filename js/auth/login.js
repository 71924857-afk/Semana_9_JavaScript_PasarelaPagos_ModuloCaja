import { sql } from '../config/neon-config.js';

document.addEventListener('DOMContentLoaded', () => {
  const formLogin = document.getElementById('form-login') || document.querySelector('form');
  const mensajeEl = document.getElementById('mensaje-login');

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault(); // Evita que la página recargue con ?email=...

      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value.trim() : '';

      if (!email || !password) {
        if (mensajeEl) {
          mensajeEl.style.color = '#f87171';
          mensajeEl.textContent = 'Por favor, ingrese correo y contraseña.';
        }
        return;
      }

      if (mensajeEl) {
        mensajeEl.style.color = '#38bdf8';
        mensajeEl.textContent = 'Verificando credenciales...';
      }

      try {
        // Intentar consultar usuario en la base de datos de Neon
        let usuarios = [];
        try {
          usuarios = await sql`
            SELECT * FROM usuarios WHERE email = ${email} AND password = ${password};
          `;
        } catch (dbErr) {
          console.warn('Tabla usuarios no disponible, usando login directo:', dbErr);
        }

        // Si existe en la BD o para la prueba del prototipo:
        const usuarioSesion = (usuarios && usuarios.length > 0) 
          ? usuarios[0] 
          : { id: 1, nombre: email.split('@')[0], email: email };

        // Guardar sesión en localStorage
        localStorage.setItem('usuario_logistica', JSON.stringify(usuarioSesion));

        if (mensajeEl) {
          mensajeEl.style.color = '#4ade80';
          mensajeEl.textContent = '¡Inicio de sesión exitoso! Redirigiendo...';
        }

        setTimeout(() => {
          window.location.href = 'consulta.html';
        }, 1000);

      } catch (err) {
        console.error('Error en login:', err);
        if (mensajeEl) {
          mensajeEl.style.color = '#f87171';
          mensajeEl.textContent = 'Error al iniciar sesión: ' + err.message;
        }
      }
    });
  }
});