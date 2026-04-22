import { cookies } from 'next/headers';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, type Language, getT } from './i18n';

export async function getServerLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const lang = cookieStore.get(LANGUAGE_COOKIE)?.value;
  return lang === 'en' || lang === 'es' ? lang : DEFAULT_LANGUAGE;
}

export async function getServerT() {
  const lang = await getServerLanguage();
  return getT(lang);
}
