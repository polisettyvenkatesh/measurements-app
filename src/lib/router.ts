import { useEffect, useState } from 'react';

export interface Route {
  path: string;
  param: string | null;
}

function parseHash(): Route {
  const h = window.location.hash.replace(/^#/, '') || '/dashboard';
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { path: '/dashboard', param: null };

  if (parts.length >= 2 && parts[0] === 'admin') {
    const sub = parts[1];
    const rest = parts.slice(2);
    return { path: '/admin/' + sub, param: rest.length ? rest.join('/') : null };
  }

  if (parts[0] === 'sheet' && parts.length >= 2) {
    return { path: '/sheet', param: parts.slice(1).join('/') };
  }

  if (parts.length === 1) return { path: '/' + parts[0], param: null };
  return { path: '/' + parts[0], param: parts.slice(1).join('/') };
}

export function useRouter(): Route {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return route;
}

export function navigate(path: string): void {
  if (!path.startsWith('#')) path = '#' + path;
  if (window.location.hash !== path) {
    window.location.hash = path;
  } else {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}