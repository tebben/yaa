// A controller with runes in a .svelte.ts module.
export function createCounter(start: number, save: (n: number) => void) {
  let n = $state(start);
  const doubled = $derived(n * 2);
  return {
    get n() { return n; },
    get doubled() { return doubled; },
    inc() { n++; save(n); },
  };
}
