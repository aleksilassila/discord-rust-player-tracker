import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { BATTLEMETRICS_TOKEN } from "../config";

type ApiService = "battlemetrics" | "discord";

export class Fetcher {
  private service: ApiService;
  private rateLimitPerMin = 60;

  constructor(service: ApiService) {
    this.service = service;
  }

  fetch<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return axios({
      ...config,
      url: "https://api.battlemetrics.com" + config.url,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${BATTLEMETRICS_TOKEN}`,
      },
    });
  }
}

export const fetchBM = new Fetcher("battlemetrics").fetch;
