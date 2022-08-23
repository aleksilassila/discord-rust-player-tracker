import {
  CommandInteraction,
  Guild,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export abstract class SlashCommand {
  abstract execute(interaction: CommandInteraction): void;

  abstract data(
    guild: Guild
  ): Promise<SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder>;
}
