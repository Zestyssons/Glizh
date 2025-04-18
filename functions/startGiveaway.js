const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require('discord.js');
const Giveaway = require('../models/Giveaway');
const ms = require('ms');

async function startGiveaway(interaction) {
  const duration = interaction.options.getString('duration');
  const prize = interaction.options.getString('prize');
  const winners = interaction.options.getInteger('winners');
  const requiredRole = interaction.options.getRole('required_role');
  const channel = interaction.options.getChannel('channel');
  const channelId = channel ? channel.id : interaction.channel.id;
  const endTime = Date.now() + ms(duration);
  const durationRegex = /^(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?$/;
  if (!durationRegex.test(duration)) {
    return interaction.reply({
      content: 'Invalid duration format! Use something like `1d2h30m40s`.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('🎉 New Giveaway! 🎉')
    .setDescription(
      `Prize: **${prize}**\nHosted by: ${interaction.user}\nEnds in: <t:${Math.floor(endTime / 1000)}:R>`
    )
    .setColor('#FF0000')
    .setTimestamp(endTime);

  if (requiredRole) {
    embed.addFields({
      name: 'Required Role',
      value: `${requiredRole}`,
      inline: true,
    });
  }

  const joinButton = new ButtonBuilder()
    .setCustomId('join_giveaway')
    .setLabel(`🎉`)
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(joinButton);
  ch = channel ? channel : interaction.channel;
  const giveawayMessage = await ch.send({
    embeds: [embed],
    components: [row],
  });

  const giveaway = new Giveaway({
    guildId: interaction.guild.id,
    channelId: channelId,
    messageId: giveawayMessage.id,
    prize,
    endTime: new Date(endTime),
    winners,
    participants: [],
    ongoing: true,
    requiredRole: requiredRole ? requiredRole.id : null,
  });

  await giveaway.save();
  await interaction.reply({
    content: 'Giveaway started successfully!',
    ephemeral: true,
  });
}

module.exports = startGiveaway;
