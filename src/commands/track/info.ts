import { ChatInputCommandInteraction, Guild as DiscordGuild } from "discord.js";
import { messages } from "../../messages";
import prisma from "../../prisma";

export const executeInfo = async function (
  interaction: ChatInputCommandInteraction,
  playerId: string,
  guild: DiscordGuild
): Promise<void> {
  const player = await prisma.player.findUnique({
    where: {
      id: playerId,
    },
    include: {
      sessions: {
        include: {
          server: true,
        },
      },
    },
  });

  if (!player) {
    await interaction.reply(messages.playerNotFound);
    return;
  }

  await interaction.reply(messages.trackedPlayerInfo(player));
};
