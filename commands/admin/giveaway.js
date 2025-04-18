
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');
const ms = require('ms');
const { startGiveaway } = require('../../functions/startGiveaway');
const { endGiveaway } = require('../../functions/endGiveaway');
const { rerollGiveaway } = require('../../functions/rerollGiveaway');
const { cancelGiveaway } = require('../../functions/cancelGiveaway');
const { listGiveaway } = require('../../functions/listGiveaway');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sorteo')
    .setDescription('Crear y gestionar sorteos')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('crear')
        .setDescription('Iniciar un sorteo')
        .addStringOption((option) =>
          option
            .setName('duracion')
            .setDescription('Duración del sorteo (ej. 1d, 2h, 30m)')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('premio')
            .setDescription('Qué se está sorteando')
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName('ganadores')
            .setDescription('Número de ganadores')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(20)
        )
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Canal para el sorteo')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption((option) =>
          option
            .setName('descripcion')
            .setDescription('Descripción del sorteo')
            .setRequired(false)
        )
        .addRoleOption((option) =>
          option
            .setName('rol_requerido')
            .setDescription('Rol necesario para participar en el sorteo')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('finalizar')
        .setDescription('Finalizar un sorteo inmediatamente')
        .addStringOption((option) =>
          option
            .setName('id_mensaje')
            .setDescription('El ID del mensaje del sorteo')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('repetir')
        .setDescription('Volver a sortear ganadores')
        .addStringOption((option) =>
          option
            .setName('id_mensaje')
            .setDescription('El ID del mensaje del sorteo')
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName('ganadores')
            .setDescription('Número de nuevos ganadores a seleccionar')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('cancelar')
        .setDescription('Cancelar un sorteo activo')
        .addStringOption((option) =>
          option
            .setName('id_mensaje')
            .setDescription('El ID del mensaje del sorteo')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('lista').setDescription('Listar todos los sorteos activos')
    ),

  category: 'admin',

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'crear') {
      const duration = interaction.options.getString('duracion');
      const prize = interaction.options.getString('premio');
      const winners = interaction.options.getNumber('ganadores');
      const channel =
        interaction.options.getChannel('canal') || interaction.channel;
      const description = interaction.options.getString('descripcion') || null;
      const requiredRole = interaction.options.getRole('rol_requerido') || null;

      // Convertir string de duración a milisegundos
      let timeInMs;
      try {
        timeInMs = ms(duration);
        if (!timeInMs) throw new Error('Formato de duración inválido');
      } catch (error) {
        return interaction.reply({
          content:
            'Formato de duración inválido. Por favor usa formatos como 1d (1 día), 2h (2 horas), 30m (30 minutos).',
          ephemeral: true,
        });
      }

      // Duración máxima: 30 días (2592000000 ms)
      if (timeInMs > 2592000000) {
        return interaction.reply({
          content: 'La duración máxima de un sorteo es de 30 días.',
          ephemeral: true,
        });
      }

      // Duración mínima: 10 segundos (10000 ms)
      if (timeInMs < 10000) {
        return interaction.reply({
          content: 'La duración mínima de un sorteo es de 10 segundos.',
          ephemeral: true,
        });
      }

      await startGiveaway(
        interaction,
        channel,
        timeInMs,
        winners,
        prize,
        description,
        requiredRole
      );
    } else if (subcommand === 'finalizar') {
      const messageId = interaction.options.getString('id_mensaje');
      await endGiveaway(interaction, messageId);
    } else if (subcommand === 'repetir') {
      const messageId = interaction.options.getString('id_mensaje');
      const winnersCount = interaction.options.getNumber('ganadores') || 1;
      await rerollGiveaway(interaction, messageId, winnersCount);
    } else if (subcommand === 'cancelar') {
      const messageId = interaction.options.getString('id_mensaje');
      await cancelGiveaway(interaction, messageId);
    } else if (subcommand === 'lista') {
      await listGiveaway(interaction);
    }
  },
};
