import { fetchBM as fetch } from "../fetcher";

export interface ServerInfo {
  type: "server";
  id: string;
  attributes: {
    id: string;
    name: string;
    ip: string;
    port: number;
    players: number;
    maxPlayers: number;
    status: string;
    details: {
      rust_maps: {
        seed: number;
        size: number;
        url: string;
        thumbnailUrl: string;
      };
      rust_last_wipe: string;
    };
  };
}

export function getServerInfo(serverId: string): Promise<ServerInfo> {
  return fetch<{ data: ServerInfo }>({
    url: "/servers/" + serverId,
  }).then((res) => res.data?.data);
}
