import { fetchBM as fetch } from "../fetcher";

export interface PlayerInfo {
  type: "player";
  id: string;
  attributes: {
    id: string;
    name: string;
    private: boolean;
    positiveMatch: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export function getPlayerInfo(playerId: string): Promise<PlayerInfo> {
  return fetch<{ data: PlayerInfo }>({
    url: "/players/" + playerId,
  }).then((res) => res.data?.data);
}
