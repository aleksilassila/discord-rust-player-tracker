import { PlaySession, RustServer } from "@prisma/client";
import { PlayerModel } from "./models/Player";
import { bold, EmbedBuilder, hyperlink } from "discord.js";
import { analyzeBedtimeSessions, formatAsHours } from "./utils";

export const messages = {
  guildRequired: "This command can only be used in a server.",
  playerRequired: "This command requires target player.",

  playerLink(name: string, id: string) {
    return hyperlink(bold(name), "https://www.battlemetrics.com/players/" + id);
  },
  allNotificationsEnabled: "All notifications enabled.",
  allNotificationsDisabled: "All notifications disabled.",
  nicknameRequired: "Nickname is required",
  playerNotFound: "Player not found.",
  playerIdRequired: "Player id is required",
  listTrackedPlayers(players: PlayerModel[]) {
    return `${players.length} players tracked:\n${players
      .map((player) => `> ${bold(player.name)} (${player.id})`)
      .join("\n")}`;
  },
  trackPlayer(name: string, playerId: string, nickname: string) {
    return `Added player ${bold(name)} (${playerId}) as ${bold(nickname)}`;
  },
  untrackPlayer: "Player removed.",
  unsetTrackedServer: "Unset tracked server.",
  setTrackedServer: "Tracked server set.",
  trackedPlayerInfo(
    player: PlayerModel & { sessions: (PlaySession & { server: RustServer })[] }
  ) {
    const sessions = player.sessions;
    if (!sessions.length) return "";

    const data = analyzeBedtimeSessions(sessions);

    const fields = sessions.slice(0, 25).map((s) => {
      const last = data?.bedtimeSessions?.map((l) => l.id).includes(s.id);

      return {
        name: `${last ? "🛌" : ""} ${s.server.name}`,
        value:
          `${s.id}\n` +
          `Stopped at: ${bold(
            s.stop?.toLocaleString("fi-FI") || "Ongoing"
          )}\n` +
          `Started at: ${bold(s.start.toLocaleString("fi-FI"))}\n` +
          `Duration: ${bold(
            s.stop
              ? formatAsHours(s.stop.getTime() - s.start.getTime()) + " hours"
              : "Ongoing"
          )}\n` +
          ``,
      };
    });

    const embed = new EmbedBuilder()
      .setTitle(player.name)
      .setDescription(
        `Stats for ${bold(this.playerLink(player.name, player.id))}`
      )
      .addFields(...fields);

    return { embeds: [embed] };
  },
};
