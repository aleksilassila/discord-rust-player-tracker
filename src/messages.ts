import player, {
  getLastSession,
  PlayerModel,
  TrackedPlayer,
} from "./models/Player";
import { bold, EmbedBuilder, hyperlink } from "discord.js";
import { ServerInfo } from "./apis/battemetrics/get-server-info";
import { getTimeBetweenDates } from "./utils";

export const messages = {
  playerLink(name: string, id: string) {
    return hyperlink(bold(name), "https://www.battlemetrics.com/players/" + id);
  },
  listNotifications(allEnabled: boolean, players: PlayerModel[]) {
    return `You have global notifications ${bold(
      allEnabled ? "enabled" : "disabled"
    )}.\nYou have notifications enabled for the following people:\n${players
      .map((p) => `> ${p.name}`)
      .join("\n")}`;
  },
  allNotificationsEnabled: "All notifications enabled.",
  allNotificationsDisabled: "All notifications disabled.",
  nicknameRequired: "Nickname is required",
  playerNotFound: "Player not found.",
  playerIdRequired: "Player id is required",
  playerNotificationsEnabled(playerName: string) {
    return `${bold("Enabled")} notifications for ${bold(playerName)}.`;
  },
  playerNotificationsDisabled(playerName: string) {
    return `${bold("Disabled")} notifications for ${bold(playerName)}.`;
  },
  listTrackedPlayers(players: PlayerModel[]) {
    return `${players.length} players tracked:\n${players
      .map((player) => `> ${bold(player.name)} (${player.id})`)
      .join("\n")}`;
  },
  trackReport(players: TrackedPlayer[], serverInfo?: ServerInfo): EmbedBuilder {
    if (!players.length)
      return new EmbedBuilder().setTitle("No players to report on.");

    type TimedPlayer = TrackedPlayer & {
      time: ReturnType<typeof getTimeBetweenDates> | null;
    };

    const timedPlayers: TimedPlayer[] = players.map((p) => {
      const lastSession = getLastSession(p.sessions, serverInfo?.id);

      if (!lastSession) return { ...p, time: null };

      const time = getTimeBetweenDates(
        new Date(),
        !p.online && lastSession.stop !== null
          ? lastSession.stop
          : lastSession.start
      );

      return {
        ...p,
        time,
      };
    });

    const getStatus = (p: TimedPlayer) => `${p.online ? "✅" : "❌"}`;
    const getPlaytime = (p: TimedPlayer) => {
      if (p.time) {
        const time =
          p.time.hours > 72 ? p.time.days + " days" : p.time.hours + " hours";
        return p.online ? ` for ${time} ago` : ` ${time} ago`;
      } else {
        return "";
      }
    };

    const getPlayerList = (ps: TimedPlayer[], online: boolean) =>
      ps
        .filter((p) => p.online === online)
        .sort((a, b) => (a.time?.hours || 0) - (b.time?.hours || 0))
        .map((p) => `${getStatus(p) + getPlaytime(p)} | ${bold(p.nickname)}`)
        .join("\n");

    const builder = new EmbedBuilder()
      .setTitle("Tracked Players")
      .setDescription(
        `${players.filter((p) => p.online).length}/${
          players.length
        } of tracked players online:`
      )
      .addFields(
        {
          name: "Online",
          value: getPlayerList(timedPlayers, true),
        },
        {
          name: "Offline",
          value: getPlayerList(timedPlayers, false),
        }
      )
      .setFooter({ text: `Updated at ${new Date().toLocaleTimeString()}` });

    if (serverInfo) {
      builder.setAuthor({
        name: "Tracking in: " + serverInfo.attributes.name,
        url: serverInfo?.attributes?.details?.rust_maps?.url,
        iconURL: serverInfo?.attributes?.details?.rust_maps?.thumbnailUrl,
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
