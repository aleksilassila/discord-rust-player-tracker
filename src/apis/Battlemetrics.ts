import axios, { AxiosPromise, AxiosRequestConfig, AxiosResponse } from "axios";
import { BATTLEMETRICS_TOKEN } from "../config";
import { getPlayerInfo } from "./battemetrics/get-player-info";
import { getServerInfo } from "./battemetrics/get-server-info";
import { getSessions } from "./battemetrics/get-sessions";

class Request<T> {
  static REQUEST_PER_SECOND = 5;

  static requests: Request<any>[] = [];

  config: AxiosRequestConfig;
  createTime: number;

  constructor(axiosConfig: AxiosRequestConfig) {
    this.config = axiosConfig;
    this.createTime = Date.now();
  }

  async send(): Promise<AxiosResponse<T>> {
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
          }).catch((err) => {
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
