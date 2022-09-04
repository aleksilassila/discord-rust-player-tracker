import { fetch } from "../Battlemetrics";

export interface PlayerSession {
  type?: "session";
  id?: string;
  attributes?: {
    start?: string;
    stop?: string | null;
    firstTime?: boolean;
    name?: string;
    private?: boolean;
  };
  relationships?: {
    server?: {
      data?: {
        type?: "server";
        id?: string;
      };
    };
    player?: {
      data?: {
        type?: "player";
        id?: string;
      };
    };
    identifiers?: {
      data?: {
        type?: "identifier";
        id?: string;
      }[];
    };
  };
}

export async function getSessions(
  playerId: string,
  serverIds?: string[]
): Promise<PlayerSession[] | undefined> {
  return fetch<{ data?: PlayerSession[] }>({
    url: "/players/" + playerId + "/relationships/sessions",
    params: {
      ...(serverIds?.length && { "filter[servers]": serverIds.join(",") }),
      "page[size]": 100,
    },
  })
    .then((res) => {
      return res.data?.data;
    })
    .catch((err) => {
      console.error(err);
      return undefined;
    });
}
