# MangaBox Extensions for Paperback 0.8

This branch contains the Paperback 0.8 backport of MangaBat, MangaKakalot, MangaNato, and MangaNelo.
The original source code is from Saw_6 and Inkdex. Kitryn maintains this backport.

## Installation

1. Open the [installation page](https://kitryn.github.io/mangabox-extensions/0.8/dev/) on your device.
2. Select **Add to Paperback**.
3. Install the required sources in Paperback.

You can also add this repository URL in Paperback:

```text
https://kitryn.github.io/mangabox-extensions/0.8/dev/
```

Use this URL for Paperback 0.8. The `/0.9/stable/` URL contains the 0.9 extensions.
If you added that URL before, remove it from the repository list and add the 0.8 URL.

## Build and test

Use Node.js 22.

```sh
npm ci
npm run conformance
```

The build writes the installation page, `versioning.json`, source bundles, and icons to `bundles/`.
The tests load all four bundles with a test model of the 0.8 API.
They check source metadata, search, home sections, manga details, chapters, image URLs, and error handling.

## Publication

A push to `0.8/dev` runs the checks and copies the build to `gh-pages:0.8/dev/`.
In the repository Pages settings, select **Deploy from a branch**, **gh-pages**, and **/(root)**.
The deployment keeps other directories on `gh-pages`.

## Test limits

The build and local tests pass. The four source sites returned HTTP 403 during the live check.
MangaBat returned a Cloudflare challenge header. This computer cannot confirm live reading in the iOS app.
Complete the device checks in [the backport notes](docs/backport-0.8.md) before you use this branch as a stable release.
