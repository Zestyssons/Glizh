const { EmbedBuilder } = require('discord.js');
const Giveaway = require('../models/Giveaway');

module.exports = async function endGiveaway(interaction, messageId) {
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
      return interaction.reply({
        content: 'No se pudo encontrar el mensaje del sorteo.',
        ephemeral: true
      });
    }

    // Comprobar si hay participantes
    if (giveaway.participants.length === 0) {
      // Actualizar el mensaje del sorteo
      const endedEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
        .setColor(0x808080)
        .setDescription(`**Premio**: ${giveaway.prize}\n**Finalizado**: <t:${Math.floor(Date.now() / 1000)}:R>\n**Organizado por**: <@${giveaway.hostId}>\n\nNadie participó en el sorteo.`)
        .setFooter({ text: 'Sorteo Finalizado' });

      await giveawayMessage.edit({
        embeds: [endedEmbed],
        components: []
      });

      // Actualizar la base de datos
      giveaway.ended = true;
      giveaway.endDate = new Date();
      await giveaway.save();

      return interaction.reply({
        content: 'El sorteo ha finalizado, pero nadie participó.',
        ephemeral: true
      });
    }

    // Determinar ganadores
    const winnerCount = Math.min(giveaway.winnerCount, giveaway.participants.length);
    const winners = [];

    // Seleccionar ganadores únicos aleatorios
    const participantsCopy = [...giveaway.participants];
    for (let i = 0; i < winnerCount; i++) {
      const winnerIndex = Math.floor(Math.random() * participantsCopy.length);
      winners.push(participantsCopy[winnerIndex]);
      participantsCopy.splice(winnerIndex, 1);
    }

    // Formatear ganadores para mostrar
    const winnerMention = winners.map(id => `<@${id}>`).join(', ');

    // Actualizar el mensaje del sorteo
    const endedEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
      .setColor(0x00FF00)
      .setDescription(`**Premio**: ${giveaway.prize}\n**Finalizado**: <t:${Math.floor(Date.now() / 1000)}:R>\n**Organizado por**: <@${giveaway.hostId}>\n**Ganadores**: ${winnerMention}`)
      .setFooter({ text: 'Sorteo Finalizado' });

    await giveawayMessage.edit({
      embeds: [endedEmbed],
      components: []
    });

    // Anunciar ganadores
    await channel.send({
      content: `🎉 ¡Felicidades ${winnerMention}! Has ganado **${giveaway.prize}**!`,
      allowedMentions: { users: winners }
    });

    // Actualizar la base de datos
    giveaway.ended = true;
    giveaway.endDate = new Date();
    giveaway.winners = winners;
    await giveaway.save();

    return interaction.reply({
      content: `¡El sorteo ha finalizado con ${winners.length} ganador(es)!`,
      ephemeral: true
    });

  } catch (error) {
    console.error('Error al finalizar sorteo:', error);
    return interaction.reply({
      content: 'Ocurrió un error al finalizar el sorteo.',
      ephemeral: true
    });
  }
};