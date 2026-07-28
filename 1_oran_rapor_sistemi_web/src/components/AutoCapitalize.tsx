'use client';

import { useEffect } from 'react';

export function AutoCapitalize() {
  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      
      // Check if the target is an input or textarea
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // Skip certain input types where capitalization is bad
        if (
          target.type === 'password' || 
          target.type === 'email' || 
          target.type === 'number' || 
          target.type === 'search' ||
          target.type === 'url' ||
          target.dataset.noCapitalize === 'true'
        ) {
          return;
        }

        const val = target.value;
        if (!val) return;

        const firstChar = val.charAt(0);
        const upperFirst = firstChar.toLocaleUpperCase('tr-TR');

        // Only update if the first character is lowercase
        if (firstChar !== upperFirst) {
          const newVal = upperFirst + val.slice(1);
          
          // Save cursor position
          const start = target.selectionStart;
          const end = target.selectionEnd;

          // React 16+ overrides the value setter, so we need to use the native setter
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          )?.set;
          
          const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
          )?.set;

          if (target.tagName === 'INPUT' && nativeInputValueSetter) {
            nativeInputValueSetter.call(target, newVal);
          } else if (target.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
            nativeTextAreaValueSetter.call(target, newVal);
          } else {
            target.value = newVal;
          }

          // Dispatch the event so React (and react-hook-form) knows about the change
          target.dispatchEvent(new Event('input', { bubbles: true }));

          // Restore cursor position
          if (start !== null && end !== null) {
            target.setSelectionRange(start, end);
          }
        }
      }
    };

    // Use capture phase to intercept early
    document.addEventListener('input', handleInput, true);

    return () => {
      document.removeEventListener('input', handleInput, true);
    };
  }, []);

  return null;
}
