import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

Object.defineProperty(window, 'scrollTo', { value: () => undefined, writable: true });
Element.prototype.scrollIntoView = () => undefined;
