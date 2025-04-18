/**
 * Manejador para integrar el sistema de radio con el reproductor de música basado en Lavalink
 * Evita conflictos cuando ambos sistemas intentan reproducir audio simultáneamente
 */

module.exports = (client) => {
  // Flag para saber si la radio está activa
  let radioActive = false;

  // Guardar las referencias originales de los métodos
  const originalRadioStart = client.radioStart;
  const originalLavalinkPlay = client.lavalink?.createPlayer;

  // Sobrescribir radioStart para detener Lavalink si está reproduciéndose
  if (originalRadioStart) {
    client.radioStart = async function(channel) {
      try {
        // Si hay un reproductor de lavalink activo, lo pausamos
        const player = client.lavalink?.players.get(channel.guild.id);
        if (player && player.playing) {
          await player.pause();
          console.log(`[Radio] Pausando Lavalink en guild: ${channel.guild.id}`);
        }

        // Activar la bandera de radio
        radioActive = true;
        
        // Llamar al método original
        return await originalRadioStart.call(this, channel);
      } catch (error) {
        console.error('[Handler] Error al iniciar radio:', error);
        throw error;
      }
    };
  }

  // Sobrescribir radioStop para restaurar Lavalink si estaba reproduciéndose
  const originalRadioStop = client.radioStop;
  if (originalRadioStop) {
    client.radioStop = async function(channel) {
      try {
        const result = await originalRadioStop.call(this, channel);
        
        // Si se detuvo con éxito, marcamos radioActive como false
        if (result) {
          radioActive = false;
          
          // Opcionalmente, reanudar el reproductor de Lavalink
          const player = client.lavalink?.players.get(channel.guild.id);
          if (player && player.paused) {
            await player.resume();
            console.log(`[Radio] Reanudando Lavalink en guild: ${channel.guild.id}`);
          }
        }
        
        return result;
      } catch (error) {
        console.error('[Handler] Error al detener radio:', error);
        throw error;
      }
    };
  }

  // Escuchar cuando se crea un reproductor de Lavalink para detener la radio
  if (client.lavalink) {
    const originalCreatePlayer = client.lavalink.createPlayer;
    
    client.lavalink.createPlayer = function(options) {
      // Crear el reproductor con el método original
      const player = originalCreatePlayer.call(this, options);
      
      // Añadir hook para detener la radio cuando se reproduce algo con Lavalink
      const originalPlay = player.play;
      player.play = async function() {
        // Si la radio está activa, intentamos detenerla
        if (radioActive) {
          try {
            const voiceChannel = client.channels.cache.get(options.voiceChannelId);
            if (voiceChannel) {
              await client.radioStop(voiceChannel);
              console.log(`[Lavalink] Deteniendo radio en guild: ${options.guildId}`);
            }
          } catch (error) {
            console.error('[Handler] Error al detener radio desde Lavalink:', error);
          }
        }
        
        // Llamar al método play original
        return await originalPlay.apply(this, arguments);
      };
      
      return player;
    };
  }

  console.log('[Handler] Sistema de integración Música-Radio inicializado');
};
