import { useSyncExternalStore } from 'react';

/**
 * Roteamento por hash (#/treinar/...): funciona no GitHub Pages sem configuração de servidor
 * e dentro do PWA instalado.
 */
export interface Route {
  path: string[];
  query: URLSearchParams;
  raw: string;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [p, q = ''] = raw.split('?');
  return { path: p.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q), raw };
}

let current = parse(typeof window !== 'undefined' ? window.location.hash : '');
const listeners = new Set<() => void>();
/** Pilha das rotas visitadas nesta sessão, para saber se "voltar" permanece dentro do app. */
const visited: string[] = [current.raw];
let replacing = false;

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    current = parse(window.location.hash);
    if (replacing) visited[visited.length - 1] = current.raw;
    else if (visited.length > 1 && visited[visited.length - 2] === current.raw) visited.pop();
    else visited.push(current.raw);
    replacing = false;
    listeners.forEach((l) => l());
    window.scrollTo(0, 0);
  });
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

export function navigate(to: string, replace = false): void {
  const hash = `#/${to.replace(/^\/+/, '')}`;
  if (hash === window.location.hash) return;
  replacing = replace;
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
}

/** Volta na história quando a página anterior é do próprio app; caso contrário, vai para `fallback`. */
export function goBack(fallback: string): void {
  if (visited.length > 1) window.history.back();
  else navigate(fallback, true);
}

export function href(to: string): string {
  return `#/${to.replace(/^\/+/, '')}`;
}
