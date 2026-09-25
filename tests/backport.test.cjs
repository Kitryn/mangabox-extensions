const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const names = ["MangaBat", "MangaKakalot", "MangaNato", "MangaNelo"];
const list = `<div class="list-comic-item-wrap"><a href="/manga/test-story"><img alt="Test &amp; Story" data-src="/cover.jpg"></a><a class="list-story-item-wrap-chapter">Chapter 2</a></div>`;
const next = '<span class="page-select">1</span><a class="page-last">Last (3)</a>';
const search =
  '<div class="story_item"><a href="/manga/test-story"><img src="/cover.jpg"></a><h3 class="story_name">Test Story</h3><a class="story_chapter">Chapter 2</a></div>';
const details = `<div class="main-wrapper"><img alt="Test Story" src="/cover.jpg"><div class="story-alternative">Alternative: Other Name; Another Name</div><div class="info-wrap"><div><p>Author(s):</p>Test Author</div></div><div id="contentBox">A test description.</div><li>Status: Completed</li><li class="genres"><a href="/genre/action">Action</a></li></div><span id="rate_row_cmd">rate : 4.5</span>`;
const tags =
  '<div><h3>GENRES</h3><table><tr><td><a href="/genre/action" title="Action">Action</a></td></tr></table></div>';
const chapter =
  '<div class="container-chapter-reader"><img data-src="/page-1.jpg"><img src="https://cdn.example/page-2.jpg"></div>';

function load(name, responder) {
  const calls = [];
  const factories = {};
  const fields = {
    createRequest: ["url", "method"],
    createSourceManga: ["id", "mangaInfo"],
    createMangaInfo: ["image", "desc", "status", "titles"],
    createChapter: ["id", "chapNum"],
    createChapterDetails: ["id", "mangaId", "pages"],
    createPartialSourceManga: ["mangaId", "image", "title"],
    createTag: ["id", "label"],
    createTagSection: ["id", "label", "tags"],
    createPagedResults: ["results"],
    createHomeSection: ["id", "title", "type", "containsMoreItems"],
  };
  for (const [factory, required] of Object.entries(fields)) {
    factories[factory] = (data) => {
      required.forEach((key) => assert.notEqual(data[key], undefined, `${factory}.${key}`));
      return { ...data };
    };
  }
  factories.createRequestManager = (config) => ({
    ...config,
    getDefaultUserAgent: async () => "Paperback 0.8 test",
    schedule: async (request) => {
      request = await config.interceptor.interceptRequest(request);
      calls.push(request);
      const result = responder ? await responder(request) : { data: list + next };
      return config.interceptor.interceptResponse({ status: 200, headers: {}, request, ...result });
    },
  });
  // No Application, Node require, Buffer, or browser globals are provided.
  const context = vm.createContext({ App: factories, console });
  vm.runInContext(fs.readFileSync(path.join("bundles", name, "source.js"), "utf8"), context);
  return { source: new context.Sources[name](), info: context.Sources[`${name}Info`], calls };
}

test("the installation index and page use the 0.8 format", () => {
  const manifest = JSON.parse(fs.readFileSync("bundles/versioning.json", "utf8"));
  assert.equal(manifest.builtWith.types, "0.8.7");
  assert.deepEqual(manifest.sources.map((s) => s.id).sort(), [...names].sort());
  for (const info of manifest.sources) {
    for (const key of ["author", "name", "desc", "version", "icon", "websiteBaseURL"])
      assert.equal(typeof info[key], "string");
    assert.equal(typeof info.intents, "number");
    assert.ok(fs.existsSync(`bundles/${info.id}/source.js`));
    assert.ok(fs.existsSync(`bundles/${info.id}/includes/${info.icon}`));
    assert.equal(info.version, load(info.id).info.version);
  }
  const html = fs.readFileSync("bundles/index.html", "utf8");
  assert.match(html, /paperback:\/\/addRepo/);
  assert.ok(
    html.includes(encodeURIComponent("https://kitryn.github.io/mangabox-extensions/0.8/dev/")) ||
      html.includes("https://kitryn.github.io/mangabox-extensions/0.8/dev/"),
  );
});
for (const name of names) {
  test(`${name}: the bundle runs with the 0.8 API`, async () => {
    const { source, calls } = load(name, (request) => {
      if (request.url.includes("/api/"))
        return {
          data: JSON.stringify({
            success: true,
            data: {
              chapters: [
                {
                  chapter_slug: "chapter-2",
                  chapter_name: "Chapter 2",
                  chapter_num: "2",
                  updated_at: "2026-01-01T00:00:00Z",
                },
              ],
            },
          }),
        };
      if (request.url.endsWith("/chapter-2")) return { data: chapter };
      if (request.url.endsWith("/manga/test-story")) return { data: details };
      if (request.url.includes("/search/story/")) return { data: search + next };
      if (request.url.endsWith("/")) return { data: tags };
      return {
        data:
          list +
          (request.url.endsWith("page=3")
            ? '<span class="page-select">3</span><a class="page-last">Last (3)</a>'
            : next),
      };
    });
    const manga = await source.getMangaDetails("test-story");
    assert.equal(manga.id, "test-story");
    assert.equal(manga.mangaInfo.titles[0], "Test Story");
    assert.equal(manga.mangaInfo.author, "Test Author");
    assert.equal(manga.mangaInfo.status, "Completed");
    assert.equal(manga.mangaInfo.tags[0].tags[0].label, "Action");
    const chapters = await source.getChapters("test-story");
    assert.equal(chapters[0].id, "chapter-2");
    assert.equal(chapters[0].name, "Chapter 2");
    assert.equal(chapters[0].time.toISOString(), "2026-01-01T00:00:00.000Z");
    const pages = await source.getChapterDetails("test-story", "chapter-2");
    assert.equal(pages.mangaId, "test-story");
    assert.equal(pages.pages.length, 2);
    assert.equal(pages.pages[0], source.domain + "/page-1.jpg");
    const sections = [];
    await source.getHomePageSections((section) => sections.push(section));
    assert.equal(sections.length, 4);
    assert.equal(sections[0].items[0].title, "Test & Story");
    assert.equal(sections[0].containsMoreItems, true);
    assert.equal(
      (await source.getViewMoreItems("latest_updates", { page: 3 })).metadata,
      undefined,
    );
    assert.equal((await source.getSearchTags())[0].tags[0].id, "action");
    const results = await source.getSearchResults(
      { title: "Test & Story", includedTags: [] },
      undefined,
    );
    assert.equal(results.results[0].mangaId, "test-story");
    assert.equal(results.metadata.page, 2);
    assert.ok(calls.at(-1).url.endsWith("/search/story/Test%20%26%20Story?page=1"));
    await source.getSearchResults(
      { includedTags: [{ id: "action", label: "Action" }] },
      { page: 2 },
    );
    assert.ok(calls.at(-1).url.endsWith("/genre/action?page=2"));
    assert.equal(calls[0].headers.referer, source.domain + "/");
    assert.equal(calls[0].headers["user-agent"], "Paperback 0.8 test");
    const bypass = await source.getCloudflareBypassRequestAsync();
    assert.equal(bypass.url, source.bypassPage);
    assert.equal(source.getMangaShareUrl("test-story"), source.domain + "/manga/test-story");
  });
}
test("request errors and invalid chapter data do not return an empty success", async () => {
  await assert.rejects(
    load("MangaBat", () => ({ status: 500 })).source.getMangaDetails("test"),
    /500/,
  );
  await assert.rejects(
    load("MangaBat", () => ({ status: 403 })).source.getMangaDetails("test"),
    /Cloudflare/,
  );
  await assert.rejects(load("MangaBat", () => ({ data: "not JSON" })).source.getChapters("test"));
  await assert.rejects(
    load("MangaBat", () => ({ data: '{"success":false}' })).source.getChapters("test"),
    /Invalid chapter data/,
  );
});
test("the interceptor preserves Cloudflare responses for the host", async () => {
  const { source } = load("MangaBat");
  const response = { status: 403, headers: { "cf-mitigated": "challenge" } };
  assert.equal(await source.requestManager.interceptor.interceptResponse(response), response);
});
