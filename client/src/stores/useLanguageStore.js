import { create } from 'zustand';
import { translations } from '../i18n/translations';

export const useLanguageStore = create((set, get) => ({
  language: localStorage.getItem('budgetph_lang') || 'en',

  setLanguage: (lang) => {
    localStorage.setItem('budgetph_lang', lang);
    set({ language: lang });
  },

  toggleLanguage: () => {
    const current = get().language;
    const next = current === 'en' ? 'tl' : 'en';
    localStorage.setItem('budgetph_lang', next);
    set({ language: next });
  },

  t: (key, params = {}) => {
    const lang = get().language;
    const dict = translations[lang] || translations.en;
    let text = dict[key] || translations.en[key] || key;

    if (typeof text === 'string') {
      Object.keys(params).forEach((p) => {
        text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
      });
    }

    return text;
  }
}));
