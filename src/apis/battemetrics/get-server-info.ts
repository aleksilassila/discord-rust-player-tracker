import { fetch } from "../Battlemetrics";

export interface ServerInfo {
  type?: "server";
  id?: string;
  attributes?: {
    id?: string;
    name?: string;
    ip?: string;
    port?: number;
    players?: number;
    maxPlayers?: number;
    status?: string;
    details?: {
      rust_maps?: {
        seed?: number;
        size?: number;
        url?: string;
        thumbnailUrl?: string;
      };
      rust_last_wipe?: string;
    };
  };
  relationships?: {
    game?: {
      data?: {
        type?: "game";
        id?: string;
      };
    };
  };
}

export function getServerInfo(
  serverId: string
): Promise<ServerInfo | undefined> {
  return fetch<{ data: ServerInfo }>({
    url: "/servers/" + serverId,
  })
    .then((res) => res.data?.data)
    .catch((err) => {
      console.error(err);
      return undefined;
    });
}
