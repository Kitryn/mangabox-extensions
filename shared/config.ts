/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */
import { ContentRating, SourceInfo, SourceIntents } from "@paperback/types";

export function sourceInfo(name: string, domain: string): SourceInfo {
  return {
    name,
    version: "1.0.0",
    icon: "icon.png",
    language: "en",
    author: "Saw_6, Inkdex",
    authorWebsite: "https://github.com/Kitryn/mangabox-extensions",
    description: `Read ${name} with Paperback 0.8.`,
    websiteBaseURL: domain,
    contentRating: ContentRating.EVERYONE,
    sourceTags: [],
    intents:
      SourceIntents.MANGA_CHAPTERS |
      SourceIntents.HOMEPAGE_SECTIONS |
      SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
  };
}
