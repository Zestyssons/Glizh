const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatTime } = require('../../utils/utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription(
      'Reproduce una canción o lista de reproducción desde diferentes fuentes'
    )
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Nombre de la canción o URL')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('source')
        .setDescription('La fuente desde la cual deseas reproducir la música')
        .addChoices(
          { name: 'Youtube', value: 'ytsearch' },
          { name: 'Youtube Music', value: 'ytmsearch' },
          { name: 'Spotify', value: 'spsearch' },
          { name: 'Soundcloud', value: 'scsearch' },
          { name: 'Deezer', value: 'dzsearch' }
        )
    ),

  // Manejo del autocompletado
  async autocomplete(interaction) {
    try {
      const query = interaction.options.getFocused();

      // Validación de la consulta
      if (!query.trim()) {
        return await interaction.respond([
          {
            name: 'Empieza a escribir para buscar canciones...',
            value: 'empieza_escribir',
          },
        ]);
      }

      const member = interaction.member;
      const notInVC = !member.voice.channel;

      const source = 'spsearch';

      const player = interaction.client.lavalink.createPlayer({
        guildId: interaction.guildId,
        textChannelId: interaction.channelId,
        voiceChannelId: interaction.member.voice.channel?.id || '',
        selfDeaf: true,
        onEmptyQueue: {
          destroyAfterMs: 60000, // Ajuste: 60 segundos antes de desconectarse
        },
      });

      try {
        const results = await player.search({ query, source });

        if (!results?.tracks?.length) {
          return await interaction.respond([
            { name: 'No se encontraron resultados', value: 'sin_resultados' },
          ]);
        }

        // Filtrar resultados y truncar nombres si exceden 100 caracteres
        const options = results.tracks.slice(0, 25).map((track) => ({
          name: `${track.info.title.slice(0, 97)}${track.info.title.length > 97 ? '...' : ''} - ${track.info.author.slice(0, 97)}`,
          value: track.info.uri,
        }));

        if (notInVC) {
          options.unshift({
            name: '⚠️ ¡Únete a un canal de voz primero!',
            value: 'unete_vc',
          });
        }

        return await interaction.respond(options);
      } catch (searchError) {
        console.error('Error en la búsqueda:', searchError);
        return await interaction.respond([
          { name: 'Error al buscar pistas', value: 'error' },
        ]);
      }
    } catch (error) {
      console.error('Error en el autocompletado:', error);
      return await interaction.respond([
        { name: 'Ocurrió un error', value: 'error' },
      ]);
    }
  },

  // Ejecución del comando
  async execute(interaction) {
    const client = interaction.client;
    const query = interaction.options.getString('query');
    const member = interaction.member;
    const source = interaction.options.getString('source') || 'spsearch';

    if (
      query === 'unete_vc' ||
      query === 'empieza_escribir' ||
      query === 'error'
    ) {
      return interaction.reply({
        content: '❌ ¡Únete a un canal de voz y selecciona una canción válida!',
        ephemeral: true,
      });
    }

    if (query === 'sin_resultados') {
      return interaction.reply({
        content:
          '❌ ¡No se encontraron resultados! Intenta con otro término de búsqueda.',
        ephemeral: true,
      });
    }

    if (!member.voice.channel) {
      return interaction.reply({
        content: '❌ ¡Necesitas unirte a un canal de voz primero!',
        ephemeral: true,
      });
    }

    let player = client.lavalink.players.get(interaction.guild.id);
    if (!player) {
      player = client.lavalink.createPlayer({
        guildId: interaction.guild.id,
        voiceChannelId: member.voice.channel.id,
        textChannelId: interaction.channel.id,
        selfDeaf: true,
        onEmptyQueue: {
          destroyAfterMs: 60000, // Ajuste: 60 segundos antes de desconectarse
        },
      });
    }
    await player.connect();

    await interaction.deferReply();

    const isURL = query.startsWith('http://') || query.startsWith('https://');
    const search = await player.search({ query, source });

    player.requester = interaction.member;

    if (!search?.tracks?.length) {
      return interaction.editReply({
        content:
          '❌ ¡No se encontraron resultados! Intenta con otro término de búsqueda.',
        ephemeral: true,
      });
    }

    if (search.loadType === 'playlist') {
      for (const track of search.tracks) {
        await player.queue.add(track);
      }

      const playlistEmbed = new EmbedBuilder()
        .setColor('#DDA0DD')
        .setAuthor({
          name: 'Lista de reproducción añadida a la cola 📃',
          iconURL: client.user.displayAvatarURL(),
        })
        .setTitle(search.playlist?.title)
        .setDescription(
          `Añadidas \`${search.tracks.length}\` pistas de la lista de reproducción`
        )
        .setTimestamp();

      if (!player.playing) {
        await player.play();
      }

      return interaction.editReply({ embeds: [playlistEmbed] });
    } else {
      const track = search.tracks[0];
      await player.queue.add(track);

      const trackEmbed = new EmbedBuilder()
        .setColor('#DDA0DD')
        .setAuthor({
          name: 'Añadido a la Cola 🎵',
          iconURL: client.user.displayAvatarURL(),
        })
        .setTitle(track.info.title)
        .setURL(track.info.uri)
        .setTimestamp();

      if (!player.playing) {
        await player.play();
      }

      return interaction.editReply({ embeds: [trackEmbed] });
    }
  },
  // Método para ejecutar desde mensajes normales
  async executeMessage(client, message, query) {
    try {
      if (!query) {
        return message.reply({ content: 'Por favor, proporciona una canción para reproducir.' });
      }

      // Verificar si el usuario está en un canal de voz
      const { channel } = message.member.voice;
      if (!channel) {
        return message.reply({ 
          content: 'Debes estar en un canal de voz para usar este comando.' 
        });
      }

      // Verificar permisos necesarios
      const permissions = channel.permissionsFor(message.client.user);
      if (!permissions.has('Connect') || !permissions.has('Speak')) {
        return message.reply({ 
          content: 'Necesito permisos para unirme y hablar en tu canal de voz.' 
        });
      }

      // Crear/obtener el reproductor
      const player = client.lavalink.createPlayer({
        guildId: message.guild.id,
        voiceChannelId: channel.id,
        textChannelId: message.channel.id,
        selfDeaf: true,
        selfMute: false,
        volume: 100,
      });

      try {
        // Conectar al canal si aún no está conectado
        if (!player.connected) await player.connect();

        // Buscar la canción
        const res = await player.search(query, message.author);

        // Verificar que hay resultados
        if (res.loadType === 'LOAD_FAILED' || res.loadType === 'NO_MATCHES') {
          return message.reply({ 
            content: 'No se encontraron resultados para tu búsqueda.' 
          });
        }

        // Añadir a la cola
        if (res.loadType === 'PLAYLIST_LOADED') {
          // Es una playlist
          for (const track of res.tracks) {
            track.requester = message.author;
            player.queue.add(track);
          }

          message.reply({ 
            content: `Playlist añadida: **${res.playlist.name}** con ${res.tracks.length} canciones.` 
          });
        } else {
          // Es una sola canción
          const track = res.tracks[0];
          track.requester = message.author;
          player.queue.add(track);

          message.reply({ 
            content: `Añadido a la cola: **${track.title}**` 
          });
        }

        // Reproducir si no está reproduciendo ya
        if (!player.playing && !player.paused) {
          return player.play();
        }
      } catch (error) {
        console.error('Error en el comando play desde mensaje:', error);
        return message.reply({ 
          content: 'Ocurrió un error al reproducir la canción. Por favor, inténtalo de nuevo.' 
        });
      }
    } catch (error) {
      console.error('Error global en executeMessage:', error);
      return message.reply({ 
        content: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.' 
      });
    }
  },
};