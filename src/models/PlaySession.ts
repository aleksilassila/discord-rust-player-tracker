import { getSessions } from "../apis/battemetrics/get-sessions";
import { PlaySession } from "@prisma/client";
import prisma from "../prisma";

const PlaySession = {
  /**
   * Creates **unconnected** play sessions.
   */
  _updatePlayerSessions: async function (playerId: string, serverId?: string) {
    const sessions = await getSessions(
      playerId,
      serverId ? [serverId] : undefined
    );

    if (!sessions) {
      console.error("Could not fetch player sessions.", playerId);
      return;
    }

    const addedSessions: PlaySession[] = [];
    for (const session of sessions) {
      const result = await prisma.playSession
        .upsert({
          where: {
            id: session.id,
          },
          update: {
            start: session.start,
            stop: session.stop,
          },
          create: {
            id: session.id,
            start: session.start,
            stop: session.stop,
          },
        })
        .catch((e) =>
          console.error(
            "HEY I THINK I CAN'T CREATE RECORDS WITH INVALID REFERENCES TO OTHER RECORDS",
            e
          )
        );

      if (result) addedSessions.push(result);
    }

    return addedSessions;
  },
};

export default PlaySession;
