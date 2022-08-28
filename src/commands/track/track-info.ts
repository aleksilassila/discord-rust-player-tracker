import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import { messages } from "../../messages";
import prisma from "../../prisma";
import { Subcommand } from "../slash-command";

class TrackInfo extends Subcommand {
  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription("Get info about specific player")
      .addStringOption((option) =>
        option.setName("nickname").setDescription("Player nickname")
      )
      .addNumberOption((option) =>
        option.setName("player-id").setDescription("Player Battlemetrics id")
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const playerId = await this.requirePlayerId(interaction);
    if (!playerId) return;

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
      await this.reply(interaction, messages.playerNotFound);
      return;
    }

    await this.reply(interaction, messages.trackedPlayerInfo(player));
  }

  getName(): string {
    return "info";
  }
}

export default TrackInfo;
