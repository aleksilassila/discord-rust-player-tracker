import { SubcommandWithGuild } from "../slash-command";
import {
  ChatInputCommandInteraction,
  Guild as DiscordGuild,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import Guild from "../../models/Guild";
import { messages } from "../../messages";

class ServerUnset extends SubcommandWithGuild {
  buildSubcommand(
    builderWithName: SlashCommandSubcommandBuilder
  ): SlashCommandSubcommandBuilder {
    return builderWithName.setDescription("Remove tracked server.");
  }

  async executeWithGuild(
    interaction: ChatInputCommandInteraction,
    guild: DiscordGuild
  ): Promise<void> {
    await Guild.unsetTrackedServer(guild.id);
    await this.reply(interaction, messages.unsetTrackedServer);
  }

  getName(): string {
    return "unset";
  }
}

export default ServerUnset;
