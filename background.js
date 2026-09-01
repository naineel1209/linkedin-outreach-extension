(() => {
  'use strict';

  const RESOLVE_APPLY_URL_MESSAGE = 'linkedin-peer-finder-resolve-apply-url';

  function getHttpUrl(value) {
    try {
      const url = new URL(value);

      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  async function resolveApplyUrl(value) {
    const url = getHttpUrl(value);

    if (!url) {
      throw new Error('The application URL is invalid.');
    }

    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow'
    });
    const finalUrl = getHttpUrl(response.url);

    if (!finalUrl) {
      throw new Error('The application URL has no valid destination.');
    }

    return finalUrl;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== RESOLVE_APPLY_URL_MESSAGE || !sender.tab) {
      return false;
    }

    resolveApplyUrl(message.url)
      .then((url) => sendResponse({ ok: true, url }))
      .catch(() => sendResponse({ ok: false }));

    return true;
  });
})();
