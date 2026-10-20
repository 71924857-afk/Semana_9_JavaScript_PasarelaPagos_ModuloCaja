import { neon } from 'https://cdn.jsdelivr.net/npm/@neondatabase/serverless@0.10.1/+esm';

// Cadena de conexión armada con tu contraseña y el servidor de Neon DB
const NEON_DB_URL = 'postgresql://neondb_owner:npg_JE2sLFu5lNDh@ep-rough-violet-b411ob9r-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

export const sql = neon(NEON_DB_URL.trim());