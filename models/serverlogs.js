
const mongoose = require('mongoose');

const ServerLogSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  logChannel: {
    type: String,
    default: null,
  },
  categories: {
    messages: {
      type: Boolean,
      default: false,
    },
    channels: {
      type: Boolean,
      default: false,
    },
    members: {
      type: Boolean,
      default: false,
    },
    roles: {
      type: Boolean,
      default: false,
    },
    moderation: {
      type: Boolean,
      default: false,
    },
    voice: {
      type: Boolean,
      default: false,
    },
    server: {
      type: Boolean,
      default: false,
    },
  },
});

module.exports = mongoose.model('ServerLog', ServerLogSchema);
