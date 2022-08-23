import { Client, GatewayIntentBits } from "discord.js";
import { DISCORD_TOKEN } from "./config";
import { execute } from "./commands";
import { syncAllCommands } from "./deploy-commands";
import { CronJob } from "cron";
import Player from "./models/Player";
import Guild from "./models/Guild";

export const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const cronCallback = async function () {
  await Player.updateAllSessions();
  await Guild.updatePersistentMessages(client);
};

const cronJob = new CronJob("*/7 * * * *", cronCallback, null);

client.once("ready", async () => {
  await syncAllCommands(client);
  await Guild.updateGuilds(client);
  cronCallback().then(function () {
    cronJob.start();
  });
});

client.on("guildCreate", async (guild) => {
  await Guild.updateGuilds(client);
});

client.on("guildDelete", async (guild) => {
  await Guild.updateGuilds(client);
});

client.on("guildUpdate", async (guild) => {
  await Guild.updateGuilds(client);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  await execute(interaction);
});

client.login(DISCORD_TOKEN);
