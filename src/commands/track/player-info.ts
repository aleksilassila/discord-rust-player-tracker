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
    const player = await this.requirePlayer(interaction);

    if (!player) {
      return;
    }

    // Yuk
    const playerWithSessions = await prisma.player.findUnique({
      where: {
        id: player.id,
      },
      include: {
        sessions: {
          include: {
            server: true,
          },
        },
      },
    });

    if (!playerWithSessions) {
      await this.reply(interaction, messages.playerNotFound);
    } else {
      await this.reply(
        interaction,
        messages.trackedPlayerInfo(playerWithSessions)
      );
    }
  }
}

export default PlayerInfo;
