
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const ButtonRole = require('../../models/ButtonRole');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buttonrole')
    .setDescription('Gestiona paneles de roles con botones')
    .addSubcommand((subcommand) =>
      subcommand.setName('configurar').setDescription('Crea un panel de roles con botones')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('enviar')
        .setDescription('Envía un panel de roles a un canal')
        .addStringOption((option) =>
          option
            .setName('nombre_panel')
            .setDescription('El nombre del panel')
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'configurar') {
      await handleSetup(interaction);
    } else if (subcommand === 'enviar') {
      await handleSend(interaction);
    }
  },
};

async function handleSetup(interaction) {
  if (!interaction.member.permissions.has('ManageRoles')) {
    return interaction.reply({
      content: 'Necesitas el permiso de Gestionar Roles para usar este comando.',
      ephemeral: true,
    });
  }
  const panels = await ButtonRole.find({ guildId: interaction.guild.id });

  if (panels.length >= 25) {
    return await interaction.reply({
      content: `Has alcanzado el límite máximo de 25 paneles de roles en este servidor.`,
      ephemeral: true,
    });
  }

  const setupEmbed = new EmbedBuilder()
    .setTitle('Configuración del Panel de Roles')
    .setDescription(
      'Elige si quieres crear un **mensaje normal** o un **mensaje embed** para tu panel de roles.'
    )
    .setColor('Blue');

  const setupButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('normal_message')
      .setLabel('Mensaje Normal')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('embed_message')
      .setLabel('Mensaje Embed')
      .setStyle(ButtonStyle.Success)
  );

  const reply = await interaction.reply({
    embeds: [setupEmbed],
    components: [setupButtons],
    ephemeral: true,
  });

  const collector = reply.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      return buttonInteraction.reply({
        content: 'Esta configuración no es para ti.',
        ephemeral: true,
      });
    }

    if (buttonInteraction.customId === 'normal_message') {
      await handleNormalMessageSetup(interaction, buttonInteraction);
    } else if (buttonInteraction.customId === 'embed_message') {
      await handleEmbedMessageSetup(interaction, buttonInteraction);
    }
  });

  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => {});
  });
}

async function handleNormalMessageSetup(interaction, buttonInteraction) {
  await buttonInteraction.deferUpdate();

  const messagePrompt = new EmbedBuilder()
    .setTitle('Configuración de Mensaje Normal')
    .setDescription('Por favor escribe el contenido del mensaje para tu panel.')
    .setColor('Blue');

  await interaction.followUp({ embeds: [messagePrompt], ephemeral: true });

  const collectorFilter = (m) => m.author.id === interaction.user.id;
  const channel = interaction.channel;
  const messageResponse = await channel.awaitMessages({
    filter: collectorFilter,
    max: 1,
    time: 60000,
  });

  if (messageResponse.size === 0) {
    return interaction.followUp({
      content: 'Configuración cancelada por tiempo de espera.',
      ephemeral: true,
    });
  }

  const messageContent = messageResponse.first().content;
  await messageResponse.first().delete().catch(() => {});

  await savePanel(interaction, { type: 'message', content: messageContent });
}

async function handleEmbedMessageSetup(interaction, buttonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId('embed_setup')
    .setTitle('Configuración de Embed');

  const titleInput = new TextInputBuilder()
    .setCustomId('embed_title')
    .setLabel('Título (opcional)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ingresa el título del embed')
    .setRequired(false);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('embed_description')
    .setLabel('Descripción (requerida)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Ingresa la descripción del embed')
    .setRequired(true);

  const footerInput = new TextInputBuilder()
    .setCustomId('embed_footer')
    .setLabel('Pie de página (opcional)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ingresa el pie de página del embed')
    .setRequired(false);

  const imageUriInput = new TextInputBuilder()
    .setCustomId('embed_image_uri')
    .setLabel('URL de imagen (opcional)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ingresa la URL de la imagen')
    .setRequired(false);

  const modalActionRow1 = new ActionRowBuilder().addComponents(titleInput);
  const modalActionRow2 = new ActionRowBuilder().addComponents(
    descriptionInput
  );
  const modalActionRow3 = new ActionRowBuilder().addComponents(footerInput);
  const modalActionRow4 = new ActionRowBuilder().addComponents(imageUriInput);

  modal.addComponents(
    modalActionRow1,
    modalActionRow2,
    modalActionRow3,
    modalActionRow4
  );

  await buttonInteraction.showModal(modal);

  const submitted = await buttonInteraction.awaitModalSubmit({ time: 60000 }).catch(() => null);
  
  if (!submitted) {
    return interaction.followUp({
      content: 'Configuración cancelada por tiempo de espera.',
      ephemeral: true,
    });
  }

  const title = submitted.fields.getTextInputValue('embed_title') || null;
  const description = submitted.fields.getTextInputValue('embed_description');
  const footer = submitted.fields.getTextInputValue('embed_footer') || null;
  const imageUri =
    submitted.fields.getTextInputValue('embed_image_uri') || null;

  const embedData = {
    type: 'embed',
    content: { title, description, footer, imageUri },
  };

  await submitted.deferUpdate();
  await savePanel(interaction, embedData);
}

async function savePanel(interaction, panelData) {
  const collectorFilter = (m) => m.author.id === interaction.user.id;
  const channel = interaction.channel;

  let panelName = '';
  let panelExists = true;

  while (panelExists) {
    const panelNamePrompt = new EmbedBuilder()
      .setTitle('Nombre del Panel')
      .setDescription('¿Cómo se llamará el panel?')
      .setColor('Blue');
    await interaction.followUp({ embeds: [panelNamePrompt], ephemeral: true });

    const panelNameResponse = await channel.awaitMessages({
      filter: collectorFilter,
      max: 1,
      time: 60000,
    });

    if (panelNameResponse.size === 0) {
      return interaction.followUp({
        content: 'Configuración cancelada por tiempo de espera.',
        ephemeral: true,
      });
    }

    panelName = panelNameResponse.first().content;
    await panelNameResponse.first().delete().catch(() => {});

    const existingPanel = await ButtonRole.findOne({
      guildId: interaction.guild.id,
      panelName,
    });

    if (existingPanel) {
      await interaction.followUp({
        content: `Ya existe un panel con el nombre **${panelName}**. Por favor elige otro nombre.`,
        ephemeral: true,
      });
    } else {
      panelExists = false;
    }
  }

  const buttons = [];
  let addingButtons = true;

  while (addingButtons && buttons.length < 25) {
    const buttonLabelPrompt = new EmbedBuilder()
      .setTitle('Etiqueta del Botón')
      .setDescription('Ingresa una etiqueta para el botón:')
      .setColor('Blue');
    await interaction.followUp({ embeds: [buttonLabelPrompt], ephemeral: true });

    const labelResponse = await channel.awaitMessages({
      filter: collectorFilter,
      max: 1,
      time: 60000,
    });

    if (labelResponse.size === 0) {
      return interaction.followUp({
        content: 'Configuración cancelada por tiempo de espera.',
        ephemeral: true,
      });
    }

    const label = labelResponse.first().content;
    await labelResponse.first().delete().catch(() => {});

    const buttonRolePrompt = new EmbedBuilder()
      .setTitle('Rol del Botón')
      .setDescription('Menciona el rol o proporciona el ID del rol:')
      .setColor('Blue');
    await interaction.followUp({ embeds: [buttonRolePrompt], ephemeral: true });

    const roleResponse = await channel.awaitMessages({
      filter: collectorFilter,
      max: 1,
      time: 60000,
    });

    if (roleResponse.size === 0) {
      return interaction.followUp({
        content: 'Configuración cancelada por tiempo de espera.',
        ephemeral: true,
      });
    }

    const roleId =
      roleResponse.first().mentions.roles.first()?.id ||
      roleResponse.first().content;
    await roleResponse.first().delete().catch(() => {});

    const buttonStylePrompt = new EmbedBuilder()
      .setTitle('Estilo del Botón')
      .setDescription(
        'Elige un estilo para el botón: `Primary` (azul), `Secondary` (gris), `Success` (verde), `Danger` (rojo)'
      )
      .setColor('Blue');
    await interaction.followUp({ embeds: [buttonStylePrompt], ephemeral: true });

    const styleResponse = await channel.awaitMessages({
      filter: collectorFilter,
      max: 1,
      time: 60000,
    });

    if (styleResponse.size === 0) {
      return interaction.followUp({
        content: 'Configuración cancelada por tiempo de espera.',
        ephemeral: true,
      });
    }

    const styleInput = styleResponse.first().content.toLowerCase();
    let style;
    
    if (styleInput === 'primary' || styleInput === 'azul') {
      style = ButtonStyle.Primary;
    } else if (styleInput === 'secondary' || styleInput === 'gris') {
      style = ButtonStyle.Secondary;
    } else if (styleInput === 'success' || styleInput === 'verde') {
      style = ButtonStyle.Success;
    } else if (styleInput === 'danger' || styleInput === 'rojo') {
      style = ButtonStyle.Danger;
    } else {
      style = ButtonStyle.Primary;
    }
    
    await styleResponse.first().delete().catch(() => {});

    const customId = `${interaction.guild.id}-${Date.now()}-${buttons.length}`;
    buttons.push({ label, roleId, style, customId });

    if (buttons.length >= 25) {
      await interaction.followUp({
        content: 'Has alcanzado el límite máximo de 25 botones por panel.',
        ephemeral: true,
      });
      addingButtons = false;
    } else {
      const continuePrompt = new EmbedBuilder()
        .setTitle('¿Añadir Otro Botón?')
        .setDescription('¿Quieres añadir otro botón? (sí/no)')
        .setColor('Blue');
      await interaction.followUp({ embeds: [continuePrompt], ephemeral: true });

      const continueResponse = await channel.awaitMessages({
        filter: collectorFilter,
        max: 1,
        time: 60000,
      });

      if (continueResponse.size === 0) {
        return interaction.followUp({
          content: 'Configuración cancelada por tiempo de espera.',
          ephemeral: true,
        });
      }

      const continueAnswer = continueResponse.first().content.toLowerCase();
      await continueResponse.first().delete().catch(() => {});
      
      if (continueAnswer !== 'sí' && continueAnswer !== 'si' && continueAnswer !== 'yes') {
        addingButtons = false;
      }
    }
  }

  const targetChannelPrompt = new EmbedBuilder()
    .setTitle('Canal Destino')
    .setDescription('Menciona el canal donde quieres enviar el panel:')
    .setColor('Blue');
  await interaction.followUp({ embeds: [targetChannelPrompt], ephemeral: true });

  const channelResponse = await channel.awaitMessages({
    filter: collectorFilter,
    max: 1,
    time: 60000,
  });

  if (channelResponse.size === 0) {
    return interaction.followUp({
      content: 'Configuración cancelada por tiempo de espera.',
      ephemeral: true,
    });
  }

  const channelId =
    channelResponse.first().mentions.channels.first()?.id ||
    channelResponse.first().content;
  await channelResponse.first().delete().catch(() => {});

  const buttonRole = new ButtonRole({
    guildId: interaction.guild.id,
    panelName,
    panelData,
    buttons,
    channelId,
  });

  await buttonRole.save();

  const successEmbed = new EmbedBuilder()
    .setTitle('Panel Guardado')
    .setDescription(`Tu panel **${panelName}** ha sido guardado correctamente.`)
    .setColor('Green');

  await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
}

async function handleSend(interaction) {
  if (!interaction.member.permissions.has('ManageRoles')) {
    return interaction.reply({
      content: 'Necesitas el permiso de Gestionar Roles para usar este comando.',
      ephemeral: true,
    });
  }
  const panelName = interaction.options.getString('nombre_panel');

  const buttonRole = await ButtonRole.findOne({
    guildId: interaction.guild.id,
    panelName,
  });

  if (!buttonRole) {
    return interaction.reply({
      content: `No se encontró el panel **${panelName}**.`,
      ephemeral: true,
    });
  }

  const channel = interaction.guild.channels.cache.get(buttonRole.channelId);
  if (!channel) {
    return interaction.reply({
      content: `No se pudo encontrar el canal para el panel **${panelName}**.`,
      ephemeral: true,
    });
  }

  if (buttonRole.panelData.type === 'message') {
    const rows = createButtonRows(buttonRole.buttons);
    await channel.send({ content: buttonRole.panelData.content, components: rows });
  } else {
    const embed = new EmbedBuilder()
      .setDescription(buttonRole.panelData.content.description)
      .setColor('Blue');

    if (buttonRole.panelData.content.title) {
      embed.setTitle(buttonRole.panelData.content.title);
    }

    if (buttonRole.panelData.content.footer) {
      embed.setFooter({ text: buttonRole.panelData.content.footer });
    }

    if (buttonRole.panelData.content.imageUri) {
      embed.setImage(buttonRole.panelData.content.imageUri);
    }

    const rows = createButtonRows(buttonRole.buttons);
    await channel.send({ embeds: [embed], components: rows });
  }

  await interaction.reply({
    content: `Panel **${panelName}** enviado a <#${buttonRole.channelId}>.`,
    ephemeral: true,
  });
}

function createButtonRows(buttons) {
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let buttonCount = 0;

  for (const button of buttons) {
    if (buttonCount === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      buttonCount = 0;
    }

    currentRow.addComponents(
      new ButtonBuilder()
        .setLabel(button.label)
        .setStyle(button.style)
        .setCustomId(button.customId)
    );

    buttonCount++;
  }

  if (buttonCount > 0) {
    rows.push(currentRow);
  }

  return rows;
}
