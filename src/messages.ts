import { RustServer } from "@prisma/client";
import { getLastSession, PlayerModel, TrackedPlayer } from "./models/Player";
import { bold, EmbedBuilder, hyperlink } from "discord.js";
import {
  formatAsHours,
  formatAsUTCHours,
  getLastSessionData,
  getTimeBetweenDates,
  timePlayedSince,
} from "./utils";

export const messages = {
  guildRequired: "This command can only be used in a server.",
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
  trackStats(
    players: TrackedPlayer[],
    trackedServer?: RustServer
  ): EmbedBuilder {
    if (!players.length)
      return new EmbedBuilder().setTitle("No players to report on.");

    type TimedPlayer = TrackedPlayer & {
      time: ReturnType<typeof getTimeBetweenDates> | null;
    };

    const timedPlayers: TimedPlayer[] = players.map((p) => {
      const lastSession = getLastSession(p.sessions, trackedServer?.id);

      if (!lastSession) return { ...p, time: null };

      const time = getTimeBetweenDates(
        new Date(),
        !p.serverId && lastSession.stop !== null
          ? lastSession.stop
          : lastSession.start
      );

      return {
        ...p,
        time,
      };
    });

    const renderStatus = (p: TimedPlayer) =>
      `${
        !p.serverId
          ? `🔴 | ${p.nickname}`
          : p.serverId === trackedServer?.id
          ? `🟢 | ${p.nickname}`
          : `🟠 | ${p.nickname}`
      }`;

    const renderPlaytime = (p: TimedPlayer) => {
      if (p.time) {
        const time =
          p.time.hours > 72 ? p.time.days + " days" : p.time.hours + " hours";
        return p.serverId === trackedServer?.id
          ? `for ${bold(time)}`
          : `${bold(time)} ago`;
      } else {
        return "";
      }
    };

    const renderOnlineOn = (player: TimedPlayer) => {
      const playtime = renderPlaytime(player);

      if (player.serverId === trackedServer?.id) {
        return `Online on ${trackedServer?.name} ${playtime}.\n`;
      } else if (player.serverId) {
        return `Currently online on other server. Last online on tracked server ${playtime}.\n`;
      }

      return `Last online on tracked server ${playtime}.\n`;
    };

    const renderWipeInfo = (player: TimedPlayer) => {
      if (!trackedServer) return "";

      const time = timePlayedSince(
        player.sessions.filter((s) => s.serverId === trackedServer.id),
        trackedServer.wipe
      );

      return `Playtime since wipe: ${bold(formatAsHours(time) + " hours")}\n`;
    };

    const renderStopData = (player: TimedPlayer) => {
      if (player.sessions.length < 5) return "";

      const data = getLastSessionData(player.sessions);

      if (!data) return "";

      const tzOffset = new Date().getTimezoneOffset() / -60;

      return `Average bedtime: ${bold(
        formatAsUTCHours(data.averageStopTime + tzOffset)
      )} ±(~${(
        Math.round(data.averageStopTimeDeviation * 10) / 10
      ).toString()}h) (GMT+${tzOffset})\nAverage sleep time: ${bold(
        Math.round(data.averageSleepTime * 10) / 10 + " hours"
      )}\nShortest sleep time: ${bold(data.minSleepTime + " hours")}\n`;
    };

    const renderPlayerField = (player: TimedPlayer) => {
      return {
        name: renderStatus(player),
        value: `${renderOnlineOn(player)}${renderWipeInfo(
          player
        )}${renderStopData(player)}\n${this.playerLink(
          "Battlemetrics",
          player.id
        )}\n`,
      };
    };

    const builder = new EmbedBuilder()
      .setTitle("Tracked Players")
      .setDescription(
        `${
          players.filter((p) =>
            trackedServer ? p.serverId === trackedServer?.id : !!p.serverId
          ).length
        }/${players.length} of tracked players online:`
      )
      .addFields(
        ...timedPlayers
          .sort((a, b) => {
            if (
              a.serverId === trackedServer?.id &&
              b.serverId !== trackedServer?.id
            ) {
              return -1;
            } else if (
              a.serverId !== trackedServer?.id &&
              b.serverId === trackedServer?.id
            ) {
              return 1;
            }
            return (a.time?.hours || 0) - (b.time?.hours || 0);
          })
          .slice(0, 25)
          .map((p) => renderPlayerField(p))
      )
      .setFooter({ text: `Updated at ${new Date().toLocaleTimeString()}` });

    if (trackedServer) {
      builder.setAuthor({
        name: "Tracking in: " + trackedServer.name,
        url: trackedServer?.mapUrl || undefined,
        iconURL: trackedServer?.mapPreview || undefined,
      });
    }

    return builder;
  },
  trackPlayer(name: string, playerId: string, nickname: string) {
    return `Added player ${bold(name)} (${playerId}) as ${bold(nickname)}`;
  },
  untrackPlayer: "Player removed.",
  unsetTrackedServer: "Unset tracked server.",
  setTrackedServer: "Tracked server set.",
};
