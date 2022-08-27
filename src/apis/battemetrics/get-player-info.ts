import { fetch } from "../Battlemetrics";

export interface PlayerInfo {
  type?: "player";
  id?: string;
  attributes?: {
    id?: string;
    name?: string;
    private?: boolean;
    positiveMatch?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
}

export function getPlayerInfo(
  playerId: string
): Promise<PlayerInfo | undefined> {
  return fetch<{ data?: PlayerInfo }>({
    url: "/players/" + playerId,
  })
    .then((res) => {
      return res.data?.data;
    })
    .catch((err) => {
      console.error(err);
      return undefined;
    });
}
