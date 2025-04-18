
const {
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');
const Welcome = require('../../models/welcome');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bienvenida')
    .setDescription('Configura el sistema de bienvenida')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('activar')
        .setDescription('Activa o desactiva el sistema de bienvenida')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('mensaje')
        .setDescription('Establece el mensaje de bienvenida personalizado')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('canal')
        .setDescription('Establece el canal de bienvenida')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('El canal para enviar mensajes de bienvenida')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('probar')
        .setDescription('Previsualiza el mensaje de bienvenida actual')
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content:
          'No tienes permiso de `Administrador` para gestionar el sistema de bienvenida.',
        ephemeral: true,
      });
    }
    const { options, guild, user } = interaction;
    const serverId = guild.id;
    const subcommand = options.getSubcommand();

    let welcome = await Welcome.findOne({ serverId });

    if (!welcome) {
      welcome = new Welcome({ serverId });
      await welcome.save();
    }

    if (subcommand === 'activar') {
      welcome.enabled = !welcome.enabled;
      await welcome.save();
      const toggleEmbed = new EmbedBuilder()
        .setColor(welcome.enabled ? '#4CAF50' : '#FF5733')
        .setTitle('Sistema de Bienvenida')
        .setDescription(
          `El sistema de bienvenida ahora está ${welcome.enabled ? 'activado' : 'desactivado'}. \n\n __**Nota:** Establece el canal para los mensajes de bienvenida usando \`/bienvenida canal\`__`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [toggleEmbed] });
    }

    if (subcommand === 'mensaje') {
      if (!welcome.enabled) {
        return interaction.reply({
          content: 'El sistema de bienvenida no está activado en este servidor.',
          ephemeral: true,
        });
      }
      const descriptionEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('Personalizar Mensaje de Bienvenida')
        .setDescription(
          '**Por favor proporciona tu mensaje de bienvenida personalizado. Puedes usar los siguientes marcadores:**\n\n' +
            "`{member}` - Nombre de usuario\n" +
            '`{server}` - Nombre del servidor\n' +
            '`{serverid}` - ID del servidor\n' +
            '`{userid}` - ID del usuario\n' +
            '`{joindate}` - Fecha de ingreso\n' +
            '`{accountage}` - Edad de la cuenta\n' +
            '`{membercount}` - Número de miembros\n' +
            '`{serverage}` - Edad del servidor (en días)\n\n' +
            '__**Nota:** Este comando expirará en 5 minutos__'
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [descriptionEmbed],
        ephemeral: true,
      });

      const filter = (response) => response.author.id === user.id;
      const collector = interaction.channel.createMessageCollector({
        filter,
        time: 300000,
      });

      collector.on('collect', async (message) => {
        const customDescription = message.content;

        welcome.description = customDescription;
        await welcome.save();
        
        try {
          await message.delete();
        } catch (error) {
          console.error('No se pudo eliminar el mensaje:', error);
        }

        const successEmbed = new EmbedBuilder()
          .setColor('#4CAF50')
          .setTitle('Mensaje de Bienvenida Actualizado')
          .setDescription(
            `Tu mensaje de bienvenida ha sido actualizado a:\n\n${customDescription}`
          )
          .setTimestamp();
        interaction.followUp({
          embeds: [successEmbed],
          ephemeral: true,
        });

        collector.stop();
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#FF5733')
            .setTitle('Tiempo Agotado')
            .setDescription(
              'Has tardado demasiado en proporcionar un mensaje. Por favor intenta nuevamente.'
            )
            .setTimestamp();
          interaction.followUp({
            embeds: [timeoutEmbed],
            ephemeral: true,
          });
        }
      });
    }

    if (subcommand === 'canal') {
      if (!welcome.enabled) {
        return interaction.reply({
          content: 'El sistema de bienvenida no está activado en este servidor.',
          ephemeral: true,
        });
      }
      const channel = interaction.options.getChannel('canal');

      welcome.channelId = channel.id;
      await welcome.save();

      const channelEmbed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('Canal de Bienvenida Establecido')
        .setDescription(`El canal de bienvenida ha sido establecido en ${channel}.`)
        .setTimestamp();
      return interaction.reply({
        embeds: [channelEmbed],
        ephemeral: true,
      });
    }

    if (subcommand === 'probar') {
      if (!welcome.enabled) {
        return interaction.reply({
          content: 'El sistema de bienvenida no está activado en este servidor.',
          ephemeral: true,
        });
      }
      
      if (!welcome.channelId) {
        return interaction.reply({
          content: 'No se ha establecido un canal de bienvenida. Configúralo con `/bienvenida canal`.',
          ephemeral: true,
        });
      }
      
      const memberCount = guild.memberCount;

      let description = welcome.description || 'Bienvenido {member} a {server}';
      description = description
        .replace(/{member}/g, interaction.user)
        .replace(/{server}/g, guild.name)
        .replace(/{serverid}/g, guild.id)
        .replace(/{userid}/g, user.id)
        .replace(/{joindate}/g, `<t:${Math.floor(Date.now() / 1000)}:F>`)
        .replace(/{accountage}/g, `<t:${Math.floor(user.createdAt / 1000)}:R>`)
        .replace(/{membercount}/g, memberCount)
        .replace(/{serverage}/g, `<t:${Math.floor(guild.createdAt / 1000)}:R>`);

      const testEmbed = new EmbedBuilder()
        .setColor('#00BFFF')
        .setTitle('Vista Previa del Mensaje de Bienvenida')
        .setDescription(description)
        .setFooter({
          text: 'Así es como se verá el mensaje de bienvenida cuando un miembro se una.',
        })
        .setTimestamp();

      return interaction.reply({ embeds: [testEmbed], ephemeral: true });
    }
  },
};
