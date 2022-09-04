import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
  TextChannel,
} from "discord.js";
import { messages } from "../../messages";
import prisma from "../../prisma";
import { SubcommandWithChannel } from "../slash-command";

class PlayerInfo extends SubcommandWithChannel {
  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription("Get info about specific player")
      .addStringOption((option) =>
        option.setName("nickname").setDescription("Player nickname")
      )
      .addIntegerOption((option) =>
        option.setName("player-id").setDescription("Player Battlemetrics id")
      );
  }

  getName(): string {
    return "info";
  }

  async executeWithChannel(
    interaction: ChatInputCommandInteraction,
    guild: DiscordGuild,
    channel: TextChannel
  ): Promise<void> {
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
}

export default PlayerInfo;
