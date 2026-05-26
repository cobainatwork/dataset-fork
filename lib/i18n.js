import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 匯入翻譯檔案
import enTranslation from '../locales/en/translation.json';
import zhTWTranslation from '../locales/zh-TW/translation.json';
import trTranslation from '../locales/tr/translation.json';
import ptBRTranslation from '../locales/pt-BR/translation.json';
import itTranslation from '../locales/it/translation.json';

// 避免在伺服器端重複初始化
const isServer = typeof window === 'undefined';
const i18nInstance = i18n.createInstance();

// 僅在客戶端初始化 i18next
if (!isServer && !i18nInstance.isInitialized) {
  i18nInstance
    // 檢測使用者語言
    .use(LanguageDetector)
    // 將 i18n 例項傳遞給 react-i18next
    .use(initReactI18next)
    // 初始化
    .init({
      resources: {
        en: {
          translation: enTranslation
        },
        zh: {
          translation: zhTWTranslation
        },
        'zh-TW': {
          translation: zhTWTranslation
        },
        tr: {
          translation: trTranslation
        },
        'pt-BR': {
          translation: ptBRTranslation
        },
        it: {
          translation: itTranslation
        }
      },
      supportedLngs: ['en', 'zh', 'zh-TW', 'tr', 'pt-BR', 'it'],
      fallbackLng: 'en',
      debug: process.env.NODE_ENV === 'development',

      interpolation: {
        escapeValue: false // 不轉義 HTML
      },

      // 檢測使用者語言的選項
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'i18nextLng',
        caches: ['localStorage'],
        convertDetectedLanguage: lng => {
          if (!lng) return lng;
          const normalized = String(lng).toLowerCase();
          if (normalized === 'zh' || normalized.startsWith('zh-')) {
            return 'zh-TW';
          }
          return lng;
        }
      }
    });
}

export default i18nInstance;
