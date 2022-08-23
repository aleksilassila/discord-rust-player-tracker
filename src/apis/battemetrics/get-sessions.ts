import { fetchBM as fetch } from "../fetcher";

export interface PlayerSession {
  type: "session";
  id: string;
  attributes: {
    start: string;
    stop: string | null;
    firstTime: boolean;
    name: string;
    private: boolean;
  };
  relationships: {
    server: {
      data: {
        type: "server";
        id: string;
      };
    };
    player: {
      data: {
        type: "player";
        id: string;
      };
    };
    identifiers: {
      data: {
        type: "identifier";
        id: string;
      }[];
    };
  };
}

export async function getSessions(playerId: string): Promise<PlayerSession[]> {
  return fetch<{ data: PlayerSession[] }>({
    url: "/players/" + playerId + "/relationships/sessions",
  }).then((res) => res.data?.data);
}
