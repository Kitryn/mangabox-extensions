import { sourceInfo } from "../../shared/config";
/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */
import { Mangabox } from "../../shared/main";
const DOMAIN = "https://www.manganato.gg";
export const MangaNatoInfo = sourceInfo("MangaNato", DOMAIN);
export class MangaNato extends Mangabox {
  constructor() {
    super({
      domain: DOMAIN,
      name: "MangaNato",
      requestsPerSecond: 0.25,
      bypassPage: DOMAIN + "/search/story",
    });
  }
}
