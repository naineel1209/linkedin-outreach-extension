(() => {
  'use strict';

  const INSTANCE_ATTRIBUTE = 'data-linkedin-peer-finder-initialized';

  if (document.documentElement.hasAttribute(INSTANCE_ATTRIBUTE)) {
    return;
  }

  document.documentElement.setAttribute(INSTANCE_ATTRIBUTE, '');

  const BUTTON_ATTRIBUTE = 'data-linkedin-peer-finder-button';
  const BUTTON_SELECTOR = `[${BUTTON_ATTRIBUTE}]`;
  const COPY_BUTTON_ATTRIBUTE = 'data-linkedin-copy-company-job-link-button';
  const COPY_BUTTON_SELECTOR = `[${COPY_BUTTON_ATTRIBUTE}]`;
  const WRAPPER_ATTRIBUTE = 'data-linkedin-peer-finder-action';
  const WRAPPER_SELECTOR = `[${WRAPPER_ATTRIBUTE}]`;
  const BUTTON_ID = 'linkedin-peer-finder-button';
  const COPY_BUTTON_ID = 'linkedin-copy-company-job-link-button';
  const STATUS_ATTRIBUTE = 'data-linkedin-peer-finder-status';
  const RESOLVE_APPLY_URL_MESSAGE = 'linkedin-peer-finder-resolve-apply-url';
  const COPY_TEXT_MESSAGE = 'linkedin-peer-finder-copy-text';
  const RENDER_DELAY_MS = 150;
  const MAX_RENDER_DELAY_MS = 1000;

  const titleSelectors = [
    '.job-details-jobs-unified-top-card__job-title h1',
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title',
    '[data-test-job-title]'
  ];

  const companySelectors = [
    'a[href*="/company/"][href*="/life/"]',
    'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
    'a[data-tracking-control-name="job_details_topcard_company"]',
    '.job-details-jobs-unified-top-card__primary-description-container a[href*="/company/"]',
    '.job-details-jobs-unified-top-card__primary-description-container a',
    '.jobs-unified-top-card__primary-description-container a[href*="/company/"]',
    '.jobs-unified-top-card__primary-description-container a',
    '.job-details-jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name',
    '[class*="jobs-unified-top-card"] a[href*="/company/"]',
    '[class*="jobs-unified-top-card"] [class*="company-name"]',
    '[class*="jobs-unified-top-card"] [data-test*="company"]',
    '[data-test-job-company-name]',
    '.job-details-jobs-unified-top-card a[href*="/company/"]',
    '.jobs-unified-top-card a[href*="/company/"]'
  ];

  const headerSelectors = [
    '.job-details-jobs-unified-top-card__container--two-pane',
    '.job-details-jobs-unified-top-card__content--two-pane',
    '.job-details-jobs-unified-top-card',
    '.jobs-unified-top-card',
    '[data-test-job-title]',
    'h1'
  ];

  let lastUrl = window.location.href;
  let renderTimer;
  let renderScheduleStart = 0;

  function normalizeText(value) {
    return value ? value.replace(/\s+/g, ' ').trim() : '';
  }

  function setStatus(status) {
    document.documentElement.setAttribute(STATUS_ATTRIBUTE, status);
  }

  function firstText(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = normalizeText(element?.textContent);

      if (text) {
        return text;
      }
    }

    return '';
  }

  function findJobPosting(value) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const jobPosting = findJobPosting(item);

        if (jobPosting) {
          return jobPosting;
        }
      }

      return null;
    }

    if (!value || typeof value !== 'object') {
      return null;
    }

    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];

    if (types.includes('JobPosting')) {
      return value;
    }

    return findJobPosting(value['@graph']);
  }

  function getStructuredJobDetails() {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const jobPosting = findJobPosting(JSON.parse(script.textContent));
        const title = normalizeText(jobPosting?.title);
        const company = normalizeText(jobPosting?.hiringOrganization?.name);

        if (title && company) {
          return { title, company };
        }
      } catch {
        // Ignore invalid structured data from the page.
      }
    }

    return { title: '', company: '' };
  }

  function getCompanyFromDocumentTitle() {
    const pageTitle = normalizeText(document.title).replace(/\s*\|\s*LinkedIn\s*$/i, '');
    const hiringMatch = pageTitle.match(/^(.+?)\s+hiring\s+.+?(?:\s+in\s+.+)?$/i);

    if (hiringMatch) {
      return normalizeText(hiringMatch[1]);
    }

    const companyMatch = pageTitle.match(/^.+?\s+(?:at|-)\s+(.+?)(?:\s+in\s+.+)?$/i);

    return normalizeText(companyMatch?.[1]);
  }

  function getTitleFromDocumentTitle() {
    const pageTitle = normalizeText(document.title).replace(/\s*\|\s*LinkedIn\s*$/i, '');
    const hiringMatch = pageTitle.match(/^.+?\s+hiring\s+(.+?)(?:\s+in\s+.+)?$/i);

    if (hiringMatch) {
      return normalizeText(hiringMatch[1]);
    }

    const jobMatch = pageTitle.match(/^(.+?)\s+(?:at|-)\s+.+?(?:\s+in\s+.+)?$/i);

    return normalizeText(jobMatch?.[1]);
  }

  function getCurrentJobId() {
    const selectedJobId = new URLSearchParams(window.location.search).get('currentJobId');

    if (selectedJobId) {
      return selectedJobId;
    }

    return window.location.pathname.match(/^\/jobs\/view\/(\d+)/)?.[1] || '';
  }

  function getTitleFromCurrentJobLink() {
    const jobId = getCurrentJobId();

    if (!jobId) {
      return '';
    }

    const jobLink = [...document.querySelectorAll('a[href*="/jobs/view/"]')].find((link) => (
      link.href.includes(`/jobs/view/${jobId}`)
    ));

    return normalizeText(jobLink?.textContent);
  }

  function getTitleFromJobSummary() {
    const labels = [...document.querySelectorAll('div, span, dt')].filter((element) => (
      normalizeText(element.textContent) === 'Job Title'
    ));

    for (const label of labels) {
      const parent = label.parentElement;
      const siblings = parent ? [...parent.children] : [];
      const labelIndex = siblings.indexOf(label);
      const candidates = [
        label.nextElementSibling,
        labelIndex >= 0 ? siblings[labelIndex + 1] : null,
        parent?.nextElementSibling
      ];

      for (const candidate of candidates) {
        const title = normalizeText(candidate?.textContent);

        if (title && title !== 'Job Title' && title.length <= 160) {
          return title;
        }
      }

      const parentText = normalizeText(parent?.textContent);
      const inlineTitle = normalizeText(parentText.replace(/^Job Title\s*/i, ''));

      if (inlineTitle && inlineTitle.length <= 160) {
        return inlineTitle;
      }
    }

    return '';
  }

  function getJobDetails() {
    const title = firstText(titleSelectors) || normalizeText(document.querySelector('h1')?.textContent);
    const company = firstText(companySelectors);
    const structuredDetails = getStructuredJobDetails();

    return {
      title: title || structuredDetails.title || getTitleFromCurrentJobLink() || getTitleFromDocumentTitle() || getTitleFromJobSummary(),
      company: company || structuredDetails.company || getCompanyFromDocumentTitle()
    };
  }

  function findElement(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function findAction(actionName, preferredSelectors) {
    const preferredAction = findElement(preferredSelectors);

    if (preferredAction) {
      return preferredAction;
    }

    return [...document.querySelectorAll('button, a, [role="button"]')].find((element) => {
      const label = normalizeText(element.getAttribute('aria-label'));
      const text = normalizeText(element.textContent);
      const expression = new RegExp(`^${actionName}\\b`, 'i');

      return expression.test(label) || expression.test(text);
    }) || null;
  }

  function findApplyAction() {
    const preferredSelectors = [
      'button.jobs-apply-button',
      'button[data-control-name*="jobdetails_topcard_inapply"]',
      'a[role="button"][data-control-name*="jobdetails_topcard_inapply"]',
      'button[data-control-name*="jobdetails_topcard_apply"]',
      'a[role="button"][data-control-name*="jobdetails_topcard_apply"]'
    ];
    const preferredActions = preferredSelectors.flatMap((selector) => [
      ...document.querySelectorAll(selector)
    ]);
    const labelledAction = preferredActions.find((element) => {
      const label = normalizeText(element.getAttribute('aria-label'));
      const text = normalizeText(element.textContent);

      return /^apply\b/i.test(label) || /^easy\s+apply\b/i.test(label) ||
        /^apply\b/i.test(text) || /^easy\s+apply\b/i.test(text);
    });

    return labelledAction || preferredActions[0] || findAction('Apply', preferredSelectors);
  }

  function findJobAction() {
    return findApplyAction() || findAction('Save', [
      'button.jobs-save-button',
      'button[data-control-name*="jobdetails_topcard_save"]',
      'a[role="button"][data-control-name*="jobdetails_topcard_save"]'
    ]);
  }

  function removeButtons() {
    document.querySelectorAll(WRAPPER_SELECTOR).forEach((wrapper) => wrapper.remove());
    document.querySelectorAll(BUTTON_SELECTOR).forEach((button) => button.remove());
    document.querySelectorAll(COPY_BUTTON_SELECTOR).forEach((button) => button.remove());
  }

  function getSingleButton(selector, id) {
    const buttons = [...document.querySelectorAll(selector)];
    const currentButton = document.getElementById(id) || buttons[0];

    buttons.forEach((button) => {
      if (button !== currentButton) {
        button.remove();
      }
    });

    return currentButton || null;
  }

  function hasCurrentButtons(title, company, jobId) {
    const peerButton = getSingleButton(BUTTON_SELECTOR, BUTTON_ID);
    const copyButton = getSingleButton(COPY_BUTTON_SELECTOR, COPY_BUTTON_ID);
    const needsPeerButton = Boolean(title && company);
    const needsCopyButton = Boolean(company && jobId);
    const peerMatches = !needsPeerButton || (
      peerButton?.dataset.peerFinderTitle === title &&
      peerButton?.dataset.peerFinderCompany === company
    );
    const copyMatches = !needsCopyButton || (
      copyButton?.dataset.copyCompany === company &&
      copyButton?.dataset.copyJobId === jobId
    );

    if (
      peerMatches &&
      copyMatches &&
      Boolean(peerButton) === needsPeerButton &&
      Boolean(copyButton) === needsCopyButton
    ) {
      return true;
    }

    removeButtons();
    return false;
  }

  function createButton(title, company) {
    const button = document.createElement('button');
    const keywords = encodeURIComponent(`${title} ${company}`);
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${keywords}`;

    button.type = 'button';
    button.id = BUTTON_ID;
    button.setAttribute(BUTTON_ATTRIBUTE, '');
    button.dataset.peerFinderTitle = title;
    button.dataset.peerFinderCompany = company;
    button.textContent = `Find peers at ${company}`;
    button.setAttribute('aria-label', `Find peers at ${company}`);
    button.addEventListener('click', () => {
      window.open(searchUrl, '_blank', 'noopener');
    });

    return button;
  }

  function isEasyApplyAction(action) {
    if (!action) {
      return false;
    }

    const label = normalizeText(action.getAttribute('aria-label'));
    const text = normalizeText(action.textContent);
    const controlName = normalizeText(action.getAttribute('data-control-name'));

    return /\beasy\s+apply\b/i.test(label) || /\beasy\s+apply\b/i.test(text) ||
      /\binapply\b/i.test(controlName);
  }

  function getExternalUrl(value) {
    if (!value) {
      return '';
    }

    try {
      const url = new URL(value, window.location.origin);

      if (!/^https?:$/.test(url.protocol)) {
        return '';
      }

      const isLinkedIn = /(^|\.)linkedin\.com$/i.test(url.hostname);

      if (!isLinkedIn) {
        return url.href;
      }

      for (const parameter of ['url', 'redirect', 'redirectUrl', 'targetUrl', 'destination']) {
        const destination = url.searchParams.get(parameter);
        const externalUrl = getExternalUrl(destination);

        if (externalUrl) {
          return externalUrl;
        }
      }
    } catch {
      // Ignore invalid URLs in LinkedIn markup.
    }

    return '';
  }

  function getResolvableApplyUrl(value) {
    if (!value) {
      return '';
    }

    try {
      const url = new URL(value, window.location.origin);

      if (!/^https?:$/.test(url.protocol)) {
        return '';
      }

      if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) {
        return url.href;
      }

      for (const parameter of ['url', 'redirect', 'redirectUrl', 'targetUrl', 'destination']) {
        if (getExternalUrl(url.searchParams.get(parameter))) {
          return url.href;
        }
      }
    } catch {
      // Ignore invalid URLs in LinkedIn markup.
    }

    return '';
  }

  function getUrlValues(element) {
    if (!element) {
      return [];
    }

    const values = [];

    for (const attribute of [...element.attributes]) {
      if (attribute.name === 'href' || /(?:url|uri|linkout)$/i.test(attribute.name)) {
        values.push(attribute.value);
      }
    }

    return values;
  }

  function getExternalApplyUrl(applyAction) {
    const candidates = [];
    let element = applyAction;

    for (let level = 0; element && level < 4; level += 1) {
      candidates.push(element);
      element = element.parentElement;
    }

    document.querySelectorAll(
      'a[href], [data-apply-url], [data-job-apply-url], [data-redirect-url], [data-target-url], [data-external-url], [data-linkout-url]'
    ).forEach((candidate) => {
      const label = normalizeText(candidate.getAttribute('aria-label'));
      const text = normalizeText(candidate.textContent);
      const hasApplyUrl = candidate.hasAttribute('data-apply-url') ||
        candidate.hasAttribute('data-job-apply-url') ||
        candidate.hasAttribute('data-external-url') ||
        candidate.hasAttribute('data-linkout-url');

      if (hasApplyUrl || /\b(apply|application|continue)\b/i.test(`${label} ${text}`)) {
        candidates.push(candidate);
      }
    });

    for (const candidate of candidates) {
      for (const value of getUrlValues(candidate)) {
        const externalUrl = getResolvableApplyUrl(value);

        if (externalUrl) {
          return externalUrl;
        }
      }
    }

    return '';
  }

  function decodeUrlValue(value) {
    try {
      return JSON.parse(`"${value}"`);
    } catch {
      return value.replace(/\\u0026/gi, '&').replace(/\\\//g, '/');
    }
  }

  function isApplyUrlProperty(propertyName) {
    return /(?:apply|application|linkout|redirect|destination|target).*(?:url|uri|link)|(?:url|uri|link).*(?:apply|application|linkout|redirect|destination|target)/i.test(propertyName);
  }

  function getExternalApplyUrlFromValue(value, propertyName = '', visited = new Set(), depth = 0) {
    if (depth > 8 || value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      if (!isApplyUrlProperty(propertyName)) {
        return '';
      }

      return getResolvableApplyUrl(decodeUrlValue(value));
    }

    if (typeof value !== 'object' || visited.has(value)) {
      return '';
    }

    visited.add(value);

    for (const [key, childValue] of Object.entries(value)) {
      const externalUrl = getExternalApplyUrlFromValue(childValue, key, visited, depth + 1);

      if (externalUrl) {
        return externalUrl;
      }
    }

    return '';
  }

  function getExternalApplyUrlFromJobData() {
    const jobDataElements = document.querySelectorAll(
      'script[type="application/json"], script[type="application/ld+json"], code'
    );
    const urlProperty = /["'](?:applyUrl|applyURL|externalApplyUrl|companyApplyUrl|applyLink|linkoutUrl)["']\s*[:=]\s*["']([^"']+)["']/gi;

    for (const element of jobDataElements) {
      const jobData = element.textContent || '';

      try {
        const externalUrl = getExternalApplyUrlFromValue(JSON.parse(jobData));

        if (externalUrl) {
          return externalUrl;
        }
      } catch {
        // The page can contain non-JSON data in these elements.
      }

      let match;

      while ((match = urlProperty.exec(jobData))) {
        const externalUrl = getResolvableApplyUrl(decodeUrlValue(match[1]));

        if (externalUrl) {
          return externalUrl;
        }
      }
    }

    return '';
  }

  function getExternalApplyUrlFromReactData(applyAction) {
    let element = applyAction;

    for (let level = 0; element && level < 4; level += 1) {
      for (const propertyName of Object.keys(element)) {
        if (!propertyName.startsWith('__reactProps$')) {
          continue;
        }

        const externalUrl = getExternalApplyUrlFromValue(element[propertyName]);

        if (externalUrl) {
          return externalUrl;
        }
      }

      element = element.parentElement;
    }

    return '';
  }

  function getCanonicalJobUrl(jobId) {
    return `https://www.linkedin.com/jobs/view/${encodeURIComponent(jobId)}/`;
  }

  function resolveExternalApplyUrl(url) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        reject(new Error('The extension background worker is unavailable.'));
        return;
      }

      chrome.runtime.sendMessage({ type: RESOLVE_APPLY_URL_MESSAGE, url }, (response) => {
        if (chrome.runtime.lastError || !response?.ok || !response.url) {
          reject(new Error('The application URL could not be resolved.'));
          return;
        }

        resolve(response.url);
      });
    });
  }

  function copyWithExtensionClipboard(value) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        reject(new Error('The extension background worker is unavailable.'));
        return;
      }

      chrome.runtime.sendMessage({ type: COPY_TEXT_MESSAGE, value }, (response) => {
        if (chrome.runtime.lastError || !response?.ok) {
          reject(new Error('The extension clipboard is unavailable.'));
          return;
        }

        resolve();
      });
    });
  }

  async function copyText(value) {
    try {
      await copyWithExtensionClipboard(value);
      return;
    } catch {
      // Use the page clipboard paths when the extension clipboard is unavailable.
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // Use the legacy copy path when LinkedIn blocks the Clipboard API.
      }
    }

    const textArea = document.createElement('textarea');

    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.append(textArea);
    textArea.select();

    if (!document.execCommand('copy')) {
      textArea.remove();
      throw new Error('Clipboard access failed.');
    }

    textArea.remove();
  }

  function createCopyButton(company, jobId) {
    const button = document.createElement('button');
    const originalText = 'Copy Company Name - Job link';

    async function copyCompanyAndJobLink() {
      try {
        if (getCurrentJobId() !== jobId) {
          throw new Error('The selected job changed.');
        }

        const applyAction = findApplyAction();
        let jobUrl;

        if (isEasyApplyAction(applyAction)) {
          jobUrl = getCanonicalJobUrl(jobId);
        } else {
          const externalApplyUrl = getExternalApplyUrl(applyAction) ||
            getExternalApplyUrlFromJobData() ||
            getExternalApplyUrlFromReactData(applyAction);

          if (!externalApplyUrl) {
            throw new Error('No external application URL is available.');
          }

          jobUrl = await resolveExternalApplyUrl(externalApplyUrl);
        }

        await copyText(`${company}\t${jobUrl}`);
        button.textContent = 'Copied';
      } catch (error) {
        console.warn('[LinkedIn Peer Finder] Copy failed:', error.message);
        button.textContent = 'Copy failed';
      }

      window.setTimeout(() => {
        button.textContent = originalText;
      }, 1500);
    }

    button.type = 'button';
    button.id = COPY_BUTTON_ID;
    button.setAttribute(COPY_BUTTON_ATTRIBUTE, '');
    button.dataset.copyCompany = company;
    button.dataset.copyJobId = jobId;
    button.textContent = originalText;
    button.setAttribute('aria-label', 'Copy company name and job link');
    button.setAttribute('title', 'Copy company name and job link as tab-separated values');
    button.addEventListener('click', copyCompanyAndJobLink);

    return button;
  }

  function createActionWrapper(buttons) {
    const wrapper = document.createElement('div');

    wrapper.setAttribute(WRAPPER_ATTRIBUTE, '');
    wrapper.append(...buttons);

    return wrapper;
  }

  function getActionSlot(action) {
    const slot = action.parentElement;

    if (!slot || slot === document.body || slot === document.documentElement) {
      return action;
    }

    return slot;
  }

  function isJobPage() {
    const path = window.location.pathname;

    return /^\/jobs\/view\//.test(path) || (
      /^\/jobs\/search-results\//.test(path) &&
      new URLSearchParams(window.location.search).has('currentJobId')
    );
  }

  function renderButton() {
    if (!isJobPage()) {
      removeButtons();
      setStatus('outside-job-page');
      return;
    }

    const { title, company } = getJobDetails();
    const jobId = getCurrentJobId();

    if (!company || !jobId) {
      removeButtons();
      setStatus(!company ? 'missing-company' : 'missing-job-id');
      return;
    }

    if (hasCurrentButtons(title, company, jobId)) {
      setStatus('ready');
      return;
    }

    const buttons = [createCopyButton(company, jobId)];

    if (title) {
      buttons.unshift(createButton(title, company));
    }

    const action = findJobAction();

    if (action) {
      const actionSlot = getActionSlot(action);
      const wrapper = createActionWrapper(buttons);

      actionSlot.insertAdjacentElement('afterend', wrapper);
      setStatus('ready');
      return;
    }

    const header = findElement(headerSelectors);

    if (header) {
      header.insertAdjacentElement('afterend', createActionWrapper(buttons));
      setStatus('ready');
      return;
    }

    setStatus('missing-insertion-target');
  }

  function scheduleRender() {
    const now = Date.now();

    if (!renderScheduleStart) {
      renderScheduleStart = now;
    }

    window.clearTimeout(renderTimer);
    const elapsed = now - renderScheduleStart;
    const delay = elapsed >= MAX_RENDER_DELAY_MS
      ? 0
      : Math.min(RENDER_DELAY_MS, MAX_RENDER_DELAY_MS - elapsed);

    renderTimer = window.setTimeout(() => {
      renderTimer = undefined;
      renderScheduleStart = 0;
      renderButton();
    }, delay);
  }

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      removeButtons();
    }

    scheduleRender();
  });

  function start() {
    setStatus('running');
    renderButton();
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('popstate', () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        removeButtons();
      }

      scheduleRender();
    });
  }

  start();
})();
