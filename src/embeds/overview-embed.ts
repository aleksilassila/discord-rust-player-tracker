import {
  analyzeBedtimeSessions,
  formatAsDays,
  formatAsHours,
  timePlayedSince,
} from "../utils";
import { bold, EmbedBuilder, hyperlink } from "discord.js";
import { RustServer } from "@prisma/client";
import { messages } from "../messages";
import { AnalyzedPlayer } from "../models/Player";

const renderStatus = (p: AnalyzedPlayer) =>
  `${p.isOnline ? "🟢" : !!p.server ? "🟠" : "🔴"} | ${p.nickname} (${p.id})`;

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

  if (player.server) {
    return `Online ${
      player.server ? `on ${player.server.name} ` : ""
    }${playtime}.\n`;
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
    name: renderStatus(player),
    value:
      renderOnlineInfo(player, trackedServer) +
      renderWipeInfo(player, trackedServer) +
      renderSleepData(player) +
      "\n" +
      messages.playerLink("Battlemetrics", player.id) +
      "\n",
  };
};

const renderDescription = (
  players: AnalyzedPlayer[],
  trackedServer?: RustServer
) => {
  const online = bold(
    players
      .filter((p) => (trackedServer ? p.isOnline : !!p.server))
      .length.toString()
  );
  const total = bold(players.length.toString());

  return `${online}/${total} tracked players online\n`;
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
        name: "Tracking: " + trackedServer.name,
        url:
          "https://www.battlemetrics.com/servers/rust/" + trackedServer?.id ||
          undefined,
        iconURL: trackedServer?.mapPreview || undefined,
      });
    }

    builder
      .setTitle("Tracked Players")
      .setDescription(
        renderDescription(players, trackedServer) +
          `${
            trackedServer?.mapUrl
              ? hyperlink(bold("View Server Map"), trackedServer?.mapUrl)
              : ""
          }\n`
      );
  }

  if (pageNumber + 1 === pageCount) {
    builder.setFooter({
      text: `Updated at ${new Date().toLocaleTimeString()}`,
    });
  }

  return builder;
};
