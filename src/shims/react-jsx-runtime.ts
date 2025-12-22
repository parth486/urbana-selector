// Minimal JSX runtime shim that proxies to wp.element.createElement
const wpElement = (typeof window !== 'undefined' && (window as any).wp && (window as any).wp.element) || null;

function missing(name: string) {
  return function () {
    throw new Error(`wp.element is not available; attempted to use ${name}. Ensure WordPress provides wp.element before loading this script.`);
  };
}

export const jsx = wpElement ? ((type: any, props: any, key?: any) => {
  if (key !== undefined) props = { ...(props || {}), key };
  return (wpElement as any).createElement(type, props);
}) : missing('jsx');

export const jsxs = jsx as any;
export const jsxDEV = jsx as any;
export const Fragment = wpElement ? (wpElement as any).Fragment : null;

export default { jsx, jsxs, jsxDEV, Fragment };
