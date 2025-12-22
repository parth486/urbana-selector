// Small runtime safety patch to make Icon component compatible with
// collection-iterator code that expects a getCollectionNode function.
// Some 3rd-party consumer code calls `SomeComponent.getCollectionNode()`
// and that can throw when that property exists but is not a function.
// We ensure Icon has a callable getCollectionNode to avoid runtime crashes.
import { Icon as Iconify } from "@iconify/react";
import React from 'react';

try {
  // If the runtime export exists and is not a function, replace with a no-op function.
  if (Iconify) {
    // Some bundlers might give a wrapped export - cast to any for safety.
    const AnyIcon: any = Iconify as any;

    if (AnyIcon.getCollectionNode && typeof AnyIcon.getCollectionNode !== 'function') {
      // Replace non-callable value with a harmless function
      AnyIcon.getCollectionNode = function () {
        return null;
      };
    }

    // Ensure property exists and is callable to be defensive across versions
    if (!AnyIcon.getCollectionNode) {
      AnyIcon.getCollectionNode = function () {
        return null;
      };
    }
  }
} catch (err) {
  // Be extra defensive; don't break app if this patch fails
  // eslint-disable-next-line no-console
  console.warn('iconPatch: failed to apply defensive patch', err);
}

// Additional defensive safety: some components (especially when wrapped by
// other bundlers/forwards) may accidentally expose a non-callable
// `getCollectionNode` property. The collection-iterator code expects that
// to be a callable. We try to coerce any function-type components that have
// a non-callable getCollectionNode into a safe generator function.
try {
  // If React createElement is used by the runtime, patch it so every
  // created element's component type is checked and coerced as needed.
  const R: any = React as any;
  const origCreate = R && R.createElement ? R.createElement.bind(R) : null;
  if (origCreate) {
    try {
      // Check whether the createElement property is writable or configurable before attempting to replace it.
      // Some environments (like wp.element) expose a getter-only property which cannot be reassigned.
      const desc = Object.getOwnPropertyDescriptor(R, 'createElement');
      const canPatch = !desc || desc.writable || desc.configurable;

      if (canPatch) {
        R.createElement = function patchedCreate(type: any, ...args: any[]) {
          try {
            // Only consider complex component types (not string DOM tags)
            if (type && (typeof type === 'function' || typeof type === 'object')) {
              // If getCollectionNode exists but is not callable, coerce to a safe generator
              if (Object.prototype.hasOwnProperty.call(type, 'getCollectionNode') && typeof type.getCollectionNode !== 'function') {
                try {
                  type.getCollectionNode = function* () {
                    return null;
                  } as unknown as Function;
                } catch (coerceErr) {
                  // if assignment fails for readonly properties, attempt to define property
                  try {
                    Object.defineProperty(type, 'getCollectionNode', {
                      configurable: true,
                      enumerable: false,
                      writable: true,
                      value: function* () {
                        return null;
                      },
                    });
                  } catch (defineErr) {
                    // nothing else we can do, move on
                    // eslint-disable-next-line no-console
                    console.warn('iconPatch: failed to coerce getCollectionNode property', defineErr);
                  }
                }
              }
            }
          } catch (x) {
            // Don't let this patch break creation flow
            // eslint-disable-next-line no-console
            console.warn('iconPatch: createElement patch failed', x);
          }
          return origCreate(type, ...args);
        };
      } else {
        // Can't patch createElement in this environment (likely a getter-only wp.element); skip to avoid noisy errors
        // eslint-disable-next-line no-console
        console.warn('iconPatch: cannot patch React.createElement (non-writable, non-configurable); skipping createElement coercion');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('iconPatch: global coercion failed', err);
    }
  }
} catch (e) {
  // Keep runtime safe — failure of this patch is non-fatal.
  // eslint-disable-next-line no-console
  console.warn('iconPatch: global coercion failed', e);
}

// Last-resort fallback: Some collection iterators expect non-callable component
// types to expose getCollectionNode — if an object lacks it, add a safe
// generator to Object.prototype so the check (typeof S.getCollectionNode)
// resolves to a function and prevents a hard throw. This is defensive and
// only adds a no-op generator that yields nothing.
try {
  if (typeof Object !== 'undefined') {
    if (!Object.prototype.hasOwnProperty('getCollectionNode') || typeof (Object.prototype as any).getCollectionNode !== 'function') {
      Object.defineProperty(Object.prototype, 'getCollectionNode', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function* () {
          return null;
        },
      });
    }
  }
} catch (protoErr) {
  // eslint-disable-next-line no-console
  console.warn('iconPatch: failed to install prototype getCollectionNode fallback', protoErr);
}

export default true;
