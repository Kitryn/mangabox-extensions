import { sourceInfo } from "../../shared/config";
/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */
import { Mangabox } from "../../shared/main";
const DOMAIN = "https://www.mangabats.com";
export const MangaBatInfo = sourceInfo("MangaBat", DOMAIN);
export class MangaBat extends Mangabox {
  constructor() {
    super({
      domain: DOMAIN,
      name: "MangaBat",
      requestsPerSecond: 0.25,
      bypassPage: DOMAIN + "/manga",
    });
  }
}
