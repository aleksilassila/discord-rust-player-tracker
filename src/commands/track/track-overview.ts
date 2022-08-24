import { ChatInputCommandInteraction, Guild as DiscordGuild } from "discord.js";
import prisma from "../../prisma";
import Guild from "../../models/Guild";

const executeOverview = async function (
  interaction: ChatInputCommandInteraction,
  guild: DiscordGuild
): Promise<void> {
  const embeds = await Guild.getPersistentMessage(guild);
  const replyIds = [
    await interaction
      .reply({ embeds: [embeds[0]] })
      .then(async () => await interaction.fetchReply().then((r) => r.id)),
  ];

  if (embeds.length > 1) {
    const channel = interaction.channel;
    if (channel) {
      for (let i = 1; i < embeds.length; i++) {
        replyIds.push(
          await channel.send({ embeds: [embeds[i]] }).then((r) => r.id)
        );
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
};

export default executeOverview;
