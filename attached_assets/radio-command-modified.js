const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Controla la radio del servidor')
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Comienza a reproducir la radio en tu canal de voz')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('Detiene la reproducción de la radio')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('controls')
        .setDescription('Muestra los controles interactivos de la radio')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stations')
        .setDescription('Muestra la lista de estaciones disponibles')
    ),
  
  async execute(interaction) {
    const client = interaction.client;
    
    // Verificar si el usuario está en un canal de voz
    const voiceChannel = interaction.member.voice.channel;
    
    if (!voiceChannel && interaction.options.getSubcommand() !== 'stations' && interaction.options.getSubcommand() !== 'controls') {
      return interaction.reply({ content: '❌ Debes estar en un canal de voz para usar este comando.', ephemeral: true });
    }
    
    // Manejar los diferentes subcomandos
    switch (interaction.options.getSubcommand()) {
      case 'play':
        try {
          await client.radioStart(voiceChannel);
          
          // Obtener la estación actual o usar la primera por defecto
          const stations = client.getStations();
          const guildId = interaction.guild.id;
          const currentStations = client.currentStations || new Map();
          const currentInfo = currentStations.get(guildId) || { 
            index: 0,
            name: stations[0].name, 
            emoji: stations[0].emoji 
          };
          
          return interaction.reply(`🎵 Reproduciendo **${currentInfo.emoji} ${currentInfo.name}** en tu canal de voz.`);
        } catch (error) {
          console.error(error);
          return interaction.reply({ content: '❌ Ocurrió un error al iniciar la radio.', ephemeral: true });
        }
        
      case 'stop':
        try {
          const result = await client.radioStop(voiceChannel);
          
          if (result) {
            return interaction.reply('⏹️ Radio detenida correctamente.');
          } else {
            return interaction.reply({ content: '❌ No hay una radio activa para detener.', ephemeral: true });
          }
        } catch (error) {
          console.error(error);
          return interaction.reply({ content: '❌ Ocurrió un error al detener la radio.', ephemeral: true });
        }
        
      case 'controls':
        try {
          await client.createRadioControls(interaction.channel);
          return interaction.reply({ content: '✅ Controles de radio creados.', ephemeral: true });
        } catch (error) {
          console.error(error);
          return interaction.reply({ content: '❌ Ocurrió un error al crear los controles.', ephemeral: true });
        }
        
      case 'stations':
        try {
          const stations = client.getStations();
          let stationList = '📻 **Estaciones disponibles:**\n\n';
          
          stations.forEach((station, index) => {
            stationList += `${index + 1}. ${station.emoji} **${station.name}**\n`;
          });
          
          return interaction.reply(stationList);
        } catch (error) {
          console.error(error);
          return interaction.reply({ content: '❌ Ocurrió un error al listar las estaciones.', ephemeral: true });
        }
    }
  },
};
