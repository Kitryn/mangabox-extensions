# Paperback 0.8 backport

## Basis

The source branch was `0.9/stable` at commit `4883f3d0514000dc801516f631529e549a0812bd`.
The backport uses `@paperback/types` and `@paperback/toolchain` version `0.8.7`.
Both versions are fixed in `package.json` and `package-lock.json`.

Primary references:

- [Official Paperback 0.8 source](https://github.com/Paperback-iOS/extensions-default/blob/961ab84a330d08fbb4b2a8ebdca27ce37175ebb8/src/Paperback/Paperback.ts)
- [Official Paperback 0.8 build configuration](https://github.com/Paperback-iOS/extensions-default/blob/961ab84a330d08fbb4b2a8ebdca27ce37175ebb8/package.json)
- [Published 0.8.7 API types](https://www.npmjs.com/package/@paperback/types/v/0.8.7)
- [Published 0.8.7 build tool](https://www.npmjs.com/package/@paperback/toolchain/v/0.8.7)
- [Original source](https://github.com/inkdex/mangabox-extensions/tree/4883f3d0514000dc801516f631529e549a0812bd)

The installed SDK declarations and build tool code were also examined.
These include `SourceInfo`, `Source`, `RequestManager`, `MangaInfo`, `SearchRequest`, and the bundle command.

## Cause of the installation error

Paperback 0.8 requires `author` in each entry of `versioning.json`.
The 0.9 index uses a different metadata format. The screenshot shows the 0.8 decoder stopping at this missing field.
Adding the field alone does not convert the runtime API or bundle layout.

## API changes

| Area           | 0.9 source                                            | 0.8 backport                                       |
| -------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Entry point    | Exported extension instance and `pbconfig.ts`         | Exported source class and `<Source>Info`           |
| Metadata       | `developers`, `capabilities`, `badges`                | `author`, numeric `intents`, `sourceTags`          |
| Runtime        | `Application`                                         | `App` factories and a source request manager       |
| Requests       | Response and `ArrayBuffer` pair                       | Response with string `data`                        |
| Manga details  | `mangaId`, `primaryTitle`, `thumbnailUrl`, `synopsis` | `id`, `titles`, `image`, `desc`                    |
| Chapters       | `getChapters(sourceManga)`                            | `getChapters(mangaId)`                             |
| Chapter pages  | `getChapterDetails(chapter)`                          | `getChapterDetails(mangaId, chapterId)`            |
| Chapter fields | `chapterId`, `title`, `publishDate`                   | `id`, `name`, `time`                               |
| Home page      | Discover section methods                              | Section callback and `getViewMoreItems`            |
| Search         | Query metadata and filter form                        | `SearchRequest.includedTags` and `getSearchTags`   |
| Search results | `items`, `imageUrl`                                   | `results`, `image`                                 |
| Tags           | `title`                                               | `label`                                            |
| Cloudflare     | Registered interceptors and `CloudflareError`         | Bypass intent, bypass request, host cookie store   |
| Bundle         | `index.js`, `info.json`, `static/icon.png`            | `source.js`, repository index, `includes/icon.png` |

The backport keeps the source IDs, domains, manga IDs, and chapter IDs.
The source version is `1.0.0`. It is greater than the original prerelease version.
The default request rate is 0.25 requests per second. MangaKakalot uses one request per second.
The 0.8 rate limit cannot reproduce the 0.9 burst and image settings exactly.

The 0.8 genre search uses the first included genre, as the upstream source supports one genre per request.
The 0.8 interface does not have the same one-genre form limit as the 0.9 interface.
Malformed chapter data now causes an error instead of an empty chapter list.

## Installation files and workflows

The upstream `gh-pages` branch was fetched. It contains the 0.9 build.
The 0.8 build has its own `0.8/dev/` directory and installation URL.
The source branch has a build workflow that checks the code before deployment.
The upstream registry workflow is removed from this branch. The fork does not have its app credentials.
The old 0.9 test workflow is replaced by bundle tests in the build checks.
The branch deletion workflow is removed from this branch to prevent unintended Pages directory removal.
Shared code is outside `src/` because the 0.8 build tool expects each source directory to have a matching entry point.

## Verification

`npm run conformance` runs the TypeScript check, bundle build, and seven test groups.
The bundle tests run without the 0.9 `Application` global, Node module loading, or browser globals.
The test model checks the required 0.8 factory fields. It is not the iOS runtime.
Fixtures check all four sources, pagination, title search, genre search, manga details, chapter lists, and page URLs.
The tests also check request headers, Cloudflare responses, invalid data, installation links, and icon paths.

The live check returned HTTP 403 for all four source sites.
MangaBat returned `cf-mitigated: challenge`.
No live manga or image download was confirmed. No test was run inside Paperback 0.8 on an iOS device.

The legacy build dependency tree reports 16 npm audit findings: 4 low, 4 moderate, and 8 high.
The build tools are development dependencies. These findings are not a measurement of the generated bundle.
The SDK is fixed at 0.8.7 to keep the 0.8 API. A dependency security review is outside this API backport.

## Device check

1. Add the 0.8 repository URL in Paperback 0.8.
2. Confirm that the app lists all four sources without the `author` error.
3. Install a source and open its home page.
4. If a Cloudflare check appears, complete it and try again.
5. Search for a title. Open its details and chapter list.
6. Open a chapter and check its images.
7. Check genre search, the next results page, and a chapter download.
8. Repeat these checks for each source you use.

Cloudflare completion and image download behavior require the device check.
