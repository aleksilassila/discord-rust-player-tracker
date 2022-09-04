import { fetch } from "../Battlemetrics";

interface Data {
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

interface Included {
  type?: "player";
  id?: string;
  private?: boolean;
  attributes?: {
    createdAt?: string;
    updatedAt?: string;
    name?: string;
    id?: string;
  };
  relationships?: {
    server?: {
      data?: {
        type?: "server";
        id?: string;
      };
    };
  };
}

export type ServerInfo = Data & { included?: Included[] };

export function getServerInfo(
  serverId: string
): Promise<ServerInfo | undefined> {
  return fetch<{ data?: Data; included?: Included[] }>({
    url: "/servers/" + serverId,
    params: {
      include: "player",
    },
  })
    .then((res) => ({
      ...res.data?.data,
      included: res.data?.included,
    }))
    .catch((err) => {
      console.error(err);
      return undefined;
    });
}
