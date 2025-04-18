const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription(
      'Alterna la reproducción automática para reproducir pistas recomendadas cuando la cola está vacía.'
    ),
  async execute(interaction) {
    const client = interaction.client;
    const player = client.lavalink.players.get(interaction.guild.id);

    if (!player.playing) {
      return interaction.reply({
        content: '❌ ¡No se está reproduciendo nada!',
        ephemeral: true,
      });
    }

    if (!interaction.member.voice.channel) {
      return interaction.reply({
        content: '❌ ¡Debes estar en un canal de voz!',
        ephemeral: true,
      });
    }

    if (player.voiceChannelId !== interaction.member.voice.channelId) {
      return interaction.reply({
        content: '❌ ¡Debes estar en el mismo canal de voz que yo!',
        ephemeral: true,
      });
    }

    if (
      player.queue.current.info.sourceName !== 'youtube' &&
      player.queue.current.info.sourceName !== 'youtubemusic'
    ) {
      return interaction.reply({
        content: `La reproducción automática no admite la fuente \`${player.queue.current.info.sourceName}\``,
      });
    }

    const autoplay = player.get('autoplay') || false;
    player.set('autoplay', !autoplay);

    return interaction.reply(
      `✅ **La reproducción automática ahora está ${autoplay ? 'desactivada' : 'activada'}!**`
    );
  },
};