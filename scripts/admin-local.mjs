// SOLO PARA DESARROLLO LOCAL: crea (o reutiliza) un administrador en el Supabase local
// levantado con `npx supabase start`. Nunca uses este script contra producción.
// Uso: node scripts/admin-local.mjs correo@ejemplo.com contraseña
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const [email = 'admin@local.test', password = 'admin-local-123'] = process.argv.slice(2);
const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }));
if (!/127\.0\.0\.1|localhost/.test(status.API_URL)) throw new Error('Este script solo funciona con el Supabase local.');

const admin = createClient(status.API_URL, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let user;
const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  const { data: list } = await admin.auth.admin.listUsers();
  user = list.users.find((u) => u.email === email);
  if (!user) throw error;
} else user = data.user;
const { error: insError } = await admin.from('admins').upsert({ user_id: user.id });
if (insError) throw insError;
console.log(`Administrador local listo: ${email}`);
