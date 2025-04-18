
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Detiene completamente la reproducción y limpia la cola'),

  async execute(interaction) {
    const member = interaction.member;

    // Verificar si el usuario está en un canal de voz
    if (!member.voice.channel) {
      return interaction.reply({
        content: '❌ ¡Necesitas unirte a un canal de voz primero!',
        ephemeral: true,
      });
    }

    // Obtener el reproductor actual
    const player = interaction.client.lavalink.players.get(interaction.guild.id);
    
    // Verificar si hay un reproductor activo
    if (!player) {
      return interaction.reply({
        content: '❌ ¡No hay nada reproduciéndose actualmente!',
        ephemeral: true,
      });
    }

    // Verificar si el usuario está en el mismo canal que el bot
    if (player.voiceChannelId !== member.voice.channelId) {
      return interaction.reply({
        content: '❌ ¡Debes estar en el mismo canal de voz que yo!',
        ephemeral: true,
      });
    }

    try {
      // Detener la reproducción y limpiar la cola
      await player.queue.clear(); // Limpiar la cola primero
      await player.stopPlaying(); // Detener la reproducción actual
      
      return interaction.reply('⏹️ **Reproducción detenida y cola limpiada**');
    } catch (error) {
      console.error('[Stop] Error en el comando /stop:', error);
      return interaction.reply({
        content: '❌ Ocurrió un error al intentar detener la reproducción. Por favor, inténtalo más tarde.',
        ephemeral: true,
      });
    }
  },
};
