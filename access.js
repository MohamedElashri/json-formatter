// JSON Formatter - access page: requests permission to run on all websites.

(function () {
  'use strict';

  const ALL_SITES = { origins: ['<all_urls>'] };
  const button = document.getElementById('allow');
  const status = document.getElementById('status');

  function show(granted) {
    button.hidden = granted;
    status.textContent = granted
      ? 'Access allowed. Open any JSON page to see it formatted; you can close this tab.'
      : '';
  }

  // permissions.request() needs the click's user gesture, so call it directly.
  button.addEventListener('click', () => {
    browser.permissions.request(ALL_SITES).then((granted) => {
      show(granted);
      if (!granted) status.textContent = 'Access was not allowed. JSON pages will stay unformatted.';
    });
  });

  browser.permissions.contains(ALL_SITES).then(show);
})();
