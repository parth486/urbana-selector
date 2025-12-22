// Lightweight shim that proxies React APIs to window.wp.element (WordPress React)
// This ensures the plugin uses the same React instance WordPress provides in admin.

const wpElement = (typeof window !== 'undefined' && (window as any).wp && (window as any).wp.element) || null;

function missing(name: string) {
  return function () {
    throw new Error(`wp.element is not available; attempted to use ${name}. Ensure WordPress provides wp.element before loading this script.`);
  };
}

export const Fragment = wpElement ? wpElement.Fragment : null;
export const createElement = wpElement ? (...args: any[]) => (wpElement as any).createElement(...args) : missing('createElement');
export const createContext = wpElement ? (...args: any[]) => (wpElement as any).createContext(...args) : missing('createContext');
export const useState = wpElement ? (...args: any[]) => (wpElement as any).useState(...args) : missing('useState');
export const useEffect = wpElement ? (...args: any[]) => (wpElement as any).useEffect(...args) : missing('useEffect');
export const useRef = wpElement ? (...args: any[]) => (wpElement as any).useRef(...args) : missing('useRef');
export const useMemo = wpElement ? (...args: any[]) => (wpElement as any).useMemo(...args) : missing('useMemo');
export const useCallback = wpElement ? (...args: any[]) => (wpElement as any).useCallback(...args) : missing('useCallback');
export const useContext = wpElement ? (...args: any[]) => (wpElement as any).useContext(...args) : missing('useContext');
export const useLayoutEffect = wpElement ? (...args: any[]) => (wpElement as any).useLayoutEffect(...args) : missing('useLayoutEffect');
export const useInsertionEffect = wpElement ? (...args: any[]) => (wpElement as any).useInsertionEffect(...args) : missing('useInsertionEffect');
export const useDebugValue = wpElement ? (...args: any[]) => (wpElement as any).useDebugValue(...args) : missing('useDebugValue');
export const useReducer = wpElement ? (...args: any[]) => (wpElement as any).useReducer(...args) : missing('useReducer');
export const useImperativeHandle = wpElement ? (...args: any[]) => (wpElement as any).useImperativeHandle(...args) : missing('useImperativeHandle');
export const memo = wpElement ? (wpElement as any).memo : missing('memo');
export const forwardRef = wpElement ? (wpElement as any).forwardRef : missing('forwardRef');
export const isValidElement = wpElement ? (wpElement as any).isValidElement : missing('isValidElement');
export const Children = wpElement ? (wpElement as any).Children : null;
export const cloneElement = wpElement ? ((...args: any[]) => (wpElement as any).cloneElement(...args)) : missing('cloneElement');
export const Component = wpElement ? (wpElement as any).Component : null;

// Provide named exports for any other APIs used by libraries
export const useId = wpElement ? (...args: any[]) => (wpElement as any).useId(...args) : missing('useId');
export const useDeferredValue = wpElement ? (...args: any[]) => (wpElement as any).useDeferredValue(...args) : missing('useDeferredValue');
export const useSyncExternalStore = wpElement ? (...args: any[]) => (wpElement as any).useSyncExternalStore(...args) : missing('useSyncExternalStore');

// Expose a version string if available (some libs import { version } from 'react')
export const version = (wpElement && (wpElement as any).version) || '18.0.0';

// A compatibility export so `import React from 'react'` will get the object
export const React = wpElement as any;
export default wpElement as any;