
const Discord = require('discord.js');
const Voice = require('@discordjs/voice');

// Configuración centralizada
const CONFIG = {
  CONNECTION_TIMEOUT: 5000, // 5 segundos en ms
  SUPPRESS_TIMEOUT: 500
};

// Lista de estaciones de radio disponibles
const RADIO_STATIONS = [
  { 
    name: "Radio 538", 
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO538",
    emoji: "🎵"
  },
  { 
    name: "Los 40 Principales", 
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_SP",
    emoji: "🎧"
  },
  { 
    name: "BBC Radio 1", 
    url: "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one",
    emoji: "🇬🇧"
  },
  { 
    name: "Radio Rock", 
    url: "https://stream.radiorock.fi/rr",
    emoji: "🤘"
  },
  { 
    name: "Jazz FM", 
    url: "https://stream.jazzfm.nl/jazzfm",
    emoji: "🎷"
  }
];

// Crear el reproductor de audio con configuración mejorada
const player = Voice.createAudioPlayer({
  behaviors: {
    noSubscriber: Voice.NoSubscriberBehavior.Play
  },
});

module.exports = (client) => {
  // Almacenar información de la estación actual por servidor
  client.currentStations = new Map();
  
  // Registro de eventos más limpio
  const setupEventListeners = () => {
    player.on('stateChange', (oldState, newState) => {
      if (newState.status === Voice.AudioPlayerStatus.Idle) {
        // Reiniciar la estación actual si se interrumpe
        for (const [guildId, stationInfo] of client.currentStations.entries()) {
          client.startStream(stationInfo.url);
          break; // Solo necesitamos reiniciar una vez
        }
      }
    });

    player.on('error', error => {
      client.emit("voiceError", error);
      // Intentar reproducir la primera estación en caso de error
      client.startStream(RADIO_STATIONS[0].url);
    });

    client.on(Discord.Events.ClientReady, async () => {
      // Iniciar con la primera estación por defecto
      client.startStream(RADIO_STATIONS[0].url);
    });

    // Manejar los botones de cambio de estación
    client.on(Discord.Events.InteractionCreate, async interaction => {
      if (!interaction.isButton()) return;
      
      if (interaction.customId.startsWith('radio_')) {
        await interaction.deferUpdate().catch(() => {});
        const stationIndex = parseInt(interaction.customId.split('_')[1]);
        
        if (stationIndex >= 0 && stationIndex < RADIO_STATIONS.length) {
          const guildId = interaction.guild.id;
          const station = RADIO_STATIONS[stationIndex];
          
          // Actualizar la estación actual
          client.currentStations.set(guildId, {
            index: stationIndex,
            name: station.name,
            url: station.url,
            emoji: station.emoji
          });
          
          // Cambiar el stream
          await client.startStream(station.url);
          
          // Actualizar el mensaje con la nueva estación
          await updateRadioMessage(interaction.message, stationIndex);
        }
      } else if (interaction.customId === 'radio_previous') {
        await interaction.deferUpdate().catch(() => {});
        const guildId = interaction.guild.id;
        const currentInfo = client.currentStations.get(guildId) || { index: 0 };
        const newIndex = (currentInfo.index - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
        
        // Actualizar la estación actual
        client.currentStations.set(guildId, {
          index: newIndex,
          name: RADIO_STATIONS[newIndex].name,
          url: RADIO_STATIONS[newIndex].url,
          emoji: RADIO_STATIONS[newIndex].emoji
        });
        
        // Cambiar el stream
        await client.startStream(RADIO_STATIONS[newIndex].url);
        
        // Actualizar el mensaje con la nueva estación
        await updateRadioMessage(interaction.message, newIndex);
      } else if (interaction.customId === 'radio_next') {
        await interaction.deferUpdate().catch(() => {});
        const guildId = interaction.guild.id;
        const currentInfo = client.currentStations.get(guildId) || { index: 0 };
        const newIndex = (currentInfo.index + 1) % RADIO_STATIONS.length;
        
        // Actualizar la estación actual
        client.currentStations.set(guildId, {
          index: newIndex,
          name: RADIO_STATIONS[newIndex].name,
          url: RADIO_STATIONS[newIndex].url,
          emoji: RADIO_STATIONS[newIndex].emoji
        });
        
        // Cambiar el stream
        await client.startStream(RADIO_STATIONS[newIndex].url);
        
        // Actualizar el mensaje con la nueva estación
        await updateRadioMessage(interaction.message, newIndex);
      } else if (interaction.customId === 'radio_stop') {
        await interaction.deferUpdate().catch(() => {});
        const channel = interaction.member.voice.channel;
        if (channel) {
          await client.radioStop(channel);
        }
      } else if (interaction.customId === 'radio_play') {
        await interaction.deferUpdate().catch(() => {});
        const channel = interaction.member.voice.channel;
        if (channel) {
          const guildId = interaction.guild.id;
          const currentInfo = client.currentStations.get(guildId) || { 
            index: 0, 
            name: RADIO_STATIONS[0].name,
            url: RADIO_STATIONS[0].url,
            emoji: RADIO_STATIONS[0].emoji
          };
          
          await client.radioStart(channel);
          await client.startStream(currentInfo.url);
        }
      }
    });
  };

  /**
   * Actualiza el mensaje de la radio con la información actual
   * @param {Discord.Message} message - El mensaje a actualizar
   * @param {number} stationIndex - El índice de la estación actual
   */
  const updateRadioMessage = async (message, stationIndex) => {
    const station = RADIO_STATIONS[stationIndex];
    
    // Crear la barra de progreso visual
    const progressBar = "▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱";
    
    const embed = new Discord.EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎵 Radio Discord Bot')
      .addFields(
        { name: '📻 Now Playing', value: `${station.emoji} ${station.name}`, inline: false },
        { name: '🔊 Volume', value: '100%', inline: true },
        { name: '📡 Status', value: 'Streaming', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Estación ${stationIndex + 1}/${RADIO_STATIONS.length}` });

    // Crear los botones de control de la radio
    const row1 = new Discord.ActionRowBuilder()
      .addComponents(
        new Discord.ButtonBuilder()
          .setCustomId('radio_previous')
          .setLabel('⏮️')
          .setStyle(Discord.ButtonStyle.Secondary),
        new Discord.ButtonBuilder()
          .setCustomId('radio_play')
          .setLabel('▶️')
          .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
          .setCustomId('radio_stop')
          .setLabel('⏹️')
          .setStyle(Discord.ButtonStyle.Danger),
        new Discord.ButtonBuilder()
          .setCustomId('radio_next')
          .setLabel('⏭️')
          .setStyle(Discord.ButtonStyle.Secondary)
      );
      
    // Botones para seleccionar estaciones directamente
    const row2 = new Discord.ActionRowBuilder();
    
    // Agregar hasta 5 estaciones por fila (límite de Discord)
    const maxStationsInRow = Math.min(5, RADIO_STATIONS.length);
    for (let i = 0; i < maxStationsInRow; i++) {
      row2.addComponents(
        new Discord.ButtonBuilder()
          .setCustomId(`radio_${i}`)
          .setLabel(RADIO_STATIONS[i].emoji)
          .setStyle(i === stationIndex ? Discord.ButtonStyle.Success : Discord.ButtonStyle.Secondary)
      );
    }
    
    await message.edit({ embeds: [embed], components: [row1, row2] }).catch(error => {
      console.error('Error al actualizar el mensaje de radio:', error);
    });
  };

  /**
   * Crea y envía un mensaje de control de radio al canal
   * @param {Discord.TextChannel} channel - Canal de texto para enviar el mensaje
   * @param {number} stationIndex - Índice de la estación inicial
   */
  client.createRadioControls = async function(channel, stationIndex = 0) {
    const guildId = channel.guild.id;
    
    // Establecer la estación por defecto para este servidor
    client.currentStations.set(guildId, {
      index: stationIndex,
      name: RADIO_STATIONS[stationIndex].name,
      url: RADIO_STATIONS[stationIndex].url,
      emoji: RADIO_STATIONS[stationIndex].emoji
    });
    
    const embed = new Discord.EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎵 Radio Discord Bot')
      .addFields(
        { name: '📻 Now Playing', value: `${RADIO_STATIONS[stationIndex].emoji} ${RADIO_STATIONS[stationIndex].name}`, inline: false },
        { name: '🔊 Volume', value: '100%', inline: true },
        { name: '📡 Status', value: 'Ready to Stream', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Estación ${stationIndex + 1}/${RADIO_STATIONS.length}` });

    // Crear los botones de control de la radio
    const row1 = new Discord.ActionRowBuilder()
      .addComponents(
        new Discord.ButtonBuilder()
          .setCustomId('radio_previous')
          .setLabel('⏮️')
          .setStyle(Discord.ButtonStyle.Secondary),
        new Discord.ButtonBuilder()
          .setCustomId('radio_play')
          .setLabel('▶️')
          .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
          .setCustomId('radio_stop')
          .setLabel('⏹️')
          .setStyle(Discord.ButtonStyle.Danger),
        new Discord.ButtonBuilder()
          .setCustomId('radio_next')
          .setLabel('⏭️')
          .setStyle(Discord.ButtonStyle.Secondary)
      );
      
    // Botones para seleccionar estaciones directamente
    const row2 = new Discord.ActionRowBuilder();
    
    // Agregar hasta 5 estaciones por fila (límite de Discord)
    const maxStationsInRow = Math.min(5, RADIO_STATIONS.length);
    for (let i = 0; i < maxStationsInRow; i++) {
      row2.addComponents(
        new Discord.ButtonBuilder()
          .setCustomId(`radio_${i}`)
          .setLabel(RADIO_STATIONS[i].emoji)
          .setStyle(i === stationIndex ? Discord.ButtonStyle.Success : Discord.ButtonStyle.Secondary)
      );
    }
    
    return channel.send({ embeds: [embed], components: [row1, row2] }).catch(error => {
      console.error('Error al crear controles de radio:', error);
    });
  };

  /**
   * Inicia la transmisión de audio desde una URL
   * @param {string} url - URL del stream de audio
   * @returns {Promise} - Promesa resuelta cuando el player comienza a reproducir
   */
  client.startStream = async function (url) {
    try {
      const resource = Voice.createAudioResource(url, {
        inputType: Voice.StreamType.Arbitrary,
      });

      player.play(resource);

      return Voice.entersState(player, Voice.AudioPlayerStatus.Playing, CONFIG.CONNECTION_TIMEOUT)
        .catch((error) => {
          console.error("Error starting stream:", error);
        });
    } catch (error) {
      console.error("Fatal error in startStream:", error);
      throw error;
    }
  };

  /**
   * Conecta el bot a un canal de voz
   * @param {Discord.VoiceChannel} channel - Canal de voz al que conectarse
   * @returns {Voice.VoiceConnection} - Conexión establecida
   */
  client.connectToChannel = async function (channel) {
    if (!channel || !channel.id) {
      throw new Error("Canal inválido o no proporcionado");
    }

    const connection = Voice.joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    // Manejar canal de stage si es necesario
    if (channel.type === Discord.ChannelType.GuildStageVoice) {
      setTimeout(() => {
        try {
          channel.guild.members.me.voice.setSuppressed(false);
        } catch (error) {
          console.error("Error al configurar canal de stage:", error);
        }
      }, CONFIG.SUPPRESS_TIMEOUT);
    }

    try {
      await Voice.entersState(connection, Voice.VoiceConnectionStatus.Ready, CONFIG.CONNECTION_TIMEOUT);
      return connection;
    } catch (error) {
      connection.destroy();
      client.emit("voiceError", error);
      throw error;
    }
  };

  /**
   * Inicia la radio en un canal específico
   * @param {Discord.VoiceChannel} channel - Canal donde iniciar la radio
   */
  client.radioStart = async function (channel) {
    try {
      const connection = await client.connectToChannel(channel);
      connection.subscribe(player);
      
      // Si no hay estación configurada para este servidor, establecemos una por defecto
      const guildId = channel.guild.id;
      if (!client.currentStations.has(guildId)) {
        client.currentStations.set(guildId, {
          index: 0,
          name: RADIO_STATIONS[0].name,
          url: RADIO_STATIONS[0].url,
          emoji: RADIO_STATIONS[0].emoji
        });
      }
      
      return connection;
    } catch (error) {
      console.error(`Error al iniciar radio en canal ${channel?.id}:`, error);
    }
  };

  /**
   * Detiene la radio en un canal específico
   * @param {Discord.VoiceChannel} channel - Canal donde detener la radio
   */
  client.radioStop = async function (channel) {
    try {
      const connection = Voice.getVoiceConnection(channel.guild.id);
      if (connection) {
        connection.destroy();
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error al detener radio en canal ${channel?.id}:`, error);
      return false;
    }
  };

  /**
   * Cambia a la siguiente estación de radio para un servidor específico
   * @param {string} guildId - ID del servidor
   */
  client.nextStation = async function (guildId) {
    const currentInfo = client.currentStations.get(guildId) || { index: 0 };
    const newIndex = (currentInfo.index + 1) % RADIO_STATIONS.length;
    
    client.currentStations.set(guildId, {
      index: newIndex,
      name: RADIO_STATIONS[newIndex].name,
      url: RADIO_STATIONS[newIndex].url,
      emoji: RADIO_STATIONS[newIndex].emoji
    });
    
    await client.startStream(RADIO_STATIONS[newIndex].url);
    return RADIO_STATIONS[newIndex];
  };

  /**
   * Cambia a la estación anterior para un servidor específico
   * @param {string} guildId - ID del servidor
   */
  client.previousStation = async function (guildId) {
    const currentInfo = client.currentStations.get(guildId) || { index: 0 };
    const newIndex = (currentInfo.index - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    
    client.currentStations.set(guildId, {
      index: newIndex,
      name: RADIO_STATIONS[newIndex].name,
      url: RADIO_STATIONS[newIndex].url,
      emoji: RADIO_STATIONS[newIndex].emoji
    });
    
    await client.startStream(RADIO_STATIONS[newIndex].url);
    return RADIO_STATIONS[newIndex];
  };

  /**
   * Obtiene la lista de estaciones disponibles
   */
  client.getStations = function() {
    return [...RADIO_STATIONS];
  };

  // Configurar eventos
  setupEventListeners();
};
