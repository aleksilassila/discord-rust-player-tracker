import {
  analyzeBedtimeSessions,
  formatAsHours,
  getTimeBetweenDates,
  timePlayedSince,
} from "../utils";
import { TrackedPlayer } from "../models/Player";
import { bold, EmbedBuilder } from "discord.js";
import { RustServer } from "@prisma/client";
import { messages } from "../messages";

type TimedPlayer = TrackedPlayer & {
  time: ReturnType<typeof getTimeBetweenDates> | null;
};

const isOnline = (player: TimedPlayer, trackedServer?: RustServer) =>
  player.serverId === trackedServer?.id || (!trackedServer && player.serverId);

const sortByOnline = (players: TimedPlayer[], trackedServer?: RustServer) =>
  players.slice().sort((a, b) => {
    if (isOnline(a, trackedServer) !== isOnline(b, trackedServer)) {
      return isOnline(a, trackedServer) ? -1 : 1;
    }

    return (a.time?.hours || 0) - (b.time?.hours || 0);
  });

const renderStatus = (p: TimedPlayer, trackedServer?: RustServer) =>
  `${
    !p.serverId
      ? `🔴 | ${p.nickname}`
      : p.serverId === trackedServer?.id || (!trackedServer && p.serverId)
      ? `🟢 | ${p.nickname}`
      : `🟠 | ${p.nickname}`
  }`;

const renderPlaytime = (p: TimedPlayer, trackedServer?: RustServer) => {
  if (p.time) {
    const time =
      p.time.hours > 72 ? p.time.days + " days" : p.time.hours + " hours";
    return (!trackedServer && p.serverId) || p.serverId === trackedServer?.id
      ? `for ${bold(time)}`
      : `${bold(time)} ago`;
  } else {
    return "";
  }
};

const renderOnlineInfo = (player: TimedPlayer, trackedServer?: RustServer) => {
  const playtime = renderPlaytime(player);

  if (isOnline(player, trackedServer)) {
    return `Online ${
      trackedServer ? `on ${trackedServer.name} ` : ""
    }${playtime}.\n`;
  } else if (player.serverId && trackedServer) {
    return `Currently online on other server. Last online on tracked server ${playtime}.\n`;
  }

  return `Last online ${
    trackedServer ? "on tracked server " : ""
  }${playtime}.\n`;
};

const renderWipeInfo = (player: TimedPlayer, trackedServer?: RustServer) => {
  if (!trackedServer) return "";

  const time = timePlayedSince(
    player.sessions.filter((s) => s.serverId === trackedServer.id),
    trackedServer.wipe
  );

  return `Playtime since wipe: ${bold(formatAsHours(time) + " hours")}\n`;
};

const renderSleepData = (player: TimedPlayer) => {
  if (player.sessions.length < 5) return "";

  const data = analyzeBedtimeSessions(player.sessions);

  if (!data) return "";

  const bedtime =
    bold(data.averageBedtime) +
    ` ±(~${data.averageBedtimeDeviationInHrs.toString()}h)` +
    ` (GMT+${data.tzOffsetInHrs})`;

  const wakeUpTime =
    bold(data.averageWakeUpTime) +
    ` ±(~${data.averageWakeUpTimeDeviationInHrs.toString()}h)` +
    ` (GMT+${data.tzOffsetInHrs})`;

  return (
    `\nAverage bedtime: ${bedtime}\n` +
    `Average wake-up time: ${wakeUpTime}\n\n` +
    `Average sleep time: ${bold(data.averageSleepTimeInHrs + " hours")}\n` +
    `Shortest sleep time: ${bold(data.minSleepTimeInHrs + " hours")}\n`
  );
};

const renderPlayerField = (player: TimedPlayer, trackedServer?: RustServer) => {
  return {
    name: renderStatus(player, trackedServer),
    value:
      renderOnlineInfo(player, trackedServer) +
      renderWipeInfo(player, trackedServer) +
      renderSleepData(player) +
      "\n" +
      messages.playerLink("Battlemetrics", player.id) +
      "\n",
  };
};

export const getOverviewEmbed = (
  timedPlayers: TimedPlayer[],
  pageNumber: number,
  pageCount: number,
  trackedServer?: RustServer
): EmbedBuilder => {
  const playerFields = sortByOnline(timedPlayers, trackedServer)
    .slice(pageNumber * 10, pageNumber * 10 + 10)
    .map((p) => renderPlayerField(p, trackedServer));

  const builder = new EmbedBuilder().addFields(...playerFields);

  if (pageNumber === 0) {
    if (trackedServer) {
      builder.setAuthor({
        name: "Tracking in: " + trackedServer.name,
        url: trackedServer?.mapUrl || undefined,
        iconURL: trackedServer?.mapPreview || undefined,
      });
    }

    builder
      .setTitle("Tracked Players")
      .setDescription(
        `${timedPlayers.filter((p) => isOnline(p, trackedServer)).length}/${
          timedPlayers.length
        } of tracked players online:`
      );
  }

  if (pageNumber + 1 === pageCount) {
    builder.setFooter({
      text: `Updated at ${new Date().toLocaleTimeString()}`,
    });
  }

  return builder;
};
