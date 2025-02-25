<p align="center">
  <img alt="" src="graphics/readme_git_nodes.png">
</p>

# Contributors on Github

A browser extension that shows contributor information on GitHub pull requests, including whether it's a user's first contribution.

[![](firstpr.gif)](https://github.com/babel/babel/pull/3283)

Much thanks to @Pocket-titan and @djrosenbaum for working on the logo 🖼!

## Features

- [x] Shows the number of Issues/PRs a user has made to a specific repository, org, account
- [x] ~~Displays "First-time contributor" badge for new contributors~~ GitHub does this now!
- Works on any GitHub page with pull requests or issues
- Data is cached for better performance

## Installation

### Browser Extension Stores

[link-chrome]: https://chrome.google.com/webstore/detail/github-contributor-stats/cjbacdldhllelehomkmlniifaojgaeph?hl=en 'Version published on Chrome Web Store'
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/contributor-on-github/ 'Version published on Mozilla Add-ons'

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_128x128.png" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/cjbacdldhllelehomkmlniifaojgaeph.svg?label=%20">][link-chrome] also compatible with [<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge_48x48.png" width="24" alt="Edge" valign="middle">][link-chrome] [<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/opera/opera_48x48.png" width="24" alt="Opera" valign="middle">][link-chrome]

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox_128x128.png" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/contributor-on-github.svg?label=%20">][link-firefox]

### Local Installation

#### Chrome/Edge/Brave/Opera

1. Clone or [download](https://github.com/hzoo/contributors-on-github/archive/refs/heads/master.zip) this repository
2. Go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Select the `src` folder from this repository

#### Firefox

1. Clone or download this repository
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on…"
4. Select the `manifest.json` file in the `src` folder

## Usage

Once installed, the extension works automatically when you visit GitHub pull requests or issues. It injects contributor information inline, showing the number of PRs a user has made to that specific repository.

[![](injected-content.png)](https://github.com/jscs-dev/node-jscs/pull/2180)

You can click on `🔄` to refresh the data if needed (data is cached in browser storage).

### GitHub API Rate Limits

- Without authentication: 60 requests per hour
- With authentication token: 5,000 requests per hour

To use higher rate limits, you can add a GitHub personal access token in the extension options:

1. Create a token at [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. For public repositories: Select the `public_repo` permission
3. For private repositories: Select the `repo` permission
4. Copy the token and paste it in the extension options

<img src="options.png" alt="options" height="300px">

## Permissions

- `github.com/*/*`: Allows the extension to inject data into GitHub pages
- `api.github.com/*`: Needed to fetch issue/PR data from GitHub's API
- `storage`: Stores your access token and caches user PR data

## Related Projects

- [Awesome browser extensions for GitHub](https://github.com/stefanbuck/awesome-browser-extensions-for-github)
- [Refined GitHub](https://github.com/sindresorhus/refined-github/)

## License

MIT
