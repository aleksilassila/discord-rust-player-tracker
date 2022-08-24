import {
  analyzeBedtimeSessions,
  formatAsDays,
  formatAsHours,
  timePlayedSince,
} from "../utils";
import { bold, EmbedBuilder } from "discord.js";
import { RustServer } from "@prisma/client";
import { messages } from "../messages";
import { AnalyzedPlayer } from "../models/Player";

const renderStatus = (p: AnalyzedPlayer, trackedServer?: RustServer) =>
  `${
    !p.serverId
      ? `🔴 | ${p.nickname}`
      : p.serverId === trackedServer?.id || (!trackedServer && p.serverId)
      ? `🟢 | ${p.nickname}`
      : `🟠 | ${p.nickname}`
  }`;

const renderPlaytime = (p: AnalyzedPlayer) => {
  const time = p.onlineTimeMs || p.offlineTimeMs || 0;

  if (time === 0) return "";

  const hrTime =
    formatAsHours(time) > 72
      ? formatAsDays(time) + " days"
      : formatAsHours(time) + " hours";

  if (p.onlineTimeMs !== undefined) {
    return `for ${bold(hrTime)}`;
  } else {
    return `${bold(hrTime)} ago`;
  }
};

const renderOnlineInfo = (
  player: AnalyzedPlayer,
  trackedServer?: RustServer
) => {
  const playtime = renderPlaytime(player);

  if (player.isOnline) {
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

const renderWipeInfo = (player: AnalyzedPlayer, trackedServer?: RustServer) => {
  if (!trackedServer) return "";

  const time = timePlayedSince(
    player.sessions.filter((s) => s.serverId === trackedServer.id),
    trackedServer.wipe
  );

  return `Playtime since wipe: ${bold(formatAsHours(time) + " hours")}\n`;
};

const renderSleepData = (player: AnalyzedPlayer) => {
  if (!player.bedtimeData) return "";

  const bedtime =
    bold(player.bedtimeData.averageBedtime) +
    ` ±(~${player.bedtimeData.averageBedtimeDeviationInHrs.toString()}h)` +
    ` (GMT+${player.bedtimeData.tzOffsetInHrs})`;

  const wakeUpTime =
    bold(player.bedtimeData.averageWakeUpTime) +
    ` ±(~${player.bedtimeData.averageWakeUpTimeDeviationInHrs.toString()}h)` +
    ` (GMT+${player.bedtimeData.tzOffsetInHrs})`;

  return (
    `\nAverage bedtime: ${bedtime}\n` +
    `Average wake-up time: ${wakeUpTime}\n\n` +
    `Average sleep time: ${bold(
      player.bedtimeData.averageSleepTimeInHrs + " hours"
    )}\n` +
    `Shortest sleep time: ${bold(
      player.bedtimeData.minSleepTimeInHrs + " hours"
    )}\n`
  );
};

const renderPlayerField = (
  player: AnalyzedPlayer,
  trackedServer?: RustServer
) => {
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

export const renderOverviewEmbeds = (
  players: AnalyzedPlayer[],
  trackedServer?: RustServer
) => {
  if (!players.length)
    return [new EmbedBuilder().setTitle("No players to report on.")];

  const pageCount = Math.ceil(players.length / 10);
  const builders = [];
  for (let i = 0; i < pageCount; i++) {
    builders.push(renderOverviewEmbed(players, i, pageCount, trackedServer));
  }
  return builders;
};

const renderOverviewEmbed = (
  players: AnalyzedPlayer[],
  pageNumber: number,
  pageCount: number,
  trackedServer?: RustServer
): EmbedBuilder => {
  const playerFields = players
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
        `${players.filter((p) => p.isOnline).length}/${
          players.length
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
