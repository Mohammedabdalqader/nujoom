/**
 * Intl APIs Hermes (the Android/iOS JS engine) does not ship: PluralRules (Arabic's six plural
 * forms in i18next) and RelativeTimeFormat ("منذ ساعتين"). Each polyfill only installs itself
 * when the engine lacks the API, so the web preview keeps the browser's built-ins (D-021).
 * Must be imported before anything that formats text.
 */
import '@formatjs/intl-getcanonicallocales/polyfill.js';
import '@formatjs/intl-locale/polyfill.js';
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/ar.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-relativetimeformat/polyfill.js';
import '@formatjs/intl-relativetimeformat/locale-data/ar.js';
import '@formatjs/intl-relativetimeformat/locale-data/en.js';
