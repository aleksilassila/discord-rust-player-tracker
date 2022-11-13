import { formatAsDays, formatAsHours } from "../utils";
import { bold, EmbedBuilder, hyperlink } from "discord.js";
import { Prisma, Server as RustServer } from "@prisma/client";
import { messages } from "../messages";
import Player, { AnalyzedPlayer } from "../models/Player";
import prisma from "../prisma";

const renderStatus = (p: AnalyzedPlayer) => {
  const name = p.name === p.nickname ? p.name : `${p.name}, aka. ${p.nickname}`;

  return `${p.isOnline ? "🟢" : !!p.currentServer ? "🟠" : "🔴"} | ${name} (${
    p.id
  })`;
};

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

  if (player.currentServer) {
    return `Online on ${player.currentServer.name} ${playtime}.\n`;
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
      .filter((p) => (trackedServer ? p.isOnline : !!p.currentServer))
      .length.toString()
  );
  const total = bold(allPlayers.length.toString());

  return (
    `${online}/${total} tracked players online ` +
    `(showing ${players.length}/${allPlayers.length})\n` +
    `${
      trackedServer?.mapUrl
        ? hyperlink(bold("🗺️ View Server Map"), trackedServer?.mapUrl)
        : ""
    }\n`
  );
};

const renderOverviewEmbeds = (
  players: AnalyzedPlayer[],
  trackedServer?: RustServer
): EmbedBuilder[] => {
  const visiblePlayers = players.filter(
    (p) => !trackedServer || !!p.wipePlaytimeMs
  );

  const pageCount = Math.max(1, Math.ceil(visiblePlayers.length / 10));
  const builders = [];
  for (let i = 0; i < pageCount; i++) {
    builders.push(
      renderOverviewEmbed(players, visiblePlayers, i, pageCount, trackedServer)
    );
  }

  return builders;
};

const renderOverviewEmbed = (
  allPlayers: AnalyzedPlayer[],
  visiblePlayers: AnalyzedPlayer[],
  pageNumber: number,
  pageCount: number,
  trackedServer?: RustServer
): EmbedBuilder => {
  const playerFields = visiblePlayers
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
        renderDescription(allPlayers, visiblePlayers, trackedServer)
      );
  }

  if (pageNumber + 1 === pageCount) {
    embed.setFooter({
      text: `Updated at ${new Date().toLocaleTimeString("fi-FI")}`,
    });
  }

  return embed;
};

export const getOverviewEmbeds = async function (
  guildServer: Prisma.GuildServerTrackGetPayload<{
    include: {
      server: true;
    };
  }>
): Promise<EmbedBuilder[]> {
  const players = await prisma.playerTrack
    .findMany({
      where: {
        guildServer: {
          guildId: guildServer.guildId,
          channelId: guildServer.channelId,
        },
      },
      include: {
        player: {
          include: {
            sessions: true,
            currentServer: true,
          },
        },
      },
      orderBy: [
        {
          player: {
            name: "asc",
          },
        },
      ],
    })
    .then((guildPlayerTracks) =>
      guildPlayerTracks.map((track) =>
        Player.analyzePlayer(
          { ...track.player, currentServer: track.player.currentServer },
          track.nickname,
          guildServer.server
        )
      )
    );

  players.sort((a, b) => {
    if (a.isOnline !== b.isOnline) {
      return a.isOnline ? -1 : 1;
    }

    if (a.serverId !== b.serverId) {
      return a.serverId ? -1 : 1;
    }

    return (b.wipePlaytimeMs || 0) - (a.wipePlaytimeMs || 0);
  });

  return renderOverviewEmbeds(players, guildServer.server);
};
