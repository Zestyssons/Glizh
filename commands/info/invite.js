
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('Obtén el enlace de invitación del bot.'),

	async execute(interaction) {
		const clientId = interaction.client.user.id;
		const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=1642787630327&scope=bot%20applications.commands`;

		const embed = new EmbedBuilder()
			.setTitle('🔹 Invita al Bot')
			.setDescription('¡Invita a este bot a tu servidor con el botón de abajo!')
			.setColor('#ffcc00')
			.setTimestamp();

		const button = new ButtonBuilder()
			.setLabel('Invitar Bot')
			.setStyle(ButtonStyle.Link)
			.setURL(inviteLink);

		const row = new ActionRowBuilder().addComponents(button);

		await interaction.reply({ embeds: [embed], components: [row] });
	},
};
