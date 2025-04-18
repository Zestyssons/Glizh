const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insert')
    .setDescription('Inserta una canción al principio de la cola o la reproduce si no hay nada sonando.')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Nombre de la canción o URL')
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString('query');
    const member = interaction.member;

    try {
      // Validar si el usuario está en un canal de voz
      if (!member.voice.channel) {
        return interaction.reply({
          content: '❌ ¡Necesitas unirte a un canal de voz primero!',
          ephemeral: true,
        });
      }

      // Validar permisos del bot en el canal de voz
      const botPermissions = member.voice.channel.permissionsFor(interaction.guild.members.me);
      if (!botPermissions.has('Connect') || !botPermissions.has('Speak')) {
        return interaction.reply({
          content: '❌ No tengo permisos para unirme o hablar en tu canal de voz.',
          ephemeral: true,
        });
      }

      // Crear o recuperar el reproductor de Lavalink
      let player = interaction.client.lavalink.players.get(interaction.guild.id);
      if (!player) {
        player = interaction.client.lavalink.createPlayer({
          guildId: interaction.guild.id,
          voiceChannelId: member.voice.channel.id,
          textChannelId: interaction.channel.id,
          selfDeaf: true,
          onEmptyQueue: {
            destroyAfterMs: 60000, // Desconectar después de 60 segundos si la cola está vacía
          },
        });
      }
      await player.connect();

      // Defer la respuesta para evitar tiempos de espera
      await interaction.deferReply();

      // Buscar la canción o lista de reproducción
      const search = await player.search({ query, source: 'ytsearch' });

      // Validar resultados de búsqueda
      if (!search?.tracks?.length) {
        return interaction.editReply({
          content: '❌ ¡No se encontraron resultados! Intenta con otro término de búsqueda.',
          ephemeral: true,
        });
      }

      const track = search.tracks[0];

      // Si no hay nada reproduciéndose, actuar como `/play`
      if (!player.queue.current) {
        await player.queue.add(track);
        await player.play();
        return interaction.editReply(
          `🎵 Reproduciendo ahora: **${track.info.title}** - ${track.info.author}`
        );
      }

      // Si ya hay algo reproduciéndose, insertar al principio de la cola
      await player.queue.unshift(track);

      return interaction.editReply(
        `🎵 Añadido al principio de la cola: **${track.info.title}** - ${track.info.author}`
      );
    } catch (error) {
      console.error('[Insert] Error en el comando /insert:', error);
      return interaction.editReply({
        content: '❌ Ocurrió un error al intentar insertar la canción. Por favor, inténtalo más tarde.',
        ephemeral: true,
      });
    }
  },
};