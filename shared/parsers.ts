/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */

import {
  Chapter,
  ChapterDetails,
  ContentRating,
  SearchRequest,
  PartialSourceManga,
  SourceManga,
  Tag,
  TagSection,
} from "@paperback/types";
import type { Cheerio, CheerioAPI } from "cheerio";
import { Element } from "domhandler"; // Import Element from domhandler
import { decodeHTML } from "entities";

import type { Mangabox } from "./main";

export class MangaboxParser {
  async parseMangaDetails($: CheerioAPI, mangaId: string, source: Mangabox): Promise<SourceManga> {
    const context = "div.main-wrapper";

    const title = $("img", context).attr("alt")?.trim() ?? "";

    const image = encodeURI((await this.getImageSrc($("img", context), source)) ?? "");

    const secondaryTitleBox = $(".story-alternative", context).first().text().trim();
    const secondaryTitles: string[] = secondaryTitleBox
      .replace(/^Alternative\s*:\s*/i, "")
      .split(";")
      .map((title) => title.trim())
      .filter((title) => title.length > 0);

    const authors = $('.info-wrap > div:contains("Author(s):")')
      .first()
      .clone()
      .children("p")
      .remove()
      .end()
      .text()
      .trim();

    let synopsis = $("#contentBox", context).first().text();
    synopsis = synopsis.replace(/You are reading.*bookmark\./i, "");
    synopsis = synopsis.replace(/<[^>]*>?/gm, "");
    synopsis = decodeHTML(synopsis.replace(/\s{2,}/g, " ").trim());

    const ratingParsed = $("#rate_row_cmd").text().trim();
    const rating: number = ((Number(ratingParsed.match(/rate\s*:\s*([\d.]+)/)?.[1]) || 0) / 10) * 2;

    const parsedStatus: string = $("li:contains(Status)", context).text().trim().toUpperCase();

    let status: string;
    if (parsedStatus.includes("COMPLETED")) {
      status = "Completed";
    } else {
      status = "Ongoing";
    }

    let contentRating = source.defaultContentRating;

    const genres: Tag[] = [];
    for (const obj of $("a", $("li.genres", context)).toArray()) {
      const title = $(obj).text().trim();
      const id = this.idCleaner($(obj).attr("href") ?? "");

      if (!title || !id) continue;

      // If item contains NSFW, set item to adult
      if (["adult", "mature", "smut"].includes(title.toLowerCase())) {
        contentRating = ContentRating.ADULT;
      }

      genres.push(App.createTag({ label: title, id: id }));
    }
    const tagGroups: TagSection[] = [
      App.createTagSection({ label: "Genres", id: "genres", tags: genres }),
    ];

    return App.createSourceManga({
      id: mangaId,
      mangaInfo: App.createMangaInfo({
        titles: [title, ...secondaryTitles],
        image,
        author: authors,
        desc: synopsis,
        tags: tagGroups,
        rating,
        status,
        hentai: contentRating === ContentRating.ADULT,
      }),
    });
  }

  parseChapterList(json: any, mangaId: string, source: Mangabox): Chapter[] {
    const chapters: Chapter[] = [];

    if (json.success && json.data && Array.isArray(json.data.chapters)) {
      const apiChapters = json.data.chapters;

      for (let i = 0; i < apiChapters.length; i++) {
        const item = apiChapters[i];

        const id = item.chapter_slug;
        const title = item.chapter_name;
        const chapNum = Number(item.chapter_num) || 0;
        const date = new Date(item.updated_at);

        chapters.push(
          App.createChapter({
            id,
            langCode: source.language,
            chapNum: chapNum,
            name: title,
            time: date,
            sortingIndex: apiChapters.length - i,
          }),
        );
      }
    } else {
      throw new Error(`Invalid chapter data for manga ${mangaId}`);
    }

    return chapters;
  }

  async parseChapterDetails(
    $: CheerioAPI,
    mangaId: string,
    chapterId: string,
    source: Mangabox,
  ): Promise<ChapterDetails> {
    const pages: string[] = [];

    for (const obj of $("img", "div.container-chapter-reader").toArray()) {
      const page = await this.getImageSrc($(obj), source);
      if (!page) {
        console.log(`Could not parse pages for mangaId:${mangaId} chapterId:${chapterId}`);
        continue;
      }
      pages.push(encodeURI(page));
    }

    return App.createChapterDetails({ id: chapterId, mangaId, pages });
  }

  async parseSearchTags($: CheerioAPI): Promise<TagSection[]> {
    const genres: Tag[] = [];

    const context = $('h3:contains("GENRES")').parent();

    for (const obj of $("td", context).toArray()) {
      const title = $("a", obj).attr("title")?.trim() ?? "";
      const id = this.idCleaner($("a", obj).attr("href") ?? "");

      if (!id || !title) {
        continue;
      }

      genres.push(App.createTag({ label: title, id: id }));
    }

    const TagSections: TagSection[] = [
      App.createTagSection({ label: "Genres", id: "genres", tags: genres }),
    ];

    return TagSections;
  }

  async parseSearchResults(
    $: CheerioAPI,
    source: Mangabox,
    query: SearchRequest,
  ): Promise<PartialSourceManga[]> {
    const results: PartialSourceManga[] = [];

    // Title Search
    if (query.title) {
      for (const obj of $("div.story_item").toArray()) {
        const image = encodeURI((await this.getImageSrc($("img", obj), source)) ?? "");
        const title = $(".story_name", obj).text().trim();

        const id = this.idCleaner($("a", obj).attr("href") ?? "");
        const subtitle = $(".story_chapter", obj).first().text().trim();

        if (!id || !title) {
          continue;
        }

        results.push(
          App.createPartialSourceManga({
            mangaId: id,
            image: image,
            title: decodeHTML(title),
            subtitle: decodeHTML(subtitle),
          }),
        );
      }
      return results;

      // Genre Search
    } else {
      for (const obj of $("div.list-comic-item-wrap").toArray()) {
        const image = encodeURI((await this.getImageSrc($("img", obj), source)) ?? "");
        const title = $("img", obj).attr("alt")?.trim() ?? "";

        const id = this.idCleaner($("a", obj).attr("href") ?? "");

        const subtitle = $("a.list-story-item-wrap-chapter", obj).first().text().trim();

        if (!id || !title) {
          continue;
        }

        results.push(
          App.createPartialSourceManga({
            mangaId: id,
            image: image,
            title: decodeHTML(title),
            subtitle: decodeHTML(subtitle),
          }),
        );
      }

      return results;
    }
  }

  // Utils
  async getImageSrc(imageObj: Cheerio<Element> | undefined, source: Mangabox): Promise<string> {
    let image: string | undefined;
    const sources = ["data-src", "data-lazy-src", "srcset", "src", "data-cfsrc"];

    for (const attr of sources) {
      const val = imageObj?.attr(attr);

      if (val == null || val.trim() === "") continue;

      // If it's srcset, extract the first URL
      if (attr === "srcset") {
        image = val.split(",")[0]?.trim().split(" ")[0] ?? "";
      } else {
        image = val;
      }

      break;
    }

    if (image?.startsWith("/")) {
      image = source.domain + image;
    }

    image = image?.trim().replace(/(\s{2,})/gi, "");

    image = image?.replace(/http:\/\/\//g, "http://"); // only changes urls with http protocol
    image = image?.replace(/http:\/\//g, "https://");
    // Malforumed url fix (Turns https:///example.com into https://example.com (or the http:// equivalent))
    image = image?.replace(/https:\/\/\//g, "https://"); // only changes urls with https protocol

    return decodeURI(decodeHTML(image ?? ""));
  }

  parseDate = (date: string): Date => {
    date = date.toUpperCase();

    if (date.includes("LESS THAN AN HOUR") || date.includes("JUST NOW")) {
      return new Date();
    }

    if (date.includes("YESTERDAY")) {
      return new Date(Date.now() - 86400000);
    }

    const timeUnits: Record<string, number> = {
      YEAR: 31556952000,
      MONTH: 2592000000,
      WEEK: 604800000,
      DAY: 86400000,
      HOUR: 3600000,
      MINUTE: 60000,
      SECOND: 1000,
    };

    const match = date.match(/(\d+)\s*(YEAR|MONTH|WEEK|DAY|HOUR|MINUTE|SECOND)/);
    if (match) {
      const [, numStr, unit] = match;
      const number = Number(numStr);
      return new Date(Date.now() - number * timeUnits[unit]);
    }

    return new Date(date);
  };

  idCleaner(str: string): string {
    let cleanId: string | null = str;
    cleanId = cleanId.replace(/\/$/, "");
    cleanId = cleanId.split("/").pop() ?? null;

    if (!cleanId) throw new Error(`Unable to parse id for ${str}`);
    return cleanId;
  }

  isLastPage = ($: CheerioAPI): boolean => {
    const currentPage = $(".page-select, .page_select").text();
    let totalPages = $(".page-last, .page_last").text();

    if (currentPage) {
      totalPages = (/(\d+)/g.exec(totalPages) ?? [""])[0];
      return +totalPages == +currentPage;
    }

    return true;
  };
}
