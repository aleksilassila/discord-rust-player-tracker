import player, {
  getLastSession,
  PlayerModel,
  TrackedPlayer,
} from "./models/Player";
import { bold, EmbedBuilder, hyperlink } from "discord.js";
import { ServerInfo } from "./apis/battemetrics/get-server-info";
import { getTimeBetweenDates } from "./utils";

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
  trackStats(players: TrackedPlayer[], serverInfo?: ServerInfo): EmbedBuilder {
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
      `${!p.serverId ? "🔴" : p.serverId === serverInfo?.id ? "🟢" : "🟠"}`;
    const renderPlaytime = (p: TimedPlayer) => {
      if (p.time) {
        const time =
          p.time.hours > 72 ? p.time.days + " days" : p.time.hours + " hours";
        return p.serverId === serverInfo?.id ? ` for ${time}` : ` ${time} ago`;
      } else {
        return "";
      }
    };

    const renderPlayerList = (ps: TimedPlayer[], online: boolean) =>
      ps
        .filter((p) => (online ? !!p.serverId : !p.serverId))
        .sort((a, b) => (a.time?.hours || 0) - (b.time?.hours || 0))
        .map(
          (p) => `${renderStatus(p) + renderPlaytime(p)} | ${bold(p.nickname)}`
        )
        .join("\n");

    const builder = new EmbedBuilder()
      .setTitle("Tracked Players")
      .setDescription(
        `${
          players.filter((p) =>
            serverInfo ? p.serverId === serverInfo?.id : !!p.serverId
          ).length
        }/${players.length} of tracked players online:`
      )
      .addFields(
        {
          name: "Online",
          value: renderPlayerList(timedPlayers, true),
        },
        {
          name: "Offline",
          value: renderPlayerList(timedPlayers, false),
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
