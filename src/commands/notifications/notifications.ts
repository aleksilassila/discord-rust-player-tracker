import { CommandWithSubcommands, Subcommand } from "../slash-command";
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import NotificationsEnable from "./notifications-enable";
import NotificationsDisable from "./notifications-disable";

class Notifications extends CommandWithSubcommands {
  async buildCommandWithSubcommands(): Promise<
    SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
  > {
    return new SlashCommandBuilder()
      .setName(this.getName())
      .setDescription("Manage player notifications")
      .setDMPermission(false);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    return await this.executeSubcommand(interaction);
  }

  getName(): string {
    return "notifications";
  }

  getSubcommands(): Subcommand[] {
    return [new NotificationsEnable(), new NotificationsDisable()];
  }
}

export default Notifications;
