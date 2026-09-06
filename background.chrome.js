importScripts('background.common.js');

(() => {
  'use strict';

  const COPY_TEXT_MESSAGE = 'linkedin-peer-finder-copy-text';
  const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
  let creatingOffscreenDocument;

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

  globalThis.linkedinPeerFinderBackground.register(copyText);
})();
