import {
  ChatInputCommandInteraction,
  Guild,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import prisma from "../../prisma";
import { messages } from "../../messages";
import { SubcommandWithGuild } from "../slash-command";

class TrackList extends SubcommandWithGuild {
  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription("List tracked players");
  }

  async executeWithGuild(
    interaction: ChatInputCommandInteraction,
    guild: Guild
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

    await this.reply(interaction, messages.listTrackedPlayers(players));
  }

  getName(): string {
    return "list";
  }
}

export default TrackList;
