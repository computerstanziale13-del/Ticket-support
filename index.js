const {
    Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder,
    StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType,
    PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActivityType,
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

// Costanti
const RUOLO_STAFF = process.env.RUOLO_STAFF;
const CANALE_TRANSCRIPT = process.env.CANALE_TRANSCRIPT;

// Funzione unica per chiudere i ticket (Evita duplicazione codice)
async function chiudiTicket(interaction, motivazione) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const messaggi = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = messaggi.reverse().map(m => `[${m.author.tag}]: ${m.content}`).join('\n');
        
        const canaleTranscript = interaction.guild.channels.cache.get(CANALE_TRANSCRIPT);
        
        const embedTranscript = new EmbedBuilder()
            .setColor(0x95a5a6)
            .setTitle('📄 Transcript Ticket')
            .addFields(
                { name: '👤 Canale', value: interaction.channel.name },
                { name: '🔒 Chiuso da', value: interaction.user.username },
                { name: '📝 Motivazione', value: motivazione },
            );

        if (canaleTranscript) {
            await canaleTranscript.send({ embeds: [embedTranscript] });
            if (transcript.length > 0) {
                const buf = Buffer.from(transcript, 'utf8');
                await canaleTranscript.send({ files: [{ attachment: buf, name: `transcript-${interaction.channel.name}.txt` }] });
            }
        }
    } catch (e) {
        console.error(e);
    }

    await interaction.editReply({ content: '✅ Ticket chiuso! Il canale verrà eliminato a breve.' });
    setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
}

client.once(Events.ClientReady, (c) => {
    console.log(`✅ Bot online come ${c.user.tag}`);
    client.user.setActivity('Ticket', { type: ActivityType.Watching });
});

client.on(Events.InteractionCreate, async (interaction) => {
    // Gestione Setup
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
        // ... (il tuo codice per l'embed del setup resta uguale)
    }

    // Gestione Menu Selezione
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
        const canale = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: RUOLO_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });
        
        // ... (restante codice invio embed con bottoni)
    }

    // Bottone Chiudi
    if (interaction.isButton() && interaction.customId === 'ticket_chiudi') {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal_chiudi')
            .setTitle('Chiudi Ticket')
            .addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('motivazione_chiusura').setLabel('Motivazione').setStyle(TextInputStyle.Short).setRequired(true)
            ));
        return interaction.showModal(modal);
    }

    // Submit Modal
    if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal_chiudi') {
        const motivo = interaction.fields.getTextInputValue('motivazione_chiusura');
        await chiudiTicket(interaction, motivo);
    }
});

client.login(process.env.TOKEN);
