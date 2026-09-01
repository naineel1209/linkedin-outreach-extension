(() => {
  'use strict';

  const INSTANCE_ATTRIBUTE = 'data-linkedin-profile-tools-initialized';
  const BUTTON_ATTRIBUTE = 'data-linkedin-copy-profile-url-button';
  const BUTTON_SELECTOR = `[${BUTTON_ATTRIBUTE}]`;
  const WRAPPER_ATTRIBUTE = 'data-linkedin-copy-profile-url-action';
  const WRAPPER_SELECTOR = `[${WRAPPER_ATTRIBUTE}]`;
  const PROFILE_NAME_ATTRIBUTE = 'data-linkedin-profile-tools-name';
  const PROFILE_URL_ATTRIBUTE = 'data-linkedin-profile-tools-url';
  const PROFILE_DETAILS_SELECTOR = `[${PROFILE_NAME_ATTRIBUTE}][${PROFILE_URL_ATTRIBUTE}]`;
  const CONNECT_SELECTOR = [
    'a[href*="/preload/custom-invite/"]',
    'a[href*="/preload/search-custom-invite/"]',
    'a[aria-label^="Invite "][aria-label$=" to connect"]'
  ].join(', ');
  const RENDER_DELAY_MS = 200;

  if (document.documentElement.hasAttribute(INSTANCE_ATTRIBUTE)) {
    return;
  }

  document.documentElement.setAttribute(INSTANCE_ATTRIBUTE, '');

  let lastUrl = window.location.href;
  let renderTimer;

  function normalizeText(value) {
    return value ? value.replace(/\s+/g, ' ').trim() : '';
  }

  function isPeopleSearchPage() {
    return /^\/search\/results\/people\/?$/.test(window.location.pathname);
  }

  function isIndividualProfilePage() {
    return /^\/in\/[^/]+\/?$/.test(window.location.pathname);
  }

  function isProfileAction(element) {
    const label = normalizeText(element.getAttribute('aria-label'));
    const text = normalizeText(element.textContent);

    return /^(connect|message|more)\b/i.test(label) || /^(connect|message|more)\b/i.test(text);
  }

  function getCleanProfileUrl(value) {
    const profileUrl = new URL(value, window.location.origin);

    profileUrl.search = '';
    profileUrl.hash = '';
    return profileUrl.href;
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textArea = document.createElement('textarea');

    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.append(textArea);
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }

  function createCopyButton(profileName, profileUrl, usesSearchUrl = false) {
    const button = document.createElement('button');

    function stopCardNavigation(event) {
      event.stopImmediatePropagation();
      event.stopPropagation();
    }

    async function copyProfileDetails(event) {
      event.preventDefault();
      stopCardNavigation(event);

      const originalText = button.textContent;

      try {
        await copyText(`${profileName}\t${profileUrl}`);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Copy failed';
      }

      window.setTimeout(() => {
        button.textContent = originalText;
      }, 1500);
    }

    button.type = 'button';
    button.setAttribute(BUTTON_ATTRIBUTE, '');
    button.textContent = usesSearchUrl ? 'Copy name + search' : 'Copy profile';
    button.setAttribute(
      'aria-label',
      usesSearchUrl ? 'Copy profile name and LinkedIn search URL' : 'Copy profile name and URL'
    );
    button.setAttribute(
      'title',
      usesSearchUrl ? 'Copy name and LinkedIn search URL' : 'Copy name and profile URL'
    );
    button.style.setProperty('align-items', 'center', 'important');
    button.style.setProperty('box-sizing', 'border-box', 'important');
    button.style.setProperty('display', 'inline-flex', 'important');
    button.style.setProperty('flex', '0 0 auto', 'important');
    button.style.setProperty('height', '34px', 'important');
    button.style.setProperty('justify-content', 'center', 'important');
    button.style.setProperty('min-height', '34px', 'important');
    ['pointerdown', 'mousedown', 'mouseup', 'touchstart', 'keydown'].forEach((eventName) => {
      button.addEventListener(eventName, stopCardNavigation);
    });
    button.addEventListener('click', copyProfileDetails, true);

    return button;
  }

  function getActionSlot(action) {
    const directParent = action.parentElement;

    if (
      directParent &&
      directParent.getAttribute('data-display-contents') === 'true'
    ) {
      return directParent;
    }

    return action;
  }

  function addCopyButton(target, profileName, profileUrl, root, usesSearchUrl = false) {
    if (!target || !profileName || !profileUrl || root.querySelector(BUTTON_SELECTOR)) {
      return;
    }

    const wrapper = document.createElement('div');

    wrapper.setAttribute(WRAPPER_ATTRIBUTE, '');
    wrapper.style.setProperty('display', 'contents', 'important');
    wrapper.append(createCopyButton(profileName, profileUrl, usesSearchUrl));
    target.insertAdjacentElement('afterend', wrapper);
  }

  function getConnectProfileDetails(action) {
    const connectUrl = new URL(action.href, window.location.origin);
    const vanityName = connectUrl.searchParams.get('vanityName');
    const label = normalizeText(action.getAttribute('aria-label'));
    const nameMatch = label.match(/^Invite\s+(.+?)\s+to\s+connect$/i);

    if (!vanityName || !nameMatch?.[1]) {
      return null;
    }

    return {
      profileName: normalizeText(nameMatch[1]),
      profileUrl: `${window.location.origin}/in/${encodeURIComponent(vanityName)}/`,
      usesSearchUrl: false
    };
  }

  function findActionGroup(action) {
    return getActionSlot(action).parentElement || action.parentElement || document.body;
  }

  function findProfileRoot(action) {
    return action.closest(
      '[data-chameleon-result-urn], .reusable-search__result-container, .entity-result, li, article'
    ) || findActionGroup(action);
  }

  function saveProfileDetails(action, profileDetails) {
    [findActionGroup(action), findProfileRoot(action)].forEach((root) => {
      if (!root || root === document.body) {
        return;
      }

      root.setAttribute(PROFILE_NAME_ATTRIBUTE, profileDetails.profileName);
      root.setAttribute(PROFILE_URL_ATTRIBUTE, profileDetails.profileUrl);
    });
  }

  function getSavedProfileDetails(action) {
    const root = action.closest(PROFILE_DETAILS_SELECTOR);
    const profileName = normalizeText(root?.getAttribute(PROFILE_NAME_ATTRIBUTE));
    const profileUrl = normalizeText(root?.getAttribute(PROFILE_URL_ATTRIBUTE));

    return profileName && profileUrl ? { profileName, profileUrl, usesSearchUrl: false } : null;
  }

  function isPendingAction(action) {
    const label = normalizeText(action.getAttribute('aria-label'));
    const text = normalizeText(action.textContent);

    return /^pending\b/i.test(label) || /^pending\b/i.test(text);
  }

  function getProfileUrlFromValue(value) {
    if (!value) {
      return '';
    }

    try {
      const url = new URL(value, window.location.origin);
      const directMatch = url.pathname.match(/^\/in\/([^/?#]+)\/?$/i);

      if (directMatch) {
        return getCleanProfileUrl(url.href);
      }

      // LinkedIn sometimes wraps a profile link in a safety redirect.
      for (const parameter of ['url', 'redirect', 'redirectUrl']) {
        const destination = url.searchParams.get(parameter);
        const profileMatch = destination?.match(/(?:https?:\/\/(?:www\.)?linkedin\.com)?(\/in\/[^\s"'<>?#/]+\/?)/i);

        if (profileMatch?.[1]) {
          return getCleanProfileUrl(profileMatch[1]);
        }
      }
    } catch {
      // Ignore an invalid value supplied by LinkedIn markup.
    }

    return '';
  }

  function getProfileUrlsFromRow(row) {
    const profileUrls = new Set();
    const profileLinks = row.querySelectorAll('a[href]');

    profileLinks.forEach((profileLink) => {
      const profileUrl = getProfileUrlFromValue(profileLink.href);

      if (profileUrl) {
        profileUrls.add(profileUrl);
      }
    });

    if (profileUrls.size) {
      return profileUrls;
    }

    const elements = [row, ...row.querySelectorAll('*')].slice(0, 150);

    for (const element of elements) {
      for (const attribute of element.attributes) {
        const match = attribute.value.match(/(?:https?:\/\/(?:www\.)?linkedin\.com)?(\/in\/[^\s"'<>?#/]+\/?)/i);

        if (match?.[1]) {
          const profileUrl = getProfileUrlFromValue(match[1]);

          if (profileUrl) {
            profileUrls.add(profileUrl);
          }
        }
      }
    }

    return profileUrls;
  }

  function getProfileUrlFromVisibleNameLink(row, profileName) {
    const name = normalizeText(profileName).toLocaleLowerCase();

    if (!name) {
      return '';
    }

    const links = [
      ...(row.matches('a[href]') ? [row] : []),
      ...row.querySelectorAll('a[href]')
    ];

    for (const link of links) {
      const linkName = normalizeText(link.textContent || link.getAttribute('aria-label')).toLocaleLowerCase();
      const profileUrl = getProfileUrlFromValue(link.href);

      if (profileUrl && (linkName === name || linkName.includes(name))) {
        return profileUrl;
      }
    }

    return '';
  }

  function getProfileUrlFromResultRow(action, profileName) {
    let row = action.parentElement;

    for (let level = 0; row && row !== document.body && level < 10; level += 1) {
      const visibleNameUrl = getProfileUrlFromVisibleNameLink(row, profileName);

      if (visibleNameUrl) {
        return visibleNameUrl;
      }

      const profileUrls = getProfileUrlsFromRow(row);

      if (profileUrls.size === 1) {
        return [...profileUrls][0];
      }

      row = row.parentElement;
    }

    return '';
  }

  function getPendingProfileDetails(action) {
    const savedProfileDetails = getSavedProfileDetails(action);

    if (savedProfileDetails) {
      return savedProfileDetails;
    }

    const label = normalizeText(action.getAttribute('aria-label'));
    const nameMatch = label.match(/^Pending,\s*click to withdraw invitation sent to\s+(.+)$/i);
    const profileName = normalizeText(nameMatch?.[1]);

    if (!profileName) {
      return null;
    }

    const profileUrl = getProfileUrlFromResultRow(action, profileName);

    if (profileUrl) {
      return { profileName, profileUrl, usesSearchUrl: false };
    }

    return {
      profileName,
      profileUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(profileName)}`,
      usesSearchUrl: true
    };
  }

  function findResultRoot(profileLink) {
    return profileLink.closest(
      '[data-chameleon-result-urn], .reusable-search__result-container, .entity-result, li'
    );
  }

  function renderPeopleSearchButtons() {
    const handledResults = new Set();

    document.querySelectorAll(CONNECT_SELECTOR).forEach((action) => {
      const profileDetails = getConnectProfileDetails(action);
      const actionSlot = getActionSlot(action);
      const actionGroup = findActionGroup(action);

      if (!profileDetails || handledResults.has(actionSlot)) {
        return;
      }

      handledResults.add(actionSlot);
      saveProfileDetails(action, profileDetails);
      addCopyButton(
        action,
        profileDetails.profileName,
        profileDetails.profileUrl,
        actionGroup,
        profileDetails.usesSearchUrl
      );
    });

    document.querySelectorAll('button, a, [role="button"]').forEach((action) => {
      const profileDetails = isPendingAction(action) ? getPendingProfileDetails(action) : null;
      const actionGroup = findActionGroup(action);

      if (!profileDetails || handledResults.has(actionGroup)) {
        return;
      }

      handledResults.add(actionGroup);
      addCopyButton(
        action,
        profileDetails.profileName,
        profileDetails.profileUrl,
        actionGroup,
        profileDetails.usesSearchUrl
      );
    });

    document.querySelectorAll('a[href*="/in/"]').forEach((profileLink) => {
      const result = findResultRoot(profileLink);

      if (!result || handledResults.has(result)) {
        return;
      }

      const profileName = normalizeText(profileLink.textContent) ||
        normalizeText(profileLink.getAttribute('aria-label')) ||
        normalizeText(result.querySelector('img[alt]')?.getAttribute('alt'));

      if (!profileName) {
        return;
      }

      const profileUrl = getCleanProfileUrl(profileLink.href);
      const action = [...result.querySelectorAll('button, a, [role="button"]')]
        .find(isProfileAction);

      handledResults.add(result);
      addCopyButton(action || profileLink, profileName, profileUrl, result);
    });
  }

  function getIndividualProfileName() {
    const heading = normalizeText(document.querySelector('h1')?.textContent);

    if (heading) {
      return heading;
    }

    return normalizeText(document.title)
      .replace(/\s*\|\s*LinkedIn.*$/i, '')
      .split(' - ')[0]
      .trim();
  }

  function renderIndividualProfileButton() {
    const profileName = getIndividualProfileName();
    const profileUrl = getCleanProfileUrl(window.location.href);
    const action = [...document.querySelectorAll('button, a, [role="button"]')]
      .find(isProfileAction);
    const root = action ? findActionGroup(action) : document.body;

    addCopyButton(action || document.querySelector('h1'), profileName, profileUrl, root);
  }

  function removeButtons() {
    document.querySelectorAll(WRAPPER_SELECTOR).forEach((wrapper) => wrapper.remove());
    document.querySelectorAll(PROFILE_DETAILS_SELECTOR).forEach((root) => {
      root.removeAttribute(PROFILE_NAME_ATTRIBUTE);
      root.removeAttribute(PROFILE_URL_ATTRIBUTE);
    });
  }

  function render() {
    if (isPeopleSearchPage()) {
      renderPeopleSearchButtons();
      return;
    }

    if (isIndividualProfilePage()) {
      renderIndividualProfileButton();
      return;
    }

    removeButtons();
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        removeButtons();
      }

      render();
    }, RENDER_DELAY_MS);
  }

  render();
  new MutationObserver(scheduleRender).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  window.addEventListener('popstate', scheduleRender);
})();
