// Global console guard used to silence noisy logs in production builds.
// Toggle verbose logs by setting `window.__URBANA_DEBUG = true` in the browser console.
declare global {
  interface Window {
    __URBANA_DEBUG?: boolean;
  }
}

const enabled = typeof window !== 'undefined' && !!window.__URBANA_DEBUG;

if (!enabled) {
  // Preserve warn/error so real issues are visible, but silence noisy debug/info/log.
  // eslint-disable-next-line no-console
  console.debug = () => {};
  // eslint-disable-next-line no-console
  console.log = () => {};
  // eslint-disable-next-line no-console
  console.info = () => {};
}

export default enabled;
