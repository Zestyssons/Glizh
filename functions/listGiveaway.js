const { EmbedBuilder } = require('discord.js');
const Giveaway = require('../models/Giveaway');

module.exports = async function listGiveaway(interaction) {
  try {
    // Encontrar todos los sorteos activos en el servidor
    const giveaways = await Giveaway.find({
      guildId: interaction.guild.id,
      ended: false
    }).sort({ endDate: 1 }); // Ordenar por fecha de finalización, más cercanos primero

    if (giveaways.length === 0) {
      return interaction.reply({
        content: 'No hay sorteos activos en este servidor.',
        ephemeral: true
      });
    }

    // Crear embed para listar sorteos
    const listEmbed = new EmbedBuilder()
      .setTitle('Sorteos Activos')
      .setColor(0x5865F2)
      .setDescription(`Actualmente hay ${giveaways.length} sorteos activos.`)
      .setFooter({ 
        text: interaction.guild.name, 
        iconURL: interaction.guild.iconURL({ dynamic: true }) 
      })
      .setTimestamp();

    // Añadir cada sorteo al embed
    for (let i = 0; i < giveaways.length; i++) {
      const giveaway = giveaways[i];
      const endTime = Math.floor(giveaway.endDate.getTime() / 1000);

      listEmbed.addFields({
        name: `${i + 1}. ${giveaway.prize}`,
        value: `• **Finaliza**: <t:${endTime}:R>\n• **Ganadores**: ${giveaway.winnerCount}\n• **Organizado por**: <@${giveaway.hostId}>\n• **Canal**: <#${giveaway.channelId}>\n• **ID del Mensaje**: \`${giveaway.messageId}\`\n• **Participantes**: ${giveaway.participants.length}`,
      });
    }

    await interaction.reply({ embeds: [listEmbed] });

  } catch (error) {
    console.error('Error al listar sorteos:', error);
    return interaction.reply({
      content: 'Ocurrió un error al listar los sorteos.',
      ephemeral: true
    });
  }
};