# JSON Formatter - Firefox Extension

A beautiful, feature-rich JSON viewer browser extension for Firefox with syntax highlighting, collapsible tree view, and more. The goal of this extension is to a personal extension where I'm the main and probably the only user, so I built it with vanilla JavaScript for maximum compatibility and performance without any external dependencies. Feel free to use it and contribute if you find it useful!

## Features

- **Syntax Highlighting** - Color-coded keys, strings, numbers, booleans, and null values
- **Collapsible Tree View** - Expand/collapse nested objects and arrays with level controls
- **JSON Path Display** - Hover any property to see its full JSON path, click to pin, then copy
- **Expand/Collapse All** - Inline button to expand/collapse all children of an object
- **Three View Modes** - Tree (default), Formatted (pretty-printed), and Raw (minified)
- **Copy to Clipboard** - One-click copy JSON to clipboard
- **Console Access** - JSON payload available as `window.data` in the browser console
- **Theme Support** - Light, dark, and auto (system) themes with seamless switching
- **Indent Guide Lines** - Visual guides with hover highlighting for better readability

## Installation

### Temporary Installation (Development)

1. Open Firefox and navigate to `about:debugging`
2. Click **"This Firefox"** in the left sidebar
3. Click **"Load Temporary Add-on..."**
4. Navigate to this project directory and select `manifest.json`
5. The extension is now installed and active

**Important:** If Firefox's built-in JSON viewer still appears instead of ours:
1. Navigate to `about:config`
2. Search for `devtools.jsonview.enabled`
3. Toggle it to `false`
4. Reload any JSON pages

> **Note:** Firefox's native JSON viewer can intercept before extensions run. 
> Disabling it is a one-time setting change that all Firefox JSON viewer extensions require.

### Permanent Installation
4. Select the `manifest.json` file from this directory
5. To make it permanent, we'll need to package and sign the extension:
   - Visit [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
   - Submit the extension for signing

## Usage

Once installed, the extension automatically activates when we visit:
- Pages with `application/json` content type
- URLs ending with `.json`
- Pages containing valid JSON content

### Toolbar Controls

**View Modes:**
- **Tree** - Interactive tree view with collapsible nodes (default)
- **Formatted** - Pretty-printed JSON with syntax highlighting
- **Raw** - Minified JSON view

**Level Controls:**
- Click **All** to expand all levels
- Click **1-5** to expand to that specific nesting level

**Action Buttons:**
- **Copy** - Copy JSON to clipboard
- **Theme** - Cycle through Light → Dark → Auto themes

### Tree View Interactions

- **Expand/Collapse** - Click the ▶/▼ toggle next to objects/arrays
- **View Path** - Hover over any key to see its full JSON path
- **Pin Path** - Click on a key to pin the path display
- **Copy Path** - Click the Copy icon that appears when hovering over keys
- **Expand All Children** - Hover over an object/array and click the ⊞ button

### Console Access

The parsed JSON is available in the browser console:
```javascript
window.data    // The parsed JSON object
window.jsonData // Also available as window.jsonData
```

## Technical Details

- **Manifest Version**: 2 (compatible with Firefox)
- **Minimum Firefox Version**: +60.01 but tested on latest versions only
- **Permissions**: 
  - `activeTab` - Access to the current tab's content
  - `clipboardWrite` - Copy JSON to clipboard

## Customization

### Modifying Colors

Edit the CSS variables in `styles.css`:

```css
.jf-light-theme {
  --jf-key: #881391;
  --jf-string: #c41a16;
  --jf-number: #1c00cf;
  --jf-boolean: #0d22aa;
  --jf-null: #808080;
  /* ... more variables ... */
}
```

### Adding Features

The extension is built with vanilla JavaScript for maximum compatibility and performance. Key files:
- `content-script.js` - All logic for JSON parsing, rendering, and interactions
- `styles.css` - Complete styling with CSS custom properties for theming

## Browser Compatibility

This extension is built specifically for Firefox and uses Firefox available APIs. It is **probably not** compatible with Chrome or other browsers.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.
