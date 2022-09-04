import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { BATTLEMETRICS_TOKEN, REQUEST_CACHE_TIME } from "../config";
import { getPlayerInfo } from "./battemetrics/get-player-info";
import { getServerInfo } from "./battemetrics/get-server-info";
import { getSessions } from "./battemetrics/get-sessions";

class Request<T> {
  static REQUEST_PER_SECOND = 5;

  static requests: Request<any>[] = [];
  static cache: { [key: string]: { setTime: number; data: AxiosResponse } } =
    {};

  config: AxiosRequestConfig;
  createTime: number;

  constructor(axiosConfig: AxiosRequestConfig) {
    this.config = axiosConfig;
    this.createTime = Date.now();
  }

  static getCachedResponse(
    config: AxiosRequestConfig
  ): AxiosResponse | undefined {
    const entry =
      Request.cache[JSON.stringify({ url: config.url, params: config.params })];

    if (!entry) return;
    if (Date.now() - entry.setTime > REQUEST_CACHE_TIME) {
      return;
    }

    return entry.data;
  }

  static cacheResponse(config: AxiosRequestConfig, data: AxiosResponse) {
    Request.cache[JSON.stringify({ url: config.url, params: config.params })] =
      {
        setTime: Date.now(),
        data,
      };
  }

  async send(): Promise<AxiosResponse<T>> {
    const data = Request.getCachedResponse(this.config);

    if (data) {
      console.log("[Request] cached " + this.config.url);
      return data;
    }

    const waitTime =
      (1000 / Request.REQUEST_PER_SECOND) * Request.requests.length;

    Request.requests.push(this);

    if (Request.requests.length > 15) {
      console.warn("Battlemetrics queue exceeded 15 requests.");
    }

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        Request.requests = Request.requests.filter((i) => i !== this);
        resolve(
          await axios({
            ...this.config,
            url: "https://api.battlemetrics.com" + this.config.url,
            headers: {
              ...this.config.headers,
              Authorization: `Bearer ${BATTLEMETRICS_TOKEN}`,
            },
          })
            .then((response) => {
              console.log("[Request] fetched " + this.config.url);

              Request.cacheResponse(this.config, response);
              return response;
            })
            .catch((err) => {
              console.error(err);
              return err;
            })
        );
      }, waitTime);
    });
  }
}

export async function fetch<T>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return new Request<T>(config).send();
}

export default {
  getPlayerInfo,
  getServerInfo,
  getSessions,
};
