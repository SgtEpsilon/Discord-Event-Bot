// src/repositories/GuildRepository.js
//
// Single source of truth for all guild database operations.
// Import this wherever you previously read/wrote data/guilds.json.
//
// Usage:
//   const GuildRepository = require('./src/repositories/GuildRepository');
//   const guild = await GuildRepository.upsert({ id: '123', name: 'My Server', memberCount: 42 });
//   const all   = await GuildRepository.findAll();

const Guild = require('../models/Guild');

const GuildRepository = {
  /**
   * Find a single guild by its Discord snowflake ID.
   * Returns null if not found.
   */
  async findById(guildId) {
    return Guild.findByPk(String(guildId));
  },

  /**
   * Return all guilds, ordered by name.
   * Pass { activeOnly: true } to exclude guilds the bot has left.
   */
  async findAll({ activeOnly = false } = {}) {
    const where = activeOnly ? { active: true } : {};
    return Guild.findAll({ where, order: [['name', 'ASC']] });
  },

  /**
   * Insert or update a guild record.
   * Accepts a plain object with at minimum { id, name }.
   * Returns the Guild instance.
   */
  async upsert({ id, name, memberCount = null, eventChannelId = null, streamingChannelId = null }) {
    const [guild] = await Guild.upsert(
      {
        id: String(id),
        name: name || 'Unknown Server',
        memberCount: memberCount ?? null,
        eventChannelId: eventChannelId ?? null,
        streamingChannelId: streamingChannelId ?? null,
        active: true
      },
      { returning: true }
    );
    return guild;
  },

  /**
   * Update specific fields on a guild.
   * Creates the record if it doesn't exist yet.
   */
  async update(guildId, fields) {
    const [guild, created] = await Guild.findOrCreate({
      where: { id: String(guildId) },
      defaults: { name: 'Unknown Server', ...fields }
    });

    if (!created) {
      await guild.update(fields);
    }

    return guild;
  },

  /**
   * Set a guild's event announcement channel.
   */
  async setEventChannel(guildId, channelId) {
    return this.update(guildId, { eventChannelId: channelId ?? null });
  },

  /**
   * Set a guild's streaming notification channel.
   */
  async setStreamingChannel(guildId, channelId) {
    return this.update(guildId, { streamingChannelId: channelId ?? null });
  },

  /**
   * Mark a guild inactive when the bot is removed from a server.
   * The row is kept for historical reference.
   */
  async deactivate(guildId) {
    return Guild.update({ active: false }, { where: { id: String(guildId) } });
  },

  /**
   * Permanently delete a guild record (use sparingly).
   */
  async delete(guildId) {
    return Guild.destroy({ where: { id: String(guildId) } });
  },

  /**
   * Return total count of active guilds.
   */
  async count({ activeOnly = true } = {}) {
    const where = activeOnly ? { active: true } : {};
    return Guild.count({ where });
  }
};

module.exports = GuildRepository;
