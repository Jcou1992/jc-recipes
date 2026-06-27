import { cookies, headers } from 'next/headers';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, type Language, getT } from './i18n';

export async function getServerLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANGUAGE_COOKIE)?.value;
  if (cookieLang === 'en' || cookieLang === 'es') return cookieLang;

  // Fallback: parse Accept-Language header. Match `es` (or `es-*`) as either
  // the primary tag or any secondary tag in the list. Default to `en`.
  const accept = (await headers()).get('accept-language') ?? '';
  if (/^\s*es\b|,\s*es\b/i.test(accept)) return 'es';
  if (/^\s*en\b|,\s*en\b/i.test(accept)) return 'en';
  return DEFAULT_LANGUAGE;
}

export async function getServerT() {
  const lang = await getServerLanguage();
  return getT(lang);
}
