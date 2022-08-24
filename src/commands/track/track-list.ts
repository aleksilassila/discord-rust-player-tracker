import { ChatInputCommandInteraction, Guild as DiscordGuild } from "discord.js";
import prisma from "../../prisma";
import { messages } from "../../messages";

export const executeList = async function (
  interaction: ChatInputCommandInteraction,
  guild: DiscordGuild
): Promise<void> {
  const players = await prisma.guildPlayerTracks
    .findMany({
      where: {
        guildId: guild.id,
      },
      include: {
        player: true,
      },
    })
    .then((tracks) => tracks.map((track) => track.player));

  await interaction.reply(messages.listTrackedPlayers(players));
};
