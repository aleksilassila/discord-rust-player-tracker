import { CommandWithSubcommands, Subcommand } from "../slash-command";
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import TrackRemove from "./track-remove";
import TrackInfo from "./track-info";
import TrackAdd from "./track-add";
import TrackList from "./track-list";
import TrackOverview from "./track-overview";

class Track extends CommandWithSubcommands {
  async buildCommandWithSubcommands(): Promise<
    SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
  > {
    return new SlashCommandBuilder()
      .setName(this.getName())
      .setDescription("Track a rust player based on their Battlemetrics id")
      .setDMPermission(false);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await this.executeSubcommand(interaction);
  }

  getSubcommands(): Subcommand[] {
    return [
      new TrackAdd(),
      new TrackRemove(),
      new TrackInfo(),
      new TrackOverview(),
      new TrackList(),
    ];
  }

  getName(): string {
    return "track";
  }
}

export default Track;
