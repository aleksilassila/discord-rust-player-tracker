import { Client, GatewayIntentBits } from "discord.js";
import { DISCORD_TOKEN } from "./config";
import { execute } from "./commands";
import { syncAllGuildsCommands } from "./deploy-commands";
import { CronJob } from "cron";
import Guild from "./models/Guild";
import Server from "./models/Server";

export const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const cronCallback = async function () {
  try {
    // await Player.updateAllSessions();
    await Server.updateAll();
    // await Server.updateAllOverviews();
    // await Guild.updateAllOverviews();
  } catch (err) {
    console.error("Error executing cron", err);
  }
};

const cronJob = new CronJob("*/1 * * * *", cronCallback, null);

client.once("ready", async () => {
  await syncAllGuildsCommands(client);
  await Guild.updateGuilds(client);
  cronCallback().then(function () {
    cronJob.start();
    console.log("Cron started, everything ready.");
  });
});

client.on("guildCreate", async () => {
  await Guild.updateGuilds(client);
});

client.on("guildDelete", async () => {
  await Guild.updateGuilds(client);
});

client.on("guildUpdate", async () => {
  await Guild.updateGuilds(client);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  await execute(interaction);
});

client.login(DISCORD_TOKEN).then();
