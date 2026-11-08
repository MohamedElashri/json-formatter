# Mozilla Add-ons listing — 1.0.2

## Name
JSON Formatter

## Suggested URL slug
json-formatter-melashri

Availability is checked by AMO during submission.

## Summary
Explore JSON in a collapsible, syntax-highlighted tree with property paths, copy controls, and light and dark themes.

## Description
Make JSON responses easier to read in Firefox.

JSON Formatter turns JSON objects and arrays into an interactive tree. Collapse
nested data, expand to a chosen depth, and follow indent guides as you explore
an API response.

- Syntax-highlighted tree with collapsible objects and arrays.
- Tree, formatted, and raw views.
- Property paths on hover, with click-to-pin and copy controls.
- Copy the whole document or a nested object with children.
- Light, dark, and automatic system themes.
- Open HTTP and HTTPS links from JSON values.
- Access parsed data in the page console where page security policy permits.

**Setup on Firefox desktop:** Firefox's built-in JSON viewer may take precedence.
Open about:config, set devtools.jsonview.enabled to false, and reload your JSON
tab. The extension does not change browser preferences for you. Allow website
access on the sites where you want it to run.

All formatting happens locally. No accounts, analytics, telemetry, or data
collection. The theme preference is stored per site in local storage when
available. Copy controls depend on the page context and Firefox clipboard rules.

Works with valid JSON objects and arrays on JSON responses and single-preformatted
text pages. Ordinary HTML, invalid JSON, and top-level primitive values are left
unchanged. Very large documents are skipped to limit resource use.

## Categories
Firefox desktop: Web Development
Firefox Android, only if tested and enabled: Web Development

## Suggested tags
json, developer tools, viewer

## Homepage
https://github.com/MohamedElashri/json-formatter

## Support website
https://github.com/MohamedElashri/json-formatter/issues

## License
MIT (use the repository's LICENSE text)

## Privacy policy
Paste the full contents of PRIVACY.md.

## Release notes
New icon and public listing materials for JSON Formatter's first public AMO
release. Updates now use Mozilla Add-ons. Includes privacy and license documents
and corrected setup and compatibility instructions. Restores visible tree
collapse arrows and removes a spurious root key.

## Store media
Icon: icons/icon-128.png

Screenshot order and captions:

1. listing/screenshots/01-dark-tree.png
   Explore nested JSON in the dark theme with syntax highlighting and property paths.
2. listing/screenshots/02-light-tree.png
   Switch to a light theme and collapse the tree to focus on structure.
3. listing/screenshots/03-formatted.png
   Read a pretty-printed document in the formatted view.

Screenshots are 1280 × 800 PNGs captured from the actual extension in Firefox with
synthetic sample data. No customer data or external services are used.

## Submission settings
- Free; no payments, services, or additional hardware required.
- No experimental flag intended for this release.
- No data collection: required data collection permissions are ["none"].
- Reviewer notes: paste listing/reviewer-notes.txt.
