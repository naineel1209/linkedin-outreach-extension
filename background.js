(() => {
  'use strict';

  const RESOLVE_APPLY_URL_MESSAGE = 'linkedin-peer-finder-resolve-apply-url';
  const COPY_TEXT_MESSAGE = 'linkedin-peer-finder-copy-text';
  const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
  let creatingOffscreenDocument;

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

  async function hasOffscreenDocument() {
    if (!chrome.runtime.getContexts) {
      return false;
    }

    const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });

    return contexts.length > 0;
  }

  async function ensureOffscreenDocument() {
    if (await hasOffscreenDocument()) {
      return;
    }

    if (!creatingOffscreenDocument) {
      creatingOffscreenDocument = chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ['CLIPBOARD'],
        justification: 'Copy company names and job links after redirect resolution.'
      });
      try {
        await creatingOffscreenDocument;
      } finally {
        creatingOffscreenDocument = undefined;
      }

      return;
    }

    await creatingOffscreenDocument;
  }

  async function copyText(value) {
    await ensureOffscreenDocument();

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: COPY_TEXT_MESSAGE, value, target: 'offscreen' }, (response) => {
        if (chrome.runtime.lastError || !response?.ok) {
          reject(new Error('The extension document could not copy the text.'));
          return;
        }

        resolve();
      });
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === COPY_TEXT_MESSAGE && sender.tab) {
      copyText(message.value)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));

      return true;
    }

    if (message?.type !== RESOLVE_APPLY_URL_MESSAGE || !sender.tab) {
      return false;
    }

    resolveApplyUrl(message.url)
      .then((url) => sendResponse({ ok: true, url }))
      .catch(() => sendResponse({ ok: false }));

    return true;
  });
})();
