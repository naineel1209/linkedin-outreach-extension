(() => {
  'use strict';

  const COPY_TEXT_MESSAGE = 'linkedin-peer-finder-copy-text';

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== COPY_TEXT_MESSAGE || message.target !== 'offscreen') {
      return false;
    }

    navigator.clipboard.writeText(message.value)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));

    return true;
  });
})();
