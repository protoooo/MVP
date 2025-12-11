// lib/utils.js

// Simple className combiner used by the Evervault card.
// Usage: cn('base-class', condition && 'optional-class')
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
