// Utilidades compartidas por los scripts de respaldo y restauración.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export async function adminClient(): Promise<SupabaseClient> {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!url || !key || !email || !password) {
    console.error('Faltan variables en .env: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, ADMIN_EMAIL y ADMIN_PASSWORD.');
    process.exit(1);
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`No se pudo iniciar sesión como administrador: ${error.message}`);
    process.exit(1);
  }
  const { data: isAdmin } = await client.rpc('is_admin');
  if (!isAdmin) {
    console.error('La cuenta indicada no es administradora.');
    process.exit(1);
  }
  return client;
}

export const log = (text: string) => process.stdout.write(`  ${text}\n`);
