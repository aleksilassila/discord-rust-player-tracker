import {
  ChatInputCommandInteraction,
  Guild,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import prisma from "../../prisma";
import { getOverviewEmbeds } from "../../embeds/overview-embed";
import { SubcommandWithGuild } from "../slash-command";

class TrackOverview extends SubcommandWithGuild {
  buildSubcommand(
    builder: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builder
      .setName(this.getName())
      .setDescription(
        "Get an overview of all tracked players that is kept up to date."
      );
  }

  async executeWithGuild(
    interaction: ChatInputCommandInteraction,
    guild: Guild
  ): Promise<void> {
    const embeds = await getOverviewEmbeds(guild);
    const replyIds = [
      await interaction
        .reply({ embeds: [embeds[0]] })
        .then(async () => await interaction.fetchReply().then((r) => r.id)),
    ];

    if (embeds.length > 1) {
      const channel = interaction.channel;
      if (channel) {
        for (let i = 1; i < embeds.length; i++) {
          const id = await channel
            .send({ embeds: [embeds[i]] })
            .then((r) => r.id)
            .catch(console.error);
          if (id) replyIds.push(id);
        }
      }
    }

    await prisma.persistentMessage.deleteMany({
      where: {
        guildId: guild.id,
        key: "overview",
      },
    });

    replyIds.map(
      async (replyId, index) =>
        await prisma.persistentMessage.create({
          data: {
            id: replyId,
            key: "overview",
            pageIndex: index,
            guildId: guild.id,
          },
        })
    );
  }

  getName(): string {
    return "overview";
  }
}

export default TrackOverview;
