import {
  CommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export abstract class SlashCommand {
  abstract execute(interaction: CommandInteraction): void;

  abstract data(
    guildId: string
  ): Promise<SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder>;
}
