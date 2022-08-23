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
      `${
        !p.serverId
          ? `🔴 ${p.nickname}`
          : p.serverId === serverInfo?.id
          ? `🟢 ${p.nickname}`
          : `🟠 ${p.nickname}`
      }`;
    const renderPlaytime = (p: TimedPlayer) => {
      if (p.time) {
        const time =
          p.time.hours > 72 ? p.time.days + " days" : p.time.hours + " hours";
        return p.serverId === serverInfo?.id
          ? `for ${bold(time)}`
          : `${bold(time)} ago`;
      } else {
        return "";
      }
    };

    const renderOnlineOn = (player: TimedPlayer) => {
      const playtime = renderPlaytime(player);

      if (player.serverId === serverInfo?.id) {
        return `Online on ${serverInfo?.attributes.name} ${playtime}.\n`;
      } else if (player.serverId) {
        return `Currently online on other server. Last online on tracked server ${playtime}.\n`;
      }

      return `Last online on tracked server ${playtime}.\n`;
    };

    const renderWipeInfo = (player: TimedPlayer) => {
      if (!serverInfo) return "";

      return `Playtime since last wipe: ${bold("Todo")}`;
    };

    const renderPlayerField = (player: TimedPlayer) => {
      return {
        name: renderStatus(player),
        value: `${renderOnlineOn(player)}${renderWipeInfo(player)}`,
      };
    };

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
        ...timedPlayers
          .sort((a, b) => {
            if (
              a.serverId === serverInfo?.id &&
              b.serverId !== serverInfo?.id
            ) {
              return -1;
            } else if (
              a.serverId !== serverInfo?.id &&
              b.serverId === serverInfo?.id
            ) {
              return 1;
            }
            return (a.time?.hours || 0) - (b.time?.hours || 0);
          })
          .slice(0, 25)
          .map((p) => renderPlayerField(p))
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
