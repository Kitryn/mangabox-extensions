import { sourceInfo } from "../../shared/config";
/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */
import { Mangabox } from "../../shared/main";
const DOMAIN = "https://www.nelomanga.net";
export const MangaNeloInfo = sourceInfo("MangaNelo", DOMAIN);
export class MangaNelo extends Mangabox {
  constructor() {
    super({
      domain: DOMAIN,
      name: "MangaNelo",
      requestsPerSecond: 0.25,
      bypassPage: DOMAIN + "/manga",
    });
  }
}
