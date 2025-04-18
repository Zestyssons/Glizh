
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GuildSettings } = require('../../models/Level');
const Welcome = require('../../models/welcome');
const ServerLog = require('../../models/serverlogs');
const AutoRole = require('../../models/AutoRoles');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajustesservidor')
    .setDescription('Ver la configuración del servidor'),

  async execute(interaction) {
    const { guild } = interaction;
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content:
          'No tienes permiso de `Administrador` para gestionar la configuración del servidor.',
        ephemeral: true,
      });
    }

    // Obtener todas las configuraciones
    const guildSettings = await GuildSettings.findOne({ guildId: guild.id }) || { levelingEnabled: false };
    const welcomeSettings = await Welcome.findOne({ serverId: guild.id }) || { enabled: false };
    const logSettings = await ServerLog.findOne({ guildId: guild.id }) || { categories: {} };
    const autoRoleSettings = await AutoRole.findOne({ serverId: guild.id }) || { roleIds: [] };

    const embed = new EmbedBuilder()
      .setColor('#00BFFF')
      .setTitle(`Configuración de ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setTimestamp();

    // Añadir sección de niveles
    embed.addFields({
      name: '**Sistema de Niveles**',
      value: '\u200B',
      inline: false,
    });
    if (guildSettings.levelingEnabled) {
      embed.addFields(
        { name: 'Estado', value: '✅ Activado', inline: true },
        {
          name: 'Multiplicador XP',
          value: `${guildSettings.xpRate || 1}x`,
          inline: true,
        },
        {
          name: 'Canal de anuncios',
          value: guildSettings.levelUpChannelId
            ? `<#${guildSettings.levelUpChannelId}>`
            : 'No configurado',
          inline: true,
        }
      );
    } else {
      embed.addFields({
        name: 'Estado',
        value: '❌ Desactivado',
        inline: true,
      });
    }

    // Añadir sección de bienvenida
    embed.addFields({
      name: '**Sistema de Bienvenida**',
      value: '\u200B',
      inline: false,
    });
    if (welcomeSettings && welcomeSettings.enabled) {
      embed.addFields(
        { name: 'Estado', value: '✅ Activado', inline: true },
        {
          name: 'Canal de bienvenida',
          value: welcomeSettings.channelId
            ? `<#${welcomeSettings.channelId}>`
            : 'No configurado',
          inline: true,
        }
      );
    } else {
      embed.addFields({
        name: 'Estado',
        value: '❌ Desactivado',
        inline: true,
      });
    }

    // Añadir sección de logs
    embed.addFields({
      name: '**Sistema de Logs**',
      value: '\u200B',
      inline: false,
    });
    if (logSettings && logSettings.logChannel) {
      const enabledCategories = Object.entries(logSettings.categories)
        .filter(([_, value]) => value)
        .map(([key]) => {
          const categoryName = key.charAt(0).toUpperCase() + key.slice(1);
          return categoryName;
        })
        .join(', ');

      embed.addFields(
        { name: 'Estado', value: '✅ Activado', inline: true },
        {
          name: 'Canal de logs',
          value: `<#${logSettings.logChannel}>`,
          inline: true,
        },
        {
          name: 'Categorías activadas',
          value: enabledCategories || 'Ninguna',
          inline: false,
        }
      );
    } else {
      embed.addFields({
        name: 'Estado',
        value: '❌ Desactivado',
        inline: true,
      });
    }

    // Añadir sección de auto-roles
    embed.addFields({
      name: '**Auto-Roles**',
      value: '\u200B',
      inline: false,
    });
    if (autoRoleSettings && autoRoleSettings.roleIds.length > 0) {
      const rolesList = autoRoleSettings.roleIds
        .map(roleId => `<@&${roleId}>`)
        .join(', ');

      embed.addFields(
        { name: 'Estado', value: '✅ Configurado', inline: true },
        {
          name: 'Roles automáticos',
          value: rolesList,
          inline: false,
        }
      );
    } else {
      embed.addFields({
        name: 'Estado',
        value: '❌ No configurado',
        inline: true,
      });
    }

    // Añadir estadísticas del servidor
    embed.addFields(
      {
        name: '**Estadísticas del Servidor**',
        value: '\u200B',
        inline: false,
      },
      {
        name: 'Miembros',
        value: `👥 ${guild.memberCount}`,
        inline: true,
      },
      {
        name: 'Creado',
        value: `📅 <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
        inline: true,
      },
      {
        name: 'Canales',
        value: `📝 ${guild.channels.cache.size}`,
        inline: true,
      }
    );

    return interaction.reply({ embeds: [embed] });
  },
};
