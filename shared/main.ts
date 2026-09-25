/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */
import {
  Source,
  ContentRating,
  HomeSectionType,
  HomeSection,
  SearchRequest,
  RequestManager,
  PagedResults,
} from "@paperback/types";
import * as cheerio from "cheerio";

import { MangaboxInterceptor } from "./network";
import { MangaboxParser } from "./parsers";

type Metadata = { page?: number };
const SECTIONS = [
  { id: "new_titles", title: "New Titles", path: "new-manga", type: HomeSectionType.featured },
  {
    id: "latest_updates",
    title: "Latest Updates",
    path: "latest-manga",
    type: HomeSectionType.singleRowNormal,
  },
  {
    id: "most_popular",
    title: "Most Popular",
    path: "hot-manga",
    type: HomeSectionType.singleRowNormal,
  },
  {
    id: "completed_titles",
    title: "Completed Titles",
    path: "completed-manga",
    type: HomeSectionType.singleRowNormal,
  },
];
export class Mangabox extends Source {
  readonly domain: string;
  readonly name: string;
  readonly language = "en";
  readonly defaultContentRating = ContentRating.EVERYONE;
  readonly bypassPage: string;
  readonly requestManager: RequestManager;
  readonly parser = new MangaboxParser();
  constructor(params: {
    domain: string;
    name: string;
    requestsPerSecond: number;
    bypassPage: string;
  }) {
    super(cheerio.load(""));
    this.domain = params.domain;
    this.name = params.name;
    this.bypassPage = params.bypassPage;
    this.requestManager = App.createRequestManager({
      requestsPerSecond: params.requestsPerSecond,
      requestTimeout: 30000,
      interceptor: new MangaboxInterceptor(this),
    });
  }
  async request(path: string): Promise<string> {
    const response = await this.requestManager.schedule(
      App.createRequest({ url: this.domain + path, method: "GET" }),
      1,
    );
    if (response.status !== 200)
      throw new Error(
        `Request failed (${response.status}). Open the source website to complete the Cloudflare check.`,
      );
    if (response.data === undefined) throw new Error("The response has no data.");
    return response.data;
  }
  async getMangaDetails(mangaId: string) {
    return this.parser.parseMangaDetails(
      cheerio.load(await this.request(`/manga/${mangaId}`)),
      mangaId,
      this,
    );
  }
  async getChapters(mangaId: string) {
    const data = await this.request(`/api/manga/${mangaId}/chapters?limit=9000&offset=0`);
    return this.parser.parseChapterList(JSON.parse(data), mangaId, this);
  }
  async getChapterDetails(mangaId: string, chapterId: string) {
    return this.parser.parseChapterDetails(
      cheerio.load(await this.request(`/manga/${mangaId}/${chapterId}`)),
      mangaId,
      chapterId,
      this,
    );
  }
  async getHomePageSections(callback: (section: HomeSection) => void): Promise<void> {
    for (const section of SECTIONS) {
      const result = await this.getViewMoreItems(section.id, undefined);
      callback(
        App.createHomeSection({
          ...section,
          items: result.results,
          containsMoreItems: result.metadata !== undefined,
        }),
      );
    }
  }
  async getViewMoreItems(sectionId: string, metadata: Metadata | undefined): Promise<PagedResults> {
    const section = SECTIONS.find((section) => section.id === sectionId);
    if (!section) throw new Error(`Invalid section: ${sectionId}`);
    const page = metadata?.page ?? 1;
    const $ = cheerio.load(await this.request(`/manga-list/${section.path}?page=${page}`));
    return App.createPagedResults({
      results: await this.parser.parseSearchResults($, this, {
        includedTags: [],
        excludedTags: [],
        parameters: {},
      }),
      metadata: this.parser.isLastPage($) ? undefined : { page: page + 1 },
    });
  }
  async getSearchTags() {
    return this.parser.parseSearchTags(cheerio.load(await this.request("/")));
  }
  async getSearchResults(
    query: SearchRequest,
    metadata: Metadata | undefined,
  ): Promise<PagedResults> {
    const page = metadata?.page ?? 1;
    const genre = query.includedTags?.[0]?.id;
    const path = query.title
      ? `/search/story/${encodeURIComponent(this.sanitizeQuery(query.title))}`
      : genre
        ? `/genre/${encodeURIComponent(genre)}`
        : "/manga-list/latest-manga";
    const $ = cheerio.load(await this.request(`${path}?page=${page}`));
    return App.createPagedResults({
      results: await this.parser.parseSearchResults($, this, query),
      metadata: this.parser.isLastPage($) ? undefined : { page: page + 1 },
    });
  }
  async getCloudflareBypassRequestAsync() {
    return App.createRequest({
      url: this.bypassPage,
      method: "GET",
      headers: {
        referer: `${this.domain}/`,
        origin: this.domain,
        "user-agent": await this.requestManager.getDefaultUserAgent(),
      },
    });
  }
  getMangaShareUrl(mangaId: string): string {
    return `${this.domain}/manga/${mangaId}`;
  }
  sanitizeQuery(query: string): string {
    return query
      .replace(/'[^ ]*/g, "")
      .replace(/\.+/g, "")
      .replace(/["']/g, "")
      .trim();
  }
}
