const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Obtiene la letra de la canción que se está reproduciendo actualmente.'),
  async execute(interaction) {
    try {
      const client = interaction.client;
      await interaction.deferReply();

      const guildId = interaction.guildId;
      const player = client.lavalink.players.get(guildId);

      if (!player || !player.queue.current) {
        return interaction.editReply('❌ No hay ninguna canción reproduciéndose actualmente.');
      }

      const currentTrack = player.queue.current;
      const lyrics = await player.getLyrics(currentTrack, true);

      if (!lyrics) {
        return interaction.editReply({
          content: 'No se encontró la letra de esta canción.',
          ephemeral: true,
        });
      }

      const processLyrics = (lyricsData) => {
        if (lyricsData.text) {
          return lyricsData.text;
        }

        if (lyricsData.lines && Array.isArray(lyricsData.lines)) {
          return lyricsData.lines
            .map((line) => line.line)
            .filter((line) => line && line.trim() !== '')
            .join('\n');
        }

        return null;
      };

      const lyricsText = processLyrics(lyrics);

      if (!lyricsText) {
        return interaction.editReply({
          content: 'El formato de la letra no es compatible.',
          ephemeral: true,
        });
      }

      const paragraphs = lyricsText.split('\n').filter((p) => p.trim() !== '');
      const pages = [];
      for (let i = 0; i < paragraphs.length; i += 16) {
        pages.push(paragraphs.slice(i, i + 16).join('\n\n'));
      }

      let currentPage = 0;

      const createEmbed = (pageIndex) => {
        return new EmbedBuilder()
          .setTitle(`🎶 Letra de: ${currentTrack.info.title}`)
          .setDescription(pages[pageIndex])
          .setFooter({
            text: `Página ${pageIndex + 1}/${pages.length}`,
          })
          .setTimestamp()
          .setColor(0x11806a);
      };

      if (pages.length === 1) {
        return interaction.editReply({
          embeds: [createEmbed(0)],
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('◀️ Anterior')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Siguiente ▶️')
          .setStyle(ButtonStyle.Primary)
      );

      const message = await interaction.editReply({
        embeds: [createEmbed(currentPage)],
        components: [row],
      });

      const collector = message.createMessageComponentCollector({
        time: 120000,
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: '¡Estos botones no son para ti!',
            ephemeral: true,
          });
        }

        if (i.customId === 'previous' && currentPage > 0) {
          currentPage--;
        } else if (i.customId === 'next' && currentPage < pages.length - 1) {
          currentPage++;
        }

        await i.update({
          embeds: [createEmbed(currentPage)],
          components: [row],
        });
      });

      collector.on('end', async () => {
        try {
          await message.edit({
            embeds: [createEmbed(currentPage)],
            components: [],
          });
        } catch (err) {
          console.error('No se pudieron eliminar los botones:', err);
        }
      });
    } catch (e) {
      console.error('Error al obtener la letra:', e);
      return interaction.editReply({
        content: 'Ocurrió un error al obtener la letra.',
        ephemeral: true,
      });
    }
  },
};