import { CommandWithSubcommands, Subcommand } from "../slash-command";
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import ServerAdd from "./server-add";
import ServerRemove from "./server-remove";

class Server extends CommandWithSubcommands {
  async buildCommandWithSubcommands(
    builderWithName: SlashCommandBuilder
  ): Promise<SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder> {
    return builderWithName.setDescription("Set rust server to track.");
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    return await this.executeSubcommand(interaction);
  }

  getName(): string {
    return "server";
  }

  getSubcommands(): Subcommand[] {
    return [new ServerAdd(), new ServerRemove()];
  }
}

export default Server;
