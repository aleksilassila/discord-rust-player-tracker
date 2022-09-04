import {
  ChatInputCommandInteraction,
  Guild,
  SlashCommandSubcommandBuilder,
  TextChannel,
} from "discord.js";
import prisma from "../../prisma";
import { messages } from "../../messages";
import { SubcommandWithChannel } from "../slash-command";

class PlayerList extends SubcommandWithChannel {
  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription("List tracked players");
  }

  async executeWithChannel(
    interaction: ChatInputCommandInteraction,
    guild: Guild,
    channel: TextChannel
  ): Promise<void> {
    const guildServer = await this.requireGuildServer(interaction, channel);
    if (!guildServer) return;

    const players = await prisma.guildServerTrack
      .findUnique({
        where: {
          channelId_guildId: {
            channelId: guildServer.channelId,
            guildId: guildServer.guildId,
          },
        },
        include: {
          trackedPlayers: {
            include: {
              player: true,
            },
          },
        },
      })
      .then((guildServer) =>
        guildServer?.trackedPlayers.map((track) => track.player)
      );

    if (!players) {
      await this.reply(interaction, "Could not find any players.");
      return;
    }

    await this.reply(interaction, messages.listTrackedPlayers(players));
  }

  getName(): string {
    return "list";
  }
}

export default PlayerList;
