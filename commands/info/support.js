const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('support')
		.setDescription('Obtén el enlace al servidor de soporte.'),

	async execute(interaction) {
		const supportServerLink = 'https://discord.gg/G3kgHTWZ4Y'; // Reemplaza con tu enlace de servidor de soporte

		const embed = new EmbedBuilder()
			.setTitle('🔹 Servidor de Soporte')
			.setDescription('¿Necesitas ayuda? ¡Únete a nuestro servidor de soporte usando el botón de abajo!')
			.setColor('#ffcc00')
			.setTimestamp();

		const button = new ButtonBuilder()
			.setLabel('Unirse al Servidor de Soporte')
			.setStyle(ButtonStyle.Link)
			.setURL(supportServerLink);

		const row = new ActionRowBuilder().addComponents(button);

		await interaction.reply({ embeds: [embed], components: [row] }); // Sin bandera ephemeral, así que es público
	},
};