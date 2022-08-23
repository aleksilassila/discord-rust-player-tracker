import { SlashCommand } from "./slash-command";
import { CommandInteraction } from "discord.js";

export const getCommands = async (): Promise<SlashCommand[]> =>
  <Promise<SlashCommand[]>>(
    Promise.all([import("./track"), import("./NotificationsCommand")]).then(
      (modules) => modules.map((m) => new m.default())
    )
  );

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;
  const commandName = interaction.commandName;

  const commands = await getCommands();

  for (const command of commands) {
    const data = await command.data(interaction.guild);

    if (data.name === commandName) {
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
      return;
    }
  }

  await interaction.reply("Command not found.");
}
