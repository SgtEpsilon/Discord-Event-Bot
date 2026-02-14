// src/models/index.js
const Event = require('./Event');
const Preset = require('./Preset');
const EventsConfig = require('./EventsConfig');
const StreamingConfig = require('./StreamingConfig');
const CalendarConfig = require('./CalendarConfig');
const AutoSyncConfig = require('./AutoSyncConfig');

module.exports = {
  Event,
  Preset,
  EventsConfig,
  StreamingConfig,
  CalendarConfig,
  AutoSyncConfig
};