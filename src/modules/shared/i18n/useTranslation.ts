import { useData } from '../context/DataContext';
import { id } from './id';
import { en } from './en';

type Dictionary = Record<string, string>;
const dictionaries: Record<string, Dictionary> = { id, en };

export function useTranslation() {
  const { settings } = useData();
  const lang = settings?.language || 'id';
  const dict = dictionaries[lang] || dictionaries['id'];

  const t = (key: string, params?: Record<string, string | number>): string => {
    let str = dict[key];
    if (!str) {
      console.warn(`Translation key not found: ${key}`);
      return key; // fallback to key
    }

    if (params) {
      Object.keys(params).forEach((p) => {
        str = str.replace(new RegExp(`{{${p}}}`, 'g'), String(params[p]));
      });
    }

    return str;
  };

  return { t, lang };
}
