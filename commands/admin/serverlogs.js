
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ServerLog = require('../../models/serverlogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverlogs')
    .setDescription('Configura los logs del servidor')
    .addSubcommand(subcommand =>
      subcommand
        .setName('canal')
        .setDescription('Establece el canal para los logs')
        .addChannelOption(option =>
          option
            .setName('canal')
            .setDescription('El canal donde se enviarán los logs')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('activar')
        .setDescription('Activa o desactiva categorías de logs')
        .addStringOption(option =>
          option
            .setName('categoria')
            .setDescription('La categoría de logs a configurar')
            .setRequired(true)
            .addChoices(
              { name: 'Mensajes', value: 'messages' },
              { name: 'Canales', value: 'channels' },
              { name: 'Miembros', value: 'members' },
              { name: 'Roles', value: 'roles' },
              { name: 'Moderación', value: 'moderation' },
              { name: 'Voz', value: 'voice' },
              { name: 'Servidor', value: 'server' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('estado')
        .setDescription('Muestra el estado actual de la configuración de logs')
    ),
  category: 'Admin',

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: 'No tienes permisos de `Administrador` para gestionar los logs!',
        ephemeral: true,
      });
    }

    let logSettings = await ServerLog.findOne({ guildId });
    if (!logSettings) {
      logSettings = new ServerLog({ 
        guildId,
        categories: {
          messages: false,
          channels: false,
          members: false,
          roles: false,
          moderation: false,
          voice: false,
          server: false
        }
      });
      await logSettings.save();
    }

    if (subcommand === 'canal') {
      const channel = interaction.options.getChannel('canal');
      logSettings.logChannel = channel.id;
      await logSettings.save();

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Canal de Logs Actualizado')
        .setDescription(`El canal de logs ha sido establecido en ${channel}`)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'activar') {
      const category = interaction.options.getString('categoria');
      
      // Si no existe la categoría en el objeto, la inicializamos
      if (logSettings.categories[category] === undefined) {
        logSettings.categories[category] = false;
      }
      
      // Invertir el estado actual
      logSettings.categories[category] = !logSettings.categories[category];
      await logSettings.save();

      const status = logSettings.categories[category] ? 'activados' : 'desactivados';
      const color = logSettings.categories[category] ? '#00ff00' : '#ff0000';
      const emoji = logSettings.categories[category] ? '🟢' : '🔴';

      // Mapeo de nombres legibles para categorías
      const categoryNames = {
        messages: 'Mensajes',
        channels: 'Canales',
        members: 'Miembros',
        roles: 'Roles',
        moderation: 'Moderación',
        voice: 'Voz',
        server: 'Servidor'
      };

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('Categoría de Logs Cambiada')
        .setDescription(
          `\`${emoji}\` Los logs de **${categoryNames[category] || category}** han sido ${status}.`
        )
        .setTimestamp();

      if (!logSettings.logChannel) {
        embed.addFields({
          name: '⚠️ Atención',
          value: 'No has configurado un canal de logs. Usa `/serverlogs canal` para configurarlo.',
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'estado') {
      const logChannel = logSettings.logChannel
        ? `<#${logSettings.logChannel}>`
        : 'No establecido';

      // Mapeo de nombres legibles para categorías
      const categoryNames = {
        messages: 'Mensajes',
        channels: 'Canales',
        members: 'Miembros',
        roles: 'Roles',
        moderation: 'Moderación',
        voice: 'Voz',
        server: 'Servidor'
      };

      const categories = Object.entries(logSettings.categories)
        .map(([key, value]) => {
          const emoji = value ? '`🟢`' : '`🔴`';
          const formattedKey = categoryNames[key] || key;
          return `${emoji} **${formattedKey}**`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Estado de Logs del Servidor')
        .addFields(
          { name: 'Canal de Logs', value: logChannel, inline: false },
          {
            name: 'Categorías de Logs',
            value: categories || 'Sin categorías configuradas',
            inline: false,
          }
        )
        .setFooter({ text: '🟢 Activado | 🔴 Desactivado' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  },
};
