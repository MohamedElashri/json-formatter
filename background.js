// JSON Formatter - background script
//
// Firefox treats Manifest V3 host permissions as optional, so the content
// script may not be allowed to run anywhere. This asks for access to all
// websites when it is missing and marks the toolbar button until it is granted.

const ALL_SITES = { origins: ['<all_urls>'] };

// ── Access state ──────────────────────────────────────────────────
async function updateBadge() {
  const granted = await browser.permissions.contains(ALL_SITES);
  await browser.action.setBadgeText({ text: granted ? '' : '!' });
  await browser.action.setTitle({
    title: granted ? 'JSON Formatter' : 'JSON Formatter: click to allow access to websites'
  });
}

// ── Events ────────────────────────────────────────────────────────
browser.runtime.onInstalled.addListener(async () => {
  await updateBadge();
  if (!(await browser.permissions.contains(ALL_SITES))) {
    browser.tabs.create({ url: browser.runtime.getURL('access.html') });
  }
});

browser.runtime.onStartup.addListener(updateBadge);
browser.permissions.onAdded.addListener(updateBadge);
browser.permissions.onRemoved.addListener(updateBadge);

// permissions.request() needs the click's user gesture, so call it directly.
browser.action.onClicked.addListener(() => {
  browser.permissions.request(ALL_SITES).then(updateBadge);
});

browser.action.setBadgeBackgroundColor({ color: '#d93025' });
updateBadge();
