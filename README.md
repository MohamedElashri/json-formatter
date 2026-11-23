# JSON Formatter for Firefox

[![Leave a tip on Ko-fi](https://img.shields.io/badge/Ko--fi-Leave%20a%20tip-913F51?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/melashri)

<img src="icons/icon-128.png" width="64" height="64" alt="JSON Formatter icon">

A JSON viewer with syntax highlighting, collapsible trees, property paths,
copy controls, and light/dark themes. Switch between tree, formatted, and raw views.

Everything runs locally, with no runtime dependencies or data collection.
See the [privacy policy](PRIVACY.md) and [screenshot](listing/screenshots/01-dark-tree.png).

## Try it

Requires Firefox 140+ on desktop.

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on** and select `manifest.json`.
3. Open a JSON response and allow website access when prompted.

If Firefox's built-in viewer takes precedence, set
`devtools.jsonview.enabled` to `false` in `about:config`, then reload.
Temporary installations last until Firefox restarts.

## Development

Requires Node.js 22+ and Python 3.

```sh
make install
make test
make package   # firefox_extension.zip for AMO upload
make source    # source_code.zip for source review
```

Use `VERSION=1.0.3 make release` to prepare a complete release.
See `make help` for all commands and [listing/](listing/) for store materials.

[Report an issue](https://github.com/MohamedElashri/json-formatter/issues)

## Support

Tips are optional and help maintain the project.

**[Leave a tip on Ko-fi](https://ko-fi.com/melashri)**

## License

[MIT license](LICENSE).
