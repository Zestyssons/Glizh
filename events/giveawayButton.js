const { Events, EmbedBuilder } = require('discord.js');
const Giveaway = require('../models/Giveaway');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // Manejar botón de participación en sorteo
    if (interaction.customId === 'giveaway-enter') {
      try {
        // Obtener el sorteo de la base de datos usando el ID del mensaje
        const giveaway = await Giveaway.findOne({
          messageId: interaction.message.id,
          guildId: interaction.guild.id,
          ended: false
        });

        if (!giveaway) {
          return interaction.reply({
            content: 'Este sorteo ya no está activo o no existe.',
            ephemeral: true
          });
        }

        // Comprobar si el usuario ya está participando
        if (giveaway.participants.includes(interaction.user.id)) {
          // El usuario ya está participando, eliminarlo (abandonar sorteo)
          giveaway.participants = giveaway.participants.filter(id => id !== interaction.user.id);
          await giveaway.save();

          return interaction.reply({
            content: 'Has abandonado el sorteo.',
            ephemeral: true
          });
        } else {
          // Añadir usuario a participantes
          giveaway.participants.push(interaction.user.id);
          await giveaway.save();

          // Actualizar embed para mostrar nuevo recuento de participantes
          const message = interaction.message;
          const embed = EmbedBuilder.from(message.embeds[0]);

          embed.setFields([
            { name: 'Participantes', value: `${giveaway.participants.length}`, inline: true },
            { name: 'Ganadores', value: `${giveaway.winnerCount}`, inline: true }
          ]);

          await message.edit({ embeds: [embed] });

          return interaction.reply({
            content: `¡Has entrado en el sorteo de **${giveaway.prize}**! ¡Buena suerte!`,
            ephemeral: true
          });
        }
      } catch (error) {
        console.error('Error al manejar botón de sorteo:', error);
        return interaction.reply({
          content: 'Hubo un error al procesar tu solicitud.',
          ephemeral: true
        });
      }
    }
  },
};