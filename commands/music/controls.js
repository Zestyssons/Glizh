const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('controles')
    .setDescription('Controles básicos de reproducción')
    .addSubcommand((subcommand) =>
      subcommand.setName('unirse').setDescription('Unirse al canal de voz')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('pausa').setDescription('Pausar la canción actual')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('reanudar').setDescription('Reanudar la reproducción')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('saltar').setDescription('Saltar a la siguiente canción')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('detener')
        .setDescription('Detener la reproducción y limpiar la cola')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('salir').setDescription('Salir del canal de voz')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('aleatorio').setDescription('Ordenar la cola aleatoriamente')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('buscar')
        .setDescription('Ir a una posición específica de la canción')
        .addStringOption((option) =>
          option.setName('tiempo').setDescription('Tiempo al que deseas buscar')
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('volumen')
        .setDescription('Cambiar el volumen del reproductor')
        .addIntegerOption((option) =>
          option
            .setName('nivel')
            .setDescription('Volumen')
            .setRequired(true)
            .setMaxValue(100)
            .setMinValue(0)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('saltara')
        .setDescription('Saltar a una canción específica en la cola')
        .addIntegerOption((option) =>
          option
            .setName('posicion')
            .setDescription('Posición a la que deseas saltar')
            .setRequired(true)
            .setMinValue(1)
        )
    ),
  async execute(interaction) {
    client = interaction.client;
    const player = client.lavalink.players.get(interaction.guild.id);
    const subcommand = interaction.options.getSubcommand();
    if (subcommand != 'unirse') {
      if (!player) {
        return interaction.reply({
          content: '¡No se está reproduciendo nada!',
          ephemeral: true,
        });
      }
    }

    switch (subcommand) {
      case 'unirse':
        if (!player) {
          client.lavalink
            .createPlayer({
              guildId: interaction.guild.id,
              voiceChannelId: interaction.member.voice.channel.id,
              textChannelId: interaction.channel.id,
              selfDeaf: true,
            })
            .connect();
          return interaction.reply(
            `🎵 Unido a <#${interaction.member.voice.channel.id}>`
          );
        } else {
          return interaction.reply(
            `Ya estoy en el canal de voz <#${player.voiceChannelId}>`
          );
        }
        break;

      case 'pausa':
        await player.pause();
        interaction.reply('⏸️ Pausado');
        break;
      case 'reanudar':
        await player.resume();
        interaction.reply('▶️ Reanudado');
        break;
      case 'saltar':
        if (!player.queue.tracks?.length) {
          return interaction.reply({
            content: '¡La cola está vacía!',
            ephemeral: true,
          });
        }
        await player.skip();
        interaction.reply('⏭️ Saltado');
        break;
      case 'saltara':
        const skipPos = interaction.options.getInteger('posicion');
        if (!player.queue.tracks?.length) {
          return interaction.reply({
            content: '¡La cola está vacía!',
            ephemeral: true,
          });
        }
        if (player.queue.tracks?.length < skipPos) {
          return interaction.reply({
            content: 'No puedes saltar más allá del tamaño de la cola',
            ephemeral: true,
          });
        }
        await player.skip(skipPos);
        interaction.reply(`⏭️ Saltado a la posición \`${skipPos}\``);
        break;
      case 'detener':
        await player.stopPlaying();
        interaction.reply('⏹️ Detenido');
        break;
      case 'salir':
        await player.destroy();
        interaction.reply('👋 Salí del canal de voz');
        break;
      case 'aleatorio':
        if (!player.queue.tracks?.length) {
          return interaction.reply({
            content: '¡La cola está vacía!',
            ephemeral: true,
          });
        }
        player.queue.shuffle();
        interaction.reply('🔀 Cola aleatorizada');
        break;
      case 'volumen':
        const vol = interaction.options.getInteger('nivel');
        player.setVolume(vol);
        interaction.reply(`🔊 Volumen establecido en \`${vol}\``);
        break;
      case 'buscar':
        const timeInput = interaction.options.getString('tiempo').trim();
        const timeParts = timeInput.split(':').map(Number);

        let seekTime = 0;
        if (timeParts.length === 1) {
          seekTime = timeParts[0];
        } else if (timeParts.length === 2) {
          seekTime = timeParts[0] * 60 + timeParts[1];
        } else if (timeParts.length === 3) {
          seekTime = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
        } else {
          return interaction.editReply(
            '❌ Formato de tiempo no válido. Usa `hh:mm:ss`, `mm:ss` o `ss`.'
          );
        }

        seekTime *= 1000;

        const trackDuration = player.queue.current.duration;
        if (seekTime < 0 || seekTime > trackDuration) {
          return interaction.editReply(
            `❌ El tiempo de búsqueda está fuera de rango. La duración de la pista es **${formatDuration(trackDuration)}**.`
          );
        }

        await player.seek(seekTime);
        return interaction.reply(
          `⏩ **Avanzado a:** \`${formatDuration(seekTime)}\``
        );
    }
  },
};

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } else {
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}