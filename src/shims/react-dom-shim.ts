// Lightweight shim for react-dom/client using WordPress' element API
const wpElement = (typeof window !== 'undefined' && (window as any).wp && (window as any).wp.element) || null;

function missing(name: string) {
  return function () {
    throw new Error(`wp.element is not available; attempted to use ${name}. Ensure WordPress provides wp.element before loading this script.`);
  };
}

export const createRoot = wpElement ? ((...args: any[]) => (wpElement as any).createRoot(...args)) : missing('createRoot');
export const hydrateRoot = wpElement ? ((...args: any[]) => (wpElement as any).hydrateRoot(...args)) : missing('hydrateRoot');
export const flushSync = wpElement && (wpElement as any).flushSync ? ((...args: any[]) => (wpElement as any).flushSync(...args)) : ((cb: any) => cb());

export default {
  createRoot,
  hydrateRoot,
  flushSync,
};