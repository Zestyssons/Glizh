const { EmbedBuilder } = require('discord.js');
const Giveaway = require('../models/Giveaway');

module.exports = async function cancelGiveaway(interaction, messageId) {
  try {
    // Encontrar sorteo en la base de datos
    const giveaway = await Giveaway.findOne({
      messageId: messageId,
      guildId: interaction.guild.id,
      ended: false
    });

    if (!giveaway) {
      return interaction.reply({
        content: 'No se pudo encontrar un sorteo activo con ese ID de mensaje.',
        ephemeral: true
      });
    }

    // Obtener el mensaje del sorteo
    const channel = await interaction.guild.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) {
      return interaction.reply({
        content: 'El canal para este sorteo ya no existe.',
        ephemeral: true
      });
    }

    const giveawayMessage = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (!giveawayMessage) {
      giveaway.ended = true;
      giveaway.canceled = true;
      giveaway.endDate = new Date();
      await giveaway.save();

      return interaction.reply({
        content: 'No se pudo encontrar el mensaje del sorteo, pero el sorteo ha sido marcado como cancelado en la base de datos.',
        ephemeral: true
      });
    }

    // Actualizar el mensaje del sorteo
    const canceledEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
      .setColor(0xFF0000)
      .setDescription(`**Premio**: ${giveaway.prize}\n**Cancelado**: <t:${Math.floor(Date.now() / 1000)}:R>\n**Organizado por**: <@${giveaway.hostId}>\n\nEste sorteo ha sido cancelado.`)
      .setFooter({ text: 'Sorteo Cancelado' });

    await giveawayMessage.edit({
      embeds: [canceledEmbed],
      components: []
    });

    // Actualizar la base de datos
    giveaway.ended = true;
    giveaway.canceled = true;
    giveaway.endDate = new Date();
    await giveaway.save();

    return interaction.reply({
      content: 'El sorteo ha sido cancelado con éxito.',
      ephemeral: true
    });

  } catch (error) {
    console.error('Error al cancelar sorteo:', error);
    return interaction.reply({
      content: 'Ocurrió un error al cancelar el sorteo.',
      ephemeral: true
    });
  }
};