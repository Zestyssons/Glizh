const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'queueEnd',
  async execute(client, player, track) {
    const channel = client.channels.cache.get(player.textChannelId);

    if (channel) {
      const embed = new EmbedBuilder()
        .setColor('#FF4500') // Color atractivo para el embed
        .setDescription('<:panda:1062855191273144340> Se acabó la cola. ¡Añade más canciones!');

      channel.send({ embeds: [embed] });
    }

    if (player.collector) {
      player.collector.stop();
    }
  },
};