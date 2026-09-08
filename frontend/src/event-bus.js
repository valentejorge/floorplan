/**
 * event-bus.js — Lightweight pub/sub replacing window.* globals
 *
 * Usage:
 *   import { on, off, emit } from './event-bus.js';
 *   on('asset:select', (data) => { ... });
 *   emit('asset:select', assetData);
 */
const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
}

export function off(event, fn) {
  listeners.get(event)?.delete(fn);
}

export function emit(event, data) {
  if (!listeners.has(event)) return;
  for (const fn of listeners.get(event)) {
    fn(data);
  }
}
