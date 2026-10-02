# Favoji

Favoji is a Firefox WebExtension that lets you override a tab favicon with an
emoji for the tab's lifetime.

## Development Install

1. Open Firefox.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click `Load Temporary Add-on...`.
4. Select `manifest.json` from this directory.

Firefox unloads temporary add-ons when the browser restarts. Reload the add-on
from the same page after editing extension files.

## Usage

Open the Favoji toolbar popup on a page:

1. Browse emoji categories or search by keyword.
2. Click an emoji to apply it to the current tab.
3. Click `Restore Original Favicon` to undo the override.

Overrides last until the tab is closed or you restore the original favicon.

## Limitations

Favoji cannot run on Firefox-protected pages such as `about:*`,
`addons.mozilla.org`, or pages where WebExtensions are blocked.

Emoji favicons are rendered as transparent SVG text, so they inherit the browser
tab background behind them.
