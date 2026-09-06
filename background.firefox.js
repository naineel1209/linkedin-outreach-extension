(() => {
  'use strict';

  async function copyText(value) {
    if (!navigator.clipboard?.writeText) {
      throw new Error('The Firefox clipboard API is unavailable.');
    }

    await navigator.clipboard.writeText(value);
  }

  globalThis.linkedinPeerFinderBackground.register(copyText);
})();
