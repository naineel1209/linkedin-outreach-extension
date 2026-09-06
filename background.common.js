(() => {
  'use strict';

  const RESOLVE_APPLY_URL_MESSAGE = 'linkedin-peer-finder-resolve-apply-url';
  const LOOKUP_APPLY_URL_MESSAGE = 'linkedin-peer-finder-lookup-apply-url';
  const COPY_TEXT_MESSAGE = 'linkedin-peer-finder-copy-text';

  function getHttpUrl(value) {
    try {
      const url = new URL(value);

      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function getExternalDestination(value) {
    const url = getHttpUrl(value);

    if (!url) {
      return '';
    }

    const parsedUrl = new URL(url);

    if (!/(^|\.)linkedin\.com$/i.test(parsedUrl.hostname)) {
      return url;
    }

    for (const parameter of ['url', 'redirect', 'redirectUrl', 'targetUrl', 'destination']) {
      const destination = getExternalDestination(parsedUrl.searchParams.get(parameter));

      if (destination) {
        return destination;
      }
    }

    return '';
  }

  async function resolveApplyUrl(value) {
    const url = getExternalDestination(value) || getHttpUrl(value);

    if (!url) {
      throw new Error('The application URL is invalid.');
    }

    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow'
    });
    const finalUrl = getExternalDestination(response.url) || getHttpUrl(response.url);

    if (!finalUrl) {
      throw new Error('The application URL has no valid destination.');
    }

    return finalUrl;
  }

  function getHtmlAttribute(element, attributeName) {
    const attribute = new RegExp(`\\s${attributeName}=["']([^"']*)["']`, 'i').exec(element);

    return attribute?.[1].replace(/&amp;/gi, '&') || '';
  }

  async function lookupApplyUrl(jobId) {
    if (!/^\d+$/.test(jobId)) {
      throw new Error('The job ID is invalid.');
    }

    const response = await fetch(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`, {
      cache: 'no-store',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error('LinkedIn job data is unavailable.');
    }

    const jobPage = await response.text();
    const actions = jobPage.match(/<(?:a|button)\b[^>]*>/gi) || [];

    for (const action of actions) {
      const controlName = getHtmlAttribute(action, 'data-tracking-control-name');

      if (/apply-link-onsite/i.test(controlName)) {
        return { kind: 'linkedin' };
      }

      if (/apply-link-(?:offsite|external)/i.test(controlName)) {
        const applyUrl = getHttpUrl(getHtmlAttribute(action, 'href'));

        if (applyUrl) {
          return { kind: 'external', url: await resolveApplyUrl(applyUrl) };
        }
      }
    }

    throw new Error('LinkedIn job data has no application URL.');
  }

  function register(copyText) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === COPY_TEXT_MESSAGE && sender.tab) {
        copyText(message.value)
          .then(() => sendResponse({ ok: true }))
          .catch(() => sendResponse({ ok: false }));

        return true;
      }

      if (message?.type === LOOKUP_APPLY_URL_MESSAGE && sender.tab) {
        lookupApplyUrl(message.jobId)
          .then((result) => sendResponse({ ok: true, ...result }))
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
  }

  globalThis.linkedinPeerFinderBackground = { register };
})();
