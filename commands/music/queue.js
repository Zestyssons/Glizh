const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { formatTime } = require('../../utils/utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Gestiona la cola')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('Ver la lista de canciones en la cola')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Eliminar una canción de la cola')
        .addIntegerOption((option) =>
          option
            .setName('song')
            .setDescription('La posición de la canción que quieres eliminar')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('clear').setDescription('Vaciar toda la cola')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const client = interaction.client;
    const player = client.lavalink.players.get(interaction.guild.id);

    if (!player || !player.queue.current) {
      return interaction.reply({
        content: '❌ ¡No se está reproduciendo nada!',
        ephemeral: true,
      });
    }

    if (!player.queue.tracks?.length) {
      return interaction.reply({
        content: '❌ ¡La cola está vacía!',
        ephemeral: true,
      });
    }

    switch (subcommand) {
      case 'view': {
        const queueTracks = player.queue.tracks;
        const tracksPerPage = 10;
        const totalPages = Math.ceil(queueTracks.length / tracksPerPage);
        let currentPage = 1;

        const generateEmbed = (page) => {
          const start = (page - 1) * tracksPerPage;
          const end = start + tracksPerPage;
          const currentTrack = player.queue.current;

          const totalDuration = player.queue.tracks.reduce(
            (acc, track) => acc + track.info.duration,
            currentTrack.info.duration
          );

          const queue = queueTracks
            .slice(start, end)
            .map(
              (track, i) =>
                `\`${start + i + 1}.\` [${track.info.title}](${track.info.uri})\n` +
                `┗ ${getSourceEmoji(track.info.sourceName)} \`${track.info.author}\` • ⌛ \`${formatTime(track.info.duration)}\``
            );

          return new EmbedBuilder()
            .setColor('#B0C4DE')
            .setAuthor({
              name: 'Cola de Música 🎵',
              iconURL: client.user.displayAvatarURL(),
            })
            .setThumbnail(currentTrack.info.artworkUrl)
            .setDescription(
              `**Reproduciendo Ahora:**\n` +
                `[${currentTrack.info.title}](${currentTrack.info.uri})\n` +
                `┗ ${getSourceEmoji(currentTrack.info.sourceName)} \`${currentTrack.info.author}\` • ⌛ \`${formatTime(currentTrack.info.duration)}\`\n\n` +
                `**Siguiente en la Cola:**\n${queue.join('\n\n')}`
            )
            .addFields([
              {
                name: '🎵 Longitud de la Cola',
                value: `\`${queueTracks.length} canciones\``,
                inline: true,
              },
              {
                name: '⌛ Duración Total',
                value: `\`${formatTime(totalDuration)}\``,
                inline: true,
              },
              {
                name: '🔄 Modo de Repetición',
                value: `\`${player.repeatMode.charAt(0).toUpperCase() + player.repeatMode.slice(1)}\``,
                inline: true,
              },
            ])
            .setFooter({
              text: `Página ${page}/${totalPages} • Usa los botones de abajo para navegar`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();
        };

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 1),
          new ButtonBuilder()
            .setCustomId('next')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages)
        );

        const message = await interaction.reply({
          embeds: [generateEmbed(currentPage)],
          components: [row],
          fetchReply: true,
        });

        const collector = message.createMessageComponentCollector({
          filter: (i) => i.user.id === interaction.user.id,
          time: 60000,
        });

        collector.on('collect', async (buttonInteraction) => {
          try {
            if (!buttonInteraction.deferred && !buttonInteraction.replied) {
              await buttonInteraction.deferUpdate();
            }

            if (buttonInteraction.customId === 'prev' && currentPage > 1) {
              currentPage--;
            } else if (
              buttonInteraction.customId === 'next' &&
              currentPage < totalPages
            ) {
              currentPage++;
            }

            const updatedRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 1),
              new ButtonBuilder()
                .setCustomId('next')
                .setEmoji('➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === totalPages)
            );

            await buttonInteraction.message.edit({
              embeds: [generateEmbed(currentPage)],
              components: [updatedRow],
            });
          } catch (error) {
            if (error.code !== 40060) {
              console.error('Error al manejar la interacción de la cola:', error);
            }
          }
        });

        collector.on('end', () => {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setEmoji('⬅️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setEmoji('➡️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

          message.edit({ components: [disabledRow] }).catch(console.error);
        });
        break;
      }

      case 'remove': {
        const removePos = interaction.options.getInteger('song');
        if (player.queue.tracks?.length < removePos) {
          return interaction.reply({
            content: "❌ ¡No puedes eliminar una canción que no está en la cola!",
            ephemeral: true,
          });
        }

        const removeTrack = player.queue.tracks[removePos - 1];
        await player.queue.remove(removeTrack);

        const removedEmbed = new EmbedBuilder()
          .setColor('#B0C4DE')
          .setAuthor({
            name: 'Eliminado de la Cola 🗑️',
            iconURL: client.user.displayAvatarURL(),
          })
          .setDescription(
            `Eliminado [${removeTrack.info.title}](${removeTrack.info.uri})`
          )
          .setThumbnail(removeTrack.info.artworkUrl)
          .addFields({
            name: '🎵 Longitud de la Cola',
            value: `\`${player.queue.tracks.length} canciones restantes\``,
            inline: true,
          })
          .setFooter({
            text: `Eliminado por ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        interaction.reply({ embeds: [removedEmbed] });
        break;
      }

      case 'clear': {
        const queueLength = player.queue.tracks.length;
        player.queue.splice(0, queueLength);

        const clearEmbed = new EmbedBuilder()
          .setColor('#B0C4DE')
          .setAuthor({
            name: 'Cola Limpiada 🧹',
            iconURL: client.user.displayAvatarURL(),
          })
          .setDescription(
            `Se limpiaron exitosamente \`${queueLength}\` canciones de la cola`
          )
          .setFooter({
            text: `Limpiado por ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        interaction.reply({ embeds: [clearEmbed] });
        break;
      }
    }
  },
};

function getSourceEmoji(source = '') {
  const emojis = {
    youtube: '📺',
    'youtube music': '🎵',
    spotify: '💚',
    soundcloud: '🟠',
    deezer: '💿',
  };
  return emojis[source.toLowerCase()] || '🎵';
}