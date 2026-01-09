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

// Provide createPortal mapping to wp.element if available (used by many UI components)
export const createPortal = wpElement && (wpElement as any).createPortal ? ((...args: any[]) => (wpElement as any).createPortal(...args)) : missing('createPortal');

// Provide unstable_batchedUpdates (used by dnd-kit)
export const unstable_batchedUpdates = wpElement && (wpElement as any).unstable_batchedUpdates ? ((...args: any[]) => (wpElement as any).unstable_batchedUpdates(...args)) : ((cb: any) => cb && cb());

export default {
  createRoot,
  hydrateRoot,
  flushSync,
  createPortal,
  unstable_batchedUpdates,
};