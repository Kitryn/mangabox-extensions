/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */
import { Request, Response, SourceInterceptor } from "@paperback/types";

import type { Mangabox } from "./main";

export class MangaboxInterceptor implements SourceInterceptor {
  constructor(private source: Mangabox) {}
  async interceptRequest(request: Request): Promise<Request> {
    request.headers = {
      ...request.headers,
      "user-agent": await this.source.requestManager.getDefaultUserAgent(),
      referer: `${this.source.domain}/`,
    };
    return request;
  }
  async interceptResponse(response: Response): Promise<Response> {
    // Keep challenge responses intact. Paperback 0.8 handles the bypass.
    if (
      response.status === 403 ||
      response.status === 503 ||
      response.headers?.["cf-mitigated"] === "challenge"
    )
      return response;
    if (response.status !== 200)
      throw new Error(`Request failed (${response.status}): ${response.request.url}`);
    return response;
  }
}
