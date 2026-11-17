import { useEffect, useRef, useState } from 'preact/hooks';
import { publicImageUrl } from '../../lib/config';
import { DEFAULT_SETTINGS } from '../../lib/format';
import { friendlyError } from '../../lib/browser/errors';
import { ImageError, newId, processImage } from '../../lib/browser/images';
import { bucket, removeFiles, sb } from '../../lib/browser/supabase';
import type { Settings } from '../../lib/types';
import Icon from '../Icon';
import { setDirty } from './guard';
import { useToast } from './Toasts';

type Field = 'business_name' | 'tagline' | 'about' | 'whatsapp' | 'instagram_url' | 'facebook_url' | 'tiktok_url' | 'email' | 'default_currency';
type Form = Record<Field, string>;

const toForm = (s: Settings): Form => ({
  business_name: s.business_name ?? '',
  tagline: s.tagline ?? '',
  about: s.about ?? '',
  whatsapp: s.whatsapp ?? '',
  instagram_url: s.instagram_url ?? '',
  facebook_url: s.facebook_url ?? '',
  tiktok_url: s.tiktok_url ?? '',
  email: s.email ?? '',
  default_currency: s.default_currency ?? 'GTQ',
});

function validate(f: Form): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  const name = f.business_name.trim();
  if (name.length < 2 || name.length > 60) e.business_name = 'Escribe el nombre del negocio (2 a 60 caracteres).';
  if (f.tagline.length > 140) e.tagline = 'Máximo 140 caracteres.';
  if (f.about.length > 1500) e.about = 'Máximo 1500 caracteres.';
  const wa = f.whatsapp.replace(/\D/g, '');
  if (f.whatsapp.trim() && !/^[1-9]\d{7,14}$/.test(wa))
    e.whatsapp = 'Escribe el número completo con código de país, por ejemplo 502 5555 5555.';
  for (const k of ['instagram_url', 'facebook_url', 'tiktok_url'] as const) {
    const v = f[k].trim();
    if (v && !/^https:\/\/\S+\.\S+$/.test(v)) e[k] = 'Pega el enlace completo, empezando con https://';
  }
  if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = 'Escribe un correo válido.';
  if (!/^[A-Z]{3}$/.test(f.default_currency)) e.default_currency = 'Usa un código de 3 letras, por ejemplo GTQ.';
  return e;
}

export default function SettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [saved, setSaved] = useState<string>('');
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const dirty = form !== null && JSON.stringify(form) !== saved;
  useEffect(() => setDirty(dirty), [dirty]);
  useEffect(() => () => setDirty(false), []);

  useEffect(() => {
    sb()
      .from('settings')
      .select('*')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setLoadError(friendlyError(error, 'No pudimos cargar los ajustes.'));
        const s = (data as Settings) ?? DEFAULT_SETTINGS;
        const f = toForm(s);
        setForm(f);
        setSaved(JSON.stringify(f));
        setLogoPath(s.logo_path);
      });
  }, []);

  if (loadError) {
    return (
      <div class="admin-page">
        <div class="notice notice--error" role="alert"><Icon name="alert" /><p>{loadError}</p></div>
      </div>
    );
  }
  if (!form) {
    return (
      <div class="admin-page" role="status"><span class="spinner" aria-hidden="true" /> Cargando ajustes…</div>
    );
  }

  const set = (k: Field, v: string) => {
    setForm({ ...form, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      toast('error', 'Revisa los campos marcados.');
      formRef.current?.querySelector<HTMLElement>(`#s-${first}`)?.focus();
      return;
    }
    setSaving(true);
    const payload = {
      business_name: form.business_name.trim(),
      tagline: form.tagline.trim() || null,
      about: form.about.trim() || null,
      whatsapp: form.whatsapp.replace(/\D/g, '') || null,
      instagram_url: form.instagram_url.trim() || null,
      facebook_url: form.facebook_url.trim() || null,
      tiktok_url: form.tiktok_url.trim() || null,
      email: form.email.trim() || null,
      default_currency: form.default_currency,
    };
    const { error } = await sb().from('settings').update(payload).eq('id', true);
    setSaving(false);
    if (error) return toast('error', friendlyError(error, 'No pudimos guardar los ajustes.'));
    const f = toForm({ ...DEFAULT_SETTINGS, ...payload });
    setForm(f);
    setSaved(JSON.stringify(f));
    toast('ok', 'Ajustes guardados. Ya se ven en el sitio.');
  };

  const changeLogo = async (file: File | null) => {
    setLogoError(null);
    if (!file) return;
    const old = logoPath;
    let uploaded: string | null = null;
    try {
      setLogoBusy('Optimizando logotipo…');
      const out = await processImage(file, { largeSide: 400, thumbSide: 200, minSide: 64 });
      const path = `settings/logo-${newId()}.${out.ext}`;
      setLogoBusy('Subiendo logotipo…');
      const { error: upError } = await bucket().upload(path, out.large, { contentType: out.type, cacheControl: '31536000' });
      if (upError) throw upError;
      uploaded = path;
      const { error } = await sb().from('settings').update({ logo_path: path }).eq('id', true);
      if (error) throw error;
      setLogoPath(path);
      if (old) await removeFiles([old]);
      toast('ok', 'Logotipo actualizado.');
    } catch (err) {
      if (uploaded) await removeFiles([uploaded]);
      setLogoError(err instanceof ImageError ? err.message : friendlyError(err, 'No pudimos cambiar el logotipo.'));
    } finally {
      setLogoBusy(null);
    }
  };

  const removeLogo = async () => {
    if (!logoPath) return;
    setLogoBusy('Quitando logotipo…');
    const { error } = await sb().from('settings').update({ logo_path: null }).eq('id', true);
    if (error) {
      setLogoBusy(null);
      return toast('error', friendlyError(error));
    }
    await removeFiles([logoPath]);
    setLogoPath(null);
    setLogoBusy(null);
    toast('ok', 'Logotipo quitado. Se mostrará el nombre del negocio.');
  };

  const field = (k: Field, label: string, opts: { hint?: string; type?: 'text' | 'url' | 'email'; placeholder?: string; textarea?: boolean; inputMode?: string } = {}) => (
    <div class="field">
      <label for={`s-${k}`}>{label}</label>
      {opts.textarea ? (
        <textarea id={`s-${k}`} class="textarea" rows={4} value={form[k]} placeholder={opts.placeholder} aria-invalid={Boolean(errors[k])} aria-describedby={[opts.hint && `h-${k}`, errors[k] && `e-${k}`].filter(Boolean).join(' ') || undefined} onInput={(e) => set(k, e.currentTarget.value)} />
      ) : (
        <input id={`s-${k}`} class="input" type={(opts.type ?? 'text') as 'text'} inputMode={opts.inputMode as 'text'} value={form[k]} placeholder={opts.placeholder} aria-invalid={Boolean(errors[k])} aria-describedby={[opts.hint && `h-${k}`, errors[k] && `e-${k}`].filter(Boolean).join(' ') || undefined} onInput={(e) => set(k, e.currentTarget.value)} />
      )}
      {opts.hint && <p class="hint" id={`h-${k}`}>{opts.hint}</p>}
      {errors[k] && <p class="error-text" id={`e-${k}`}><Icon name="alert" size={16} /> {errors[k]}</p>}
    </div>
  );

  const waDigits = form.whatsapp.replace(/\D/g, '');

  return (
    <div class="admin-page admin-page--narrow">
      <div class="admin-page__head"><h1>Ajustes del negocio</h1></div>

      <section class="panel">
        <h2 class="panel__title">Logotipo</h2>
        <div class="logo-row">
          <div class="logo-preview">
            {logoPath ? <img src={publicImageUrl(logoPath) ?? ''} alt="Logotipo actual" /> : <span class="muted">Sin logotipo: se muestra el nombre.</span>}
          </div>
          <div class="actions">
            <input id="logo-file" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(logoBusy)} onChange={(e) => { changeLogo(e.currentTarget.files?.[0] ?? null); e.currentTarget.value = ''; }} />
            <label for="logo-file" class={`btn btn--secondary btn--sm ${logoBusy ? 'is-disabled' : ''}`}><Icon name="upload" size={16} /> {logoPath ? 'Cambiar' : 'Subir logotipo'}</label>
            {logoPath && <button type="button" class="btn btn--ghost btn--sm" onClick={removeLogo} disabled={Boolean(logoBusy)}>Quitar</button>}
          </div>
        </div>
        {logoBusy && <p role="status" class="muted"><span class="spinner" aria-hidden="true" /> {logoBusy}</p>}
        {logoError && <p class="error-text" role="alert"><Icon name="alert" size={16} /> {logoError}</p>}
      </section>

      <form ref={formRef} onSubmit={submit} noValidate>
        <fieldset class="panel">
          <legend>Identidad</legend>
          {field('business_name', 'Nombre del negocio', { hint: 'Aparece en el encabezado, el título de las páginas y al compartir enlaces.' })}
          {field('tagline', 'Frase de portada (opcional)', { placeholder: 'Ej.: Cuidado profesional para tu cabello' })}
          {field('about', 'Texto de la página de contacto (opcional)', { textarea: true })}
        </fieldset>
        <fieldset class="panel">
          <legend>Contacto y redes</legend>
          {field('whatsapp', 'Número de WhatsApp', { inputMode: 'tel', placeholder: '502 5555 5555', hint: 'Con código de país, sin «+». Si lo dejas vacío, se ocultan los botones de WhatsApp.' })}
          {waDigits && !errors.whatsapp && /^[1-9]\d{7,14}$/.test(waDigits) && (
            <p class="hint"><a href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener">Probar este número en WhatsApp</a></p>
          )}
          {field('instagram_url', 'Instagram (opcional)', { type: 'url', placeholder: 'https://instagram.com/tu_cuenta' })}
          {field('facebook_url', 'Facebook (opcional)', { type: 'url', placeholder: 'https://facebook.com/tu_pagina' })}
          {field('tiktok_url', 'TikTok (opcional)', { type: 'url', placeholder: 'https://tiktok.com/@tu_cuenta' })}
          {field('email', 'Correo de contacto (opcional)', { type: 'email' })}
        </fieldset>
        <fieldset class="panel">
          <legend>Precios</legend>
          {field('default_currency', 'Moneda predeterminada', { hint: 'Código de 3 letras (GTQ = quetzal, USD = dólar). Se propone al escribir un precio.' })}
        </fieldset>
        <div class="editor__bar">
          <p class="editor__status muted" role="status">{saving ? 'Guardando…' : dirty ? 'Hay cambios sin guardar.' : 'Todo guardado.'}</p>
          <button class="btn btn--primary" type="submit" disabled={saving || !dirty}>
            {saving ? <span class="spinner" aria-hidden="true" /> : <Icon name="check" size={18} />} Guardar ajustes
          </button>
        </div>
      </form>
    </div>
  );
}
