import { sourceInfo } from "../../shared/config";
/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */
import { Mangabox } from "../../shared/main";
const DOMAIN = "https://www.mangakakalot.gg";
export const MangaKakalotInfo = sourceInfo("MangaKakalot", DOMAIN);
export class MangaKakalot extends Mangabox {
  constructor() {
    super({
      domain: DOMAIN,
      name: "MangaKakalot",
      requestsPerSecond: 1,
      bypassPage: DOMAIN + "/manga",
    });
  }
}
