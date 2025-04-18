const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Establece el modo de repetición para el reproductor de música')
    .addStringOption((option) =>
      option
        .setName('mode')
        .setDescription('Elige el modo de repetición')
        .setRequired(true)
        .addChoices(
          { name: 'Apagado', value: 'off' },
          { name: 'Canción', value: 'track' },
          { name: 'Cola', value: 'queue' }
        )
    ),
  async execute(interaction) {
    const client = interaction.client;
    const player = client.lavalink.players.get(interaction.guild.id);

    if (!player) {
      return interaction.reply({
        content: '❌ ¡No hay nada reproduciéndose actualmente!',
        ephemeral: true,
      });
    }

    const mode = interaction.options.getString('mode');
    let repeatMode;

    // Mapear el modo seleccionado a los modos de repetición de Lavalink
    switch (mode) {
      case 'off':
        repeatMode = 0; // Sin repetición
        break;
      case 'track':
        repeatMode = 1; // Repetir la canción actual
        break;
      case 'queue':
        repeatMode = 2; // Repetir toda la cola
        break;
      default:
        return interaction.reply({
          content: '❌ ¡Modo de repetición inválido seleccionado!',
          ephemeral: true,
        });
    }

    player.setLoopMode(repeatMode); // Suponiendo que tu wrapper de Lavalink usa setLoopMode

    interaction.reply(`🔄 Modo de repetición establecido en: **${mode.charAt(0).toUpperCase() + mode.slice(1)}**`);
  },
};