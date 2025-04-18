const { Events } = require('discord.js');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const client = oldState.client;
        const player = client.lavalink.players.get(oldState.guild.id);

        if (!player) return;

        // Si el bot es el que abandona el canal de voz
        if (oldState.id === client.user.id && !newState.channelId) {
            player.destroy();
            return;
        }

        const voiceChannel = oldState.guild.channels.cache.get(
            player.voiceChannelId
        );
        if (!voiceChannel) return;

        // Verificar si no hay usuarios humanos en el canal
        const members = voiceChannel.members.filter(
            (member) => !member.user.bot
        ).size;

        if (members === 0) {
            // Configurar tiempo de inactividad (5 minutos)
            player.inactivityTimeout = setTimeout(() => {
                if (player.playing) player.stopPlaying(); // Detener la reproducción si está activa
                player.destroy(); // Destruir el reproductor

                // Enviar mensaje personalizado al canal de texto asociado
                const textChannel = oldState.guild.channels.cache.get(
                    player.textChannelId
                );
                if (textChannel) {
                    textChannel.send(
                        '👋 ¡El bot ha salido del canal de voz debido a 5 minutos de inactividad sin oyentes!'
                    );
                }
            }, 300000); // 5 minutos (300,000 ms)
        } else if (player.inactivityTimeout) {
            // Cancelar el temporizador si regresan usuarios humanos al canal
            clearTimeout(player.inactivityTimeout);
            player.inactivityTimeout = null;
        }
    },
};
