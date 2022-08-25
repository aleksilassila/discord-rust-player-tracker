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

const renderWipeInfo = (player: AnalyzedPlayer) => {
  if (!player.wipePlaytimeMs) return "";

  return `Playtime since wipe: ${bold(
    formatAsHours(player.wipePlaytimeMs) + " hours"
  )}\n`;
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
      renderWipeInfo(player) +
      renderSleepData(player) +
      "\n" +
      messages.playerLink("Battlemetrics", player.id) +
      "\n",
  };
};

const renderDescription = (
  allPlayers: AnalyzedPlayer[],
  players: AnalyzedPlayer[],
  trackedServer?: RustServer
) => {
  const online = bold(
    players
      .filter((p) => (trackedServer ? p.isOnline : !!p.server))
      .length.toString()
  );
  const total = bold(allPlayers.length.toString());

  return (
    `${online}/${total} tracked players online ` +
    `(showing ${players.length}/${allPlayers.length})\n`
  );
};

export const renderOverviewEmbeds = (
  _players: AnalyzedPlayer[],
  trackedServer?: RustServer
): EmbedBuilder[] => {
  const players = _players.filter((p) => !trackedServer || !!p.wipePlaytimeMs);

  const pageCount = Math.max(1, Math.ceil(players.length / 10));
  const builders = [];
  for (let i = 0; i < pageCount; i++) {
    builders.push(
      renderOverviewEmbed(_players, players, i, pageCount, trackedServer)
    );
  }

  return builders;
};

const renderOverviewEmbed = (
  allPlayers: AnalyzedPlayer[],
  players: AnalyzedPlayer[],
  pageNumber: number,
  pageCount: number,
  trackedServer?: RustServer
): EmbedBuilder => {
  const playerFields = players
    .slice(pageNumber * 10, pageNumber * 10 + 10)
    .map((p) => renderPlayerField(p, trackedServer));

  const embed = new EmbedBuilder();

  if (playerFields.length) {
    embed.addFields(...playerFields);
  }

  if (pageNumber === 0) {
    if (trackedServer) {
      embed.setAuthor({
        name: "Tracking: " + trackedServer.name,
        url:
          "https://www.battlemetrics.com/servers/rust/" + trackedServer?.id ||
          undefined,
        iconURL: trackedServer?.mapPreview || undefined,
      });
    }

    embed
      .setTitle("Tracked Players")
      .setDescription(
        renderDescription(allPlayers, players, trackedServer) +
          `${
            trackedServer?.mapUrl
              ? hyperlink(bold("View Server Map"), trackedServer?.mapUrl)
              : ""
          }\n`
      );
  }

  if (pageNumber + 1 === pageCount) {
    embed.setFooter({
      text: `Updated at ${new Date().toLocaleTimeString("fi-FI")}`,
    });
  }

  return embed;
};
