
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Crea una encuesta para que los miembros voten')
    .addStringOption(option => 
      option.setName('pregunta')
        .setDescription('La pregunta de la encuesta')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('opcion1')
        .setDescription('Primera opción')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('opcion2')
        .setDescription('Segunda opción')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('opcion3')
        .setDescription('Tercera opción (opcional)')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('opcion4')
        .setDescription('Cuarta opción (opcional)')
        .setRequired(false)),
  category: 'Utility',
  
  async execute(interaction) {
    const question = interaction.options.getString('pregunta');
    const options = [
      interaction.options.getString('opcion1'),
      interaction.options.getString('opcion2'),
      interaction.options.getString('opcion3'),
      interaction.options.getString('opcion4')
    ].filter(Boolean); // Filtra los valores nulos o undefined
    
    const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const optionsText = options.map((option, index) => 
      `${optionEmojis[index]} ${option}`).join('\n\n');
    
    const embed = new EmbedBuilder()
      .setColor('#FF9900')
      .setTitle('📊 ' + question)
      .setDescription(optionsText)
      .setFooter({ 
        text: `Encuesta creada por ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
      })
      .setTimestamp();
      
    const buttons = new ActionRowBuilder();
    
    options.forEach((_, index) => {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_option_${index}`)
          .setLabel(`Opción ${index + 1}`)
          .setEmoji(optionEmojis[index])
          .setStyle(ButtonStyle.Primary)
      );
    });
    
    const message = await interaction.reply({ 
      embeds: [embed], 
      components: [buttons], 
      fetchReply: true 
    });
    
    // Guardar la información de las votaciones
    const votes = new Map();
    options.forEach((_, index) => votes.set(`poll_option_${index}`, new Set()));
    
    const collector = message.createMessageComponentCollector({ 
      time: 3600000 // 1 hora
    });
    
    collector.on('collect', async i => {
      // Verificar si el usuario ya votó por otra opción y remover ese voto
      options.forEach((_, index) => {
        const optionId = `poll_option_${index}`;
        if (votes.get(optionId).has(i.user.id) && optionId !== i.customId) {
          votes.get(optionId).delete(i.user.id);
        }
      });
      
      // Agregar o remover el voto del usuario en la opción seleccionada
      const userVotes = votes.get(i.customId);
      if (userVotes.has(i.user.id)) {
        userVotes.delete(i.user.id);
        await i.reply({ content: `Has retirado tu voto para esta opción.`, ephemeral: true });
      } else {
        userVotes.add(i.user.id);
        await i.reply({ content: `¡Has votado por esta opción!`, ephemeral: true });
      }
      
      // Actualizar el embed con los resultados actuales
      const updatedOptionsText = options.map((option, index) => {
        const optionId = `poll_option_${index}`;
        const voteCount = votes.get(optionId).size;
        const percentage = Math.round((voteCount / interaction.guild.memberCount) * 100);
        return `${optionEmojis[index]} ${option} (${voteCount} votos, ~${percentage}%)`;
      }).join('\n\n');
      
      const updatedEmbed = EmbedBuilder.from(message.embeds[0])
        .setDescription(updatedOptionsText);
        
      await message.edit({ embeds: [updatedEmbed] });
    });
    
    collector.on('end', () => {
      const finalEmbed = EmbedBuilder.from(message.embeds[0])
        .setTitle(`📊 [FINALIZADA] ${question}`)
        .setColor('#808080');
        
      message.edit({ embeds: [finalEmbed], components: [] });
    });
  },
};
