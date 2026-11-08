# JSON Formatter for Firefox

<img src="icons/icon-128.png" width="96" height="96" alt="JSON Formatter icon">

Read JSON responses in a collapsible tree with syntax highlighting, property paths,
and light and dark themes. Built with vanilla JavaScript and CSS, with no runtime
dependencies or data collection.

Version 1.0.2 is prepared for the first public Mozilla Add-ons (AMO) listing.
The public listing URL will be added after Mozilla publishes it.

## Features

- Syntax highlighting for keys, strings, numbers, booleans, and null in the tree.
- Collapsible objects and arrays, depth controls, and expand-all controls.
- Property paths on hover; click a row to pin a path, then copy it.
- Tree, formatted (pretty-printed), and raw (minified) views.
- Copy the full JSON document or a nested object with children.
- Light, dark, and automatic system themes.
- Indent guides and clickable HTTP/HTTPS values.
- Console access as `window.data` and `window.jsonData`, where page policy permits.

![JSON tree in the dark theme](listing/screenshots/01-dark-tree.png)

## Installation and setup

Install the signed extension from Mozilla Add-ons once the public listing is
available. Packages ending in `-unsigned.xpi` are for uploading to AMO and cannot
be permanently installed in normal Firefox.

Firefox's built-in JSON viewer can take precedence over the extension. On
Firefox desktop, open `about:config`, find `devtools.jsonview.enabled`, set it to
`false`, and reload your JSON tab. This extension does not change Firefox
preferences. Set it back to `true` to restore the built-in viewer.

Firefox may ask you to allow access to websites. Grant access on the sites where
you want JSON Formatter to run. For local JSON files, also allow access to file
URLs if Firefox offers that option.

To try a development checkout:

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on** and select `manifest.json`.
3. Complete the setup above and open a JSON response.

Temporary installations are removed when Firefox restarts.

## Usage

The extension activates on valid JSON objects or arrays served with a JSON content
type, or on a page consisting of a single `<pre>` containing JSON. Ordinary HTML,
invalid JSON, and top-level primitive values are left unchanged. Inputs longer
than 10,485,760 JavaScript string characters are skipped to limit resource use.

- **Tree / Formatted / Raw** switches the view.
- **Level** buttons expand to a selected depth; **All** expands the tree.
- Click the triangle beside an object or array to collapse it.
- Hover a row to inspect its path. Click to pin it; **Escape** clears the pin.
- Hover a nested object to reveal its copy and expand/collapse-children controls.
- **Copy** copies the formatted document. Clipboard access depends on the page
  context and Firefox's clipboard rules.
- The theme button cycles **Auto → Dark → Light**. Your choice is stored per site
  in local storage when available.

In the page's console, `window.data` and `window.jsonData` expose the parsed
document when inline scripts are permitted by the page's Content Security Policy.

## Compatibility and permissions

The manifest supports Firefox **140+ on desktop** and **142+ on Android** using
Manifest V3. Desktop is the primary tested platform; Android still needs a device
check before being advertised as tested.

Access to all websites lets the content script detect JSON responses at arbitrary
URLs. It inspects eligible documents locally and leaves other pages unchanged.
There is no background service, analytics, telemetry, or remote code. See
[the privacy policy](PRIVACY.md) for theme storage and clipboard details.

## Development and releases

The extension itself needs no build step. Python 3 and Node.js 22+ are used by the
release tools.

```sh
make install
make test
make package
```

The commands follow the same layout as DevTab. `make package` creates
`firefox_extension.zip` in the project root for manual upload to Firefox Add-ons.
The manifest is at the archive root; development dependencies are excluded.
`make source` creates `source_code.zip` separately if Mozilla requests source
code for review.

| Task | Command | Output |
| --- | --- | --- |
| Stage the extension | `make build` or `make build-firefox` | `dist/firefox/` |
| Package for Firefox | `make package` or `make package-firefox` | `firefox_extension.zip` |
| Archive source | `make source` | `source_code.zip` |
| Bump patch/minor/major | `make bump` / `make bump-minor` / `make bump-major` | Updates all three version files |
| Full preparation | `make` | Clean, install dependencies, test, and package |

Packaging also creates a versioned upload ZIP, an unsigned XPI, a listing kit,
and checksums in `dist/`. `firefox_extension.zip` and the unsigned XPI contain the
same bytes. Upload the extension ZIP to AMO; use the listing kit for store text,
the icon, and screenshots.

For a release, choose a version greater than the one already submitted to AMO:

```sh
VERSION=1.0.2 make release
```

This sets the chosen version in `manifest.json`, `package.json`, and
`package-lock.json`, then cleans, installs dependencies, runs checks, and creates
both root ZIPs plus the listing kit. Reusing the current local version is allowed
for rebuilding. `make release` requires an explicit `VERSION` and does not create
commits, tags, or submissions. Update the release notes and listing copy for each
new version. Run `make help` for all targets.

For the first public release, upload to the **listed** channel of the existing
AMO add-on, preserving `json-formatter@melashri.dev`. Listing copy and reviewer
instructions are in `listing/`. Existing private installations still require a
migration feed pointing to the signed public XPI; use
`scripts/gen-updates.sh --signed-xpi FILE --url HTTPS_URL` only after downloading
the signed release from AMO.

```sh
make icons                       # Regenerate PNGs; requires rsvg-convert
npx playwright install firefox   # One-time screenshot browser setup
npm run screenshots              # Firefox smoke checks and real UI captures
```

Edit `content-script.js` for behavior, `styles.css` for themes, and
`icons/icon.svg` for the icon. Generated PNGs and listing screenshots are committed
so packaging does not need an image renderer or browser.

Report issues and request features at
[GitHub Issues](https://github.com/MohamedElashri/json-formatter/issues).
Contributions are welcome. Licensed under [MIT](LICENSE).
