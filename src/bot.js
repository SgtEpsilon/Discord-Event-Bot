// @src/bot.js
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActivityType } = require('discord.js');
const { token, ownerId, mongoUri } = require('./config.json');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Config managers
const EventsConfig = require('./config/eventsConfig');
const StreamingConfigManager = require('./config/streamingConfig');

// Command handler
const commands = new Map();
const cooldowns = new Map(); // Module-level cooldowns Map (NOT on client)

// Initialize config managers
const eventsConfig = new EventsConfig();
const streamingConfig = new StreamingConfigManager();

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.User, Partials.GuildMember]
});

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
  }
}

// Event handlers
client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  console.log(`✅ Serving ${client.guilds.cache.size} servers`);
  
  // Set bot activity using v14 ActivityType enum
  client.user.setActivity('for /help', { type: ActivityType.Watching });
  
  // ==========================================
  // POPULATE GUILD NAMES FOR EXISTING SERVERS (BATCHED SAVE)
  // ==========================================
  let eventsUpdated = 0;
  let streamingUpdated = 0;
  let processErrors = 0;

  // Process all guilds immediately (no delay)
  client.guilds.cache.forEach(guild => {
    // Events config - updates in-memory only (no immediate persistence)
    try {
      const eventsCfg = eventsConfig.getGuildConfig(guild.id);
      if (!eventsCfg?.guildName) {
        eventsConfig.setGuildName(guild.id, guild.name);
        eventsUpdated++;
      }
    } catch (err) {
      processErrors++;
      console.warn(`⚠️ Events config: Error processing guild ${guild.id}:`, err.message);
    }

    // Streaming config - updates in-memory only (no immediate persistence)
    try {
      const streamingCfg = streamingConfig.getGuildConfig(guild.id);
      if (!streamingCfg?.guildName) {
        streamingConfig.setGuildName(guild.id, guild.name);
        streamingUpdated++;
      }
    } catch (err) {
      processErrors++;
      console.warn(`⚠️ Streaming config: Error processing guild ${guild.id}:`, err.message);
    }
  });

  // Batch persist all changes (single write per config service)
  try {
    if (eventsUpdated > 0) await eventsConfig.save();
    if (streamingUpdated > 0) await streamingConfig.save();
    
    if (eventsUpdated + streamingUpdated > 0) {
      console.log(`✅ Batch saved guild names: ${eventsUpdated} (events) + ${streamingUpdated} (streaming)`);
    }
    if (processErrors > 0) {
      console.log(`⚠️ Skipped ${processErrors} guild(s) due to config errors`);
    }
    if (eventsUpdated === 0 && streamingUpdated === 0 && processErrors === 0) {
      console.log('ℹ️ All guild names already present in configs');
    }
  } catch (saveErr) {
    console.error('❌ Critical failure during batch config save:', saveErr);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  // Cooldown handling - use module-level cooldowns Map (NOT destructured from client)
  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Map());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const defaultCooldownDuration = 3;
  const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
    if (now < expirationTime) {
      const expiredTimeout = expirationTime - now;
      return interaction.reply({
        content: `⚠️ Please wait ${Math.round(expiredTimeout / 1000)} more second(s) before reusing the \`${command.data.name}\` command.`,
        ephemeral: true
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  // Execute command
  try {
    await command.execute(interaction, { eventsConfig, streamingConfig });
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ There was an error while executing this command!', ephemeral: true });
    }
  }
});

// Streaming presence tracking
client.on('presenceUpdate', async (oldPresence, newPresence) => {
  if (!newPresence?.member || !newPresence.guild) return;
  
  try {
    const guildConfig = streamingConfig.getGuildConfig(newPresence.guild.id);
    if (!guildConfig?.enabled || !guildConfig.channels?.length) return;
    
    // Handle streaming status changes
    const wasStreaming = oldPresence?.activities?.some(a => a.type === 1);
    const isStreaming = newPresence.activities?.some(a => a.type === 1);
    
    if (!wasStreaming && isStreaming) {
      // User started streaming
      const streamActivity = newPresence.activities.find(a => a.type === 1);
      streamingConfig.addActiveStream(
        newPresence.guild.id,
        newPresence.userId,
        streamActivity.name,
        streamActivity.url
      );
      
      // Notify channels
      for (const channelId of guildConfig.channels) {
        const channel = newPresence.guild.channels.cache.get(channelId);
        if (channel?.isTextBased()) {
          const member = newPresence.member;
          const embed = new EmbedBuilder()
            .setColor('#6441A5')
            .setTitle('🔴 Live Stream Started')
            .setDescription(`${member} is now streaming **${streamActivity.name}**`)
            .setURL(streamActivity.url || 'https://twitch.tv/')
            .setThumbnail(member.displayAvatarURL())
            .setTimestamp();
          
          try {
            await channel.send({ embeds: [embed] });
          } catch (err) {
            console.warn(`⚠️ Failed to send stream notification to channel ${channelId}:`, err.message);
          }
        }
      }
    } else if (wasStreaming && !isStreaming) {
      // User stopped streaming
      streamingConfig.removeActiveStream(newPresence.guild.id, newPresence.userId);
    }
  } catch (err) {
    console.error(`❌ Error in presenceUpdate handler for guild ${newPresence.guild?.id}:`, err);
  }
});

// Database connection and login
(async () => {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    
    await client.login(token);
  } catch (error) {
    console.error('❌ Critical startup error:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️ Received SIGINT. Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Received SIGTERM. Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

module.exports = { client, commands };