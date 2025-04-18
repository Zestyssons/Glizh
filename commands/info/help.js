const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');

// Mapa de emojis para categorías: hace que tu comando se vea más atractivo visualmente
const CATEGORY_EMOJIS = {
  Moderation: '🛡️',
  Utility: '🔧',
  Fun: '🎮',
  Music: '🎵',
  Level: '🏆',
  Admin: '🔒',
  Economy: '💰',
  Info: 'ℹ️',
  Minecraft: '⛏️',
  Uncategorized: '📁',
};

// Emojis para comandos
const COMMAND_EMOJIS = {
  help: '❓',
  // Agrega más emojis específicos para comandos según sea necesario
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription(
      'Muestra una lista de comandos o detalles sobre un comando específico.'
    )
    .addStringOption((option) =>
      option
        .setName('command')
        .setDescription('Obtén detalles sobre un comando específico')
        .setAutocomplete(true)
    ),
  category: 'Utility', // Establece la categoría para este comando

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().trim().toLowerCase();
    const commandNames = [...interaction.client.commands.keys()];

    const filtered = commandNames
      .filter((name) => name.toLowerCase().includes(focusedValue)) // Cambiado de startsWith a includes para coincidencias más flexibles
      .slice(0, 25) // Incrementado de 10 a 25 para más opciones
      .map((name) => {
        const command = interaction.client.commands.get(name);
        const emoji = COMMAND_EMOJIS[name] || '📌';
        return {
          name: `${emoji} ${name} - ${command.data.description.slice(0, 50)}`,
          value: name,
        };
      });

    await interaction.respond(
      filtered.length
        ? filtered
        : [{ name: '❌ No se encontraron coincidencias', value: 'none' }]
    );
  },

  async execute(interaction) {
    const { client } = interaction;

    try {
      await interaction.deferReply();

      const commandName = interaction.options.getString('command');
      const helpEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setFooter({
          text: `Solicitado por ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      if (commandName) {
        return this.sendCommandHelp(
          interaction,
          client,
          commandName,
          helpEmbed
        );
      } else {
        return this.sendHelpMenu(interaction, client, helpEmbed);
      }
    } catch (error) {
      console.error('Error en el comando help:', error);
      return interaction
        .editReply({
          content:
            '❌ Ocurrió un error mientras procesábamos tu solicitud. Por favor intenta nuevamente más tarde.',
        })
        .catch(console.error);
    }
  },

  async sendCommandHelp(interaction, client, commandName, embed) {
    try {
      const command = client.commands.get(commandName);
      if (!command) {
        return interaction.editReply({
          content:
            '❌ El comando que ingresaste no fue encontrado. Intenta usar `/help` para ver los comandos disponibles.',
        });
      }

      // Obtén opciones si existen
      const options =
        command.data.options
          ?.map((opt) => {
            const required = opt.required ? '(obligatorio)' : '(opcional)';
            return `\`${opt.name}\` ${required}: ${opt.description}`;
          })
          .join('\n') || 'No hay opciones disponibles.';

      const categoryEmoji = command.category
        ? CATEGORY_EMOJIS[
            command.category.charAt(0).toUpperCase() +
              command.category.slice(1).toLowerCase()
          ] || '📁'
        : '📁';

      const commandEmoji = COMMAND_EMOJIS[command.data.name] || '📌';

      embed
        .setTitle(`${commandEmoji} **Detalles del Comando: /${command.data.name}**`)
        .setDescription(command.data.description || 'No hay descripción disponible.')
        .addFields(
          {
            name: '🛠️ Uso',
            value: `\`/${command.data.name}${command.data.options?.length ? ' [opciones]' : ''}\``,
          },
          {
            name: '📂 Categoría',
            value: `${categoryEmoji} ${command.category || 'Sin Categoría'}`,
          },
          {
            name: '⌨️ Opciones',
            value: options,
          }
        );

      // Agrega un botón de "volver al menú"
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('help-back')
          .setLabel('Volver al Menú de Ayuda')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('↩️')
      );

      const reply = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      // Recolector para el botón de volver
      const filter = (i) =>
        i.customId === 'help-back' && i.user.id === interaction.user.id;
      const collector = reply.createMessageComponentCollector({
        filter,
        time: 60000,
        componentType: ComponentType.Button,
      });

      collector.on('collect', async (i) => {
        await i.deferUpdate();
        await this.sendHelpMenu(interaction, client, embed);
      });

      return reply;
    } catch (error) {
      console.error('Error en sendCommandHelp:', error);
      return interaction
        .editReply({
          content:
            '❌ Ocurrió un error al mostrar detalles del comando. Por favor intenta nuevamente más tarde.',
        })
        .catch(console.error);
    }
  },

  async sendHelpMenu(interaction, client, embed) {
    try {
      const categories = this.getCommandCategories(client);

      if (Object.keys(categories).length === 0) {
        return interaction.editReply({
          content: '⚠️ No hay comandos disponibles.',
        });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help-menu')
        .setPlaceholder('Selecciona una categoría')
        .addOptions(
          Object.keys(categories).map((category) => {
            const emoji = CATEGORY_EMOJIS[category] || '📁';
            return {
              label: category,
              value: category,
              description: `${categories[category].length} comandos en ${category}`,
              emoji: emoji,
            };
          })
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      embed
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setTitle('✨ Menú de Ayuda del Bot')
        .setDescription(
          'Usa el menú desplegable de abajo para explorar los comandos por categoría. Para detalles específicos de comandos, usa `/help command:nombreComando`.'
        )
        .setFields(
          Object.entries(categories).map(([category, commands]) => {
            const emoji = CATEGORY_EMOJIS[category] || '📁';
            return {
              name: `${emoji} ${category}`,
              value: `${commands.length} comando${commands.length === 1 ? '' : 's'} disponible${commands.length === 1 ? '' : 's'}`,
              inline: true,
            };
          })
        );

      const reply = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      this.createCollector(interaction, categories, row, reply);
      return reply;
    } catch (error) {
      console.error('Error en sendHelpMenu:', error);
      return interaction
        .editReply({
          content:
            '❌ Ocurrió un error al mostrar el menú de ayuda. Por favor intenta nuevamente más tarde.',
        })
        .catch(console.error);
    }
  },

  getCommandCategories(client) {
    const categories = {};
    client.commands.forEach((cmd) => {
      const category = cmd.category
        ? cmd.category.charAt(0).toUpperCase() +
          cmd.category.slice(1).toLowerCase()
        : 'Sin Categoría';
      if (!categories[category]) categories[category] = [];
      categories[category].push(cmd.data.name);
    });
    return categories;
  },

  createCollector(interaction, categories, row, reply) {
    try {
      // Crea un recolector para el mensaje de respuesta
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect, // Usa ComponentType en lugar del número mágico
        time: 120000, // Tiempo aumentado a 2 minutos
        filter: (i) => i.user.id === interaction.user.id,
      });

      collector.on('collect', async (i) => {
        try {
          await i.deferUpdate();

          const selectedCategory = i.values[0];
          const commandsInCategory = categories[selectedCategory];
          const categoryEmoji = CATEGORY_EMOJIS[selectedCategory] || '📁';

          const commandsList =
            commandsInCategory
              .map((cmdName) => {
                const cmd = interaction.client.commands.get(cmdName);
                const cmdEmoji = COMMAND_EMOJIS[cmdName] || '📌';
                return `> ${cmdEmoji} \`/${cmdName}\` - ${cmd?.data?.description || 'No hay descripción disponible.'}`;
              })
              .join('\n') || 'No hay comandos disponibles.';

          const categoryEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${categoryEmoji} **Comandos de ${selectedCategory}**`)
            .setDescription(
              `Selecciona un comando de la lista abajo o usa \`/help command:nombreComando\` para detalles.\n\n${commandsList}`
            )
            .setFooter({
              text: `Solicitado por ${interaction.user.tag} • Página 1/${Math.ceil(commandsInCategory.length / 10)}`,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

          await i.editReply({ embeds: [categoryEmbed], components: [row] });
        } catch (error) {
          console.error('Error manejando la interacción del menú:', error);
          await i
            .editReply({
              content:
                '❌ Ocurrió un error al procesar tu selección. Por favor intenta nuevamente.',
            })
            .catch(console.error);
        }
      });

      collector.on('end', async () => {
        try {
          // Asegúrate de que el mensaje exista y sea editable
          const fetchedMessage = await interaction
            .fetchReply()
            .catch(() => null);
          if (fetchedMessage) {
            const expiredEmbed = EmbedBuilder.from(fetchedMessage.embeds[0]);

            if (expiredEmbed) {
              expiredEmbed.setFooter({
                text: `El menú de ayuda expiró • Ejecuta /help nuevamente para más información`,
                iconURL: interaction.user.displayAvatarURL(),
              });

              await interaction
                .editReply({
                  embeds: [expiredEmbed],
                  components: [],
                })
                .catch((err) =>
                  console.error('No se pudo actualizar el menú expirado:', err)
                );
            } else {
              await interaction
                .editReply({
                  components: [],
                  content:
                    '⌛ El menú de ayuda ha expirado. Ejecuta `/help` nuevamente si necesitas más información.',
                })
                .catch((err) =>
                  console.error('No se pudo actualizar el menú expirado:', err)
                );
            }
          }
        } catch (error) {
          console.error('Error manejando el final del recolector:', error);
        }
      });
    } catch (error) {
      console.error('Error creando el recolector:', error);
    }
  },
};