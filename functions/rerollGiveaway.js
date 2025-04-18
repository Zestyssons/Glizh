const { EmbedBuilder } = require('discord.js');
const Giveaway = require('../models/Giveaway');

module.exports = async function rerollGiveaway(interaction, messageId, winnerCount = 1) {
  try {
    // Encontrar sorteo en la base de datos
    const giveaway = await Giveaway.findOne({
      messageId: messageId,
      guildId: interaction.guild.id,
      ended: true
    });

    if (!giveaway) {
      return interaction.reply({
        content: 'No se pudo encontrar un sorteo completado con ese ID de mensaje.',
        ephemeral: true
      });
    }

    // Obtener el canal del sorteo
    const channel = await interaction.guild.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) {
      return interaction.reply({
        content: 'El canal para este sorteo ya no existe.',
        ephemeral: true
      });
    }

    // Comprobar si hay participantes
    if (giveaway.participants.length === 0) {
      return interaction.reply({
        content: 'No se puede repetir el sorteo ya que nadie participó.',
        ephemeral: true
      });
    }

    // Determinar ganadores
    const actualWinnerCount = Math.min(winnerCount, giveaway.participants.length);
    const newWinners = [];

    // Filtrar ganadores anteriores si es posible
    let eligibleParticipants = [...giveaway.participants];

    // Seleccionar ganadores aleatorios únicos
    for (let i = 0; i < actualWinnerCount; i++) {
      if (eligibleParticipants.length === 0) break;

      const winnerIndex = Math.floor(Math.random() * eligibleParticipants.length);
      newWinners.push(eligibleParticipants[winnerIndex]);
      eligibleParticipants.splice(winnerIndex, 1);
    }

    if (newWinners.length === 0) {
      return interaction.reply({
        content: 'No se pudo encontrar participantes elegibles para repetir el sorteo.',
        ephemeral: true
      });
    }

    // Formatear ganadores para mostrar
    const winnerMention = newWinners.map(id => `<@${id}>`).join(', ');

    // Anunciar nuevos ganadores
    await channel.send({
      content: `🎉 ¡Nuevo sorteo! ¡Felicidades ${winnerMention}! Has ganado **${giveaway.prize}**!`,
      allowedMentions: { users: newWinners }
    });

    // Actualizar la base de datos con nuevos ganadores
    giveaway.winners = [...giveaway.winners, ...newWinners];
    await giveaway.save();

    return interaction.reply({
      content: `¡Se repitió el sorteo con éxito y hay ${newWinners.length} nuevo(s) ganador(es)!`,
      ephemeral: true
    });

  } catch (error) {
    console.error('Error al repetir sorteo:', error);
    return interaction.reply({
      content: 'Ocurrió un error al repetir el sorteo.',
      ephemeral: true
    });
  }
};