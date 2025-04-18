const { Events } = require('discord.js');
const { GuildSettings, MemberData, LevelRoles } = require('../models/Level');

const cooldowns = new Map();
const messageTimestamps = new Map();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const guildData = await GuildSettings.findOne({
      guildId: message.guild.id,
    });

    // Check if guildData exists before accessing properties
    if (!guildData || !guildData.levelingEnabled) return;

    const messageCooldown = 3000;
    const xpRate = guildData.xpRate || 1;

    const currentTime = Date.now();
    const lastMessageTime = messageTimestamps.get(message.author.id);

    if (lastMessageTime && currentTime - lastMessageTime < messageCooldown) {
      return;
    }

    messageTimestamps.set(message.author.id, currentTime);

    const xpToAdd = Math.floor(Math.random() * 10 + 5) * xpRate;

    let memberData = await MemberData.findOne({
      guildId: message.guild.id,
      userId: message.author.id,
    });
    if (!memberData) {
      memberData = new MemberData({
        guildId: message.guild.id,
        userId: message.author.id,
        level: 1,
        xp: 0,
        totalXp: 0,
      });
    } else {
      memberData.xp += xpToAdd;
      memberData.totalXp += xpToAdd;
    }

    let previousLevel = memberData.level;
    let levelUpCount = 0;

    const calculateXpNeeded = (level) => {
      if (level === 1) {
        return guildData.startingXp || 100; // Default value if startingXp is undefined
      } else {
        return (
          (guildData.startingXp || 100) +
          (level - 1) * (guildData.xpPerLevel || 50)
        ); // Default values
      }
    };

    while (memberData.xp >= calculateXpNeeded(memberData.level)) {
      memberData.xp -= calculateXpNeeded(memberData.level);
      memberData.level++;
      levelUpCount++;
    }

    if (levelUpCount > 0) {
      const cooldownTime = 5000;
      const userId = message.author.id;

      if (
        !cooldowns.has(userId) ||
        currentTime - cooldowns.get(userId) > cooldownTime
      ) {
        cooldowns.set(userId, currentTime);
        await this.notifyLevelUp(message, memberData.level, guildData);
      }
      await this.assignRoles(message, previousLevel + 1, memberData.level);
    }

    await memberData.save();
  },

  async notifyLevelUp(message, level, guildData) {
    const levelUpChannel = guildData.levelUpChannelId
      ? message.guild.channels.cache.get(guildData.levelUpChannelId)
      : message.channel;

    await levelUpChannel.send(
      `${message.author} has leveled up to level ${level}!`
    );
  },

  async assignRoles(message, startLevel, endLevel) {
    const rolesToAdd = await LevelRoles.find({
      guildId: message.guild.id,
      level: { $gte: startLevel, $lte: endLevel },
    });

    if (rolesToAdd.length > 0) {
      const member = message.guild.members.cache.get(message.author.id);
      const rolePromises = rolesToAdd.map(async (roleData) => {
        const role = message.guild.roles.cache.get(roleData.roleId);
        if (role) {
          try {
            await member.roles.add(role);
          } catch (error) {
            console.error(
              `Failed to add role: ${role.name} to ${member.user.username}. Error: ${error.message}`
            );
          }
        }
      });
      await Promise.all(rolePromises);
    }

    const additionalRoles = await LevelRoles.find({
      guildId: message.guild.id,
      level: { $lt: startLevel },
    });

    if (additionalRoles.length > 0) {
      const member = message.guild.members.cache.get(message.author.id);
      const additionalRolePromises = additionalRoles.map(async (roleData) => {
        const role = message.guild.roles.cache.get(roleData.roleId);
        if (role) {
          try {
            await member.roles.add(role);
          } catch (error) {
            console.error(
              `Failed to add additional role: ${role.name} to ${member.user.username}. Error: ${error.message}`
            );
          }
        }
      });
      await Promise.all(additionalRolePromises);
    }
  },
};
