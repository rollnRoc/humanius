import React from 'react';

/**
 * Wraps dynamic React.lazy imports with an automatic retry mechanism.
 * When a new deployment occurs and an old chunk URL 404s/fails to load,
 * this automatically reloads the page once to fetch the new asset manifest.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | any>
) {
  return React.lazy(async () => {
    const pageHasAlreadyBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem('retry_chunk_refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('retry_chunk_refreshed', 'false');
      return component.default ? component : { default: component };
    } catch (error: any) {
      if (!pageHasAlreadyBeenRefreshed) {
        window.sessionStorage.setItem('retry_chunk_refreshed', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
}
