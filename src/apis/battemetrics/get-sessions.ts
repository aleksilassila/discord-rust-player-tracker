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

export interface ParsedSession {
  id: string;
  start: string;
  stop: string | null;
  playerId: string;
  serverId: string;
}

export async function getSessions(
  playerId: string,
  serverIds?: string[]
): Promise<ParsedSession[] | undefined> {
  return fetch<{ data?: PlayerSession[] }>({
    url: "/players/" + playerId + "/relationships/sessions",
    params: {
      ...(serverIds?.length && { "filter[servers]": serverIds.join(",") }),
      "page[size]": 100,
    },
  })
    .then((res) => {
      const parsedSessions: ParsedSession[] = [];

      for (const session of res.data?.data || []) {
        if (
          !session.id ||
          !session.attributes?.start ||
          !session.relationships?.server?.data?.id
        )
          continue;
        parsedSessions.push({
          id: session.id,
          start: session.attributes.start,
          stop: session.attributes.stop || null,
          playerId,
          serverId: session.relationships?.server?.data?.id,
        });
      }

      return parsedSessions;
    })
    .catch((err) => {
      console.error(err);
      return undefined;
    });
}
