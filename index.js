// --- EXPRESS SERVER PARA SA RENDER 24/7 ---
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Source Shop Bot is online 24/7!');
});

app.listen(PORT, () => {
    console.log(`🌍 Web server is running on port ${PORT}`);
});
// ----------------------------------------

// Source Shop — Professional Vouch System
// Discord.js v14
// Existing vouches.json data remains compatible.

process.removeAllListeners('warning');

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits
} = require('discord.js');

const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const config = {
    guildId: '1488939407246622811',
    allowedRoleId: '1429183869554524240',
    vouchChannelId: '1488939695378530516',
    brandName: 'Source Shop',
    brandColor: 0x7C3AED,
    successColor: 0x22C55E,
    infoColor: 0x3B82F6,
    logoUrl: ''
};

const vouchFile = './vouches.json';

const starEmojis = {
    1: '⭐',
    2: '⭐⭐',
    3: '⭐⭐⭐',
    4: '⭐⭐⭐⭐',
    5: '⭐⭐⭐⭐⭐'
};

function loadVouches() {
    try {
        if (!fs.existsSync(vouchFile)) return [];
        const raw = fs.readFileSync(vouchFile, 'utf8').trim();
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('❌ Failed to load vouches:', error);
        return [];
    }
}

function saveVouches(vouches) {
    try {
        fs.writeFileSync(vouchFile, JSON.stringify(vouches, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('❌ Failed to save vouches:', error);
        return false;
    }
}

function createVouchId() {
    return `SS-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
}

function addVouch(data) {
    const vouches = loadVouches();
    const vouch = {
        id: createVouchId(),
        ...data,
        timestamp: Date.now()
    };
    vouches.push(vouch);
    return saveVouches(vouches) ? vouch : null;
}

function getRecentVouches(limit = 5) {
    return loadVouches().slice(-limit).reverse();
}

function getVouchStats() {
    const vouches = loadVouches();
    const starStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const vouch of vouches) {
        const stars = Number(vouch.stars);
        if (starStats[stars] !== undefined) starStats[stars]++;
    }

    const total = vouches.length;
    const average = total
        ? Number((vouches.reduce((sum, v) => sum + Number(v.stars || 0), 0) / total).toFixed(2))
        : 0;

    return {
        total,
        average,
        starStats,
        lastVouch: total ? vouches[total - 1] : null
    };
}

function truncate(text, max = 1000) {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function cleanInput(text) {
    return String(text || '')
        .trim()
        .replace(/@everyone|@here/gi, '@\u200beveryone');
}

function hasStaffAccess(interaction) {
    return interaction.member?.roles?.cache?.has(config.allowedRoleId) ||
        interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

function applyBrand(embed) {
    if (config.logoUrl) embed.setThumbnail(config.logoUrl);
    return embed;
}

function setBotStatus() {
    try {
        if (!client.user) return;
        const stats = getVouchStats();

        client.user.setActivity({
            name: `${stats.total} Vouches • ⭐ ${stats.average}`,
            type: 3
        });
    } catch (error) {
        console.error('❌ Failed to update bot status:', error);
    }
}

const commands = [
    new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Create a verified customer vouch')
        .addStringOption(option =>
            option.setName('seller')
                .setDescription('Seller name or Discord mention')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('product')
                .setDescription('Product purchased')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('stars')
                .setDescription('Rating from 1 to 5 stars')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5))
        .addStringOption(option =>
            option.setName('review')
                .setDescription('Optional customer feedback')
                .setRequired(false)
                .setMaxLength(1000)),

    new SlashCommandBuilder()
        .setName('vouchstats')
        .setDescription('Show complete shop vouch statistics'),

    new SlashCommandBuilder()
        .setName('vouchlist')
        .setDescription('Show the latest shop vouches')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of vouches to display (1-10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)),

    new SlashCommandBuilder()
        .setName('vouchpanel')
        .setDescription('Send a professional vouch information panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
];

client.once('ready', async () => {
    console.log(`✅ ${config.brandName} Vouch Bot logged in as${client.user.tag}`);
    console.log(`🆔 Application ID: ${client.application.id}`);
    console.log(`📊 Loaded ${loadVouches().length} vouches.`);
    setBotStatus();
    setInterval(setBotStatus, 2 * 60 * 1000);

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        console.log('🔄 Registering slash commands...');

        await rest.put(
            Routes.applicationCommands(client.application.id),
            { body: commands.map(command => command.toJSON()) }
        );

        console.log(`✅ Slash commands registered for application ${client.application.id}`);
    } catch (error) {
        console.error('❌ Failed to register slash commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        if (interaction.guildId !== config.guildId ||
            interaction.channelId !== config.vouchChannelId) {
            return interaction.reply({
                content: `❌ The SOURCE SHOP vouch system can only be used in <#${config.vouchChannelId}>.`,
                ephemeral: true
            });
        }

        if (interaction.commandName === 'vouch') {
            await handleVouchCommand(interaction);
        } else if (interaction.commandName === 'vouchstats') {
            await handleVouchStatsCommand(interaction);
        } else if (interaction.commandName === 'vouchlist') {
            await handleVouchListCommand(interaction);
        } else if (interaction.commandName === 'vouchpanel') {
            await handleVouchPanelCommand(interaction);
        }
    } catch (error) {
        if (error?.code === 10062) return;

        console.error('❌ Interaction error:', error);

        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: '❌ Something went wrong while processing this command.'
                });
            } else {
                await interaction.reply({
                    content: '❌ Something went wrong while processing this command.',
                    ephemeral: true
                });
            }
        } catch (_) {}
    }
});

async function handleVouchCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const seller = cleanInput(interaction.options.getString('seller'));
    const product = cleanInput(interaction.options.getString('product'));
    const stars = interaction.options.getInteger('stars');
    const review = cleanInput(interaction.options.getString('review') || '');

    if (!seller || !product || !stars) {
        return interaction.editReply({
            content: '❌ Please complete all required vouch fields.'
        });
    }

    const vouch = addVouch({
        seller,
        product,
        stars,
        review,
        userId: interaction.user.id
    });

    if (!vouch) {
        return interaction.editReply({
            content: '❌ The vouch could not be saved. Check the bot console.'
        });
    }

    setBotStatus();

    const reviewValue = review
        ? `> ${truncate(review, 900)}`
        : '*No written review provided.*';

    const embed = applyBrand(
        new EmbedBuilder()
            .setColor(config.brandColor)
            .setAuthor({ name: `${config.brandName} • Verified Vouch` })
            .setTitle('✦ New Customer Vouch')
            .setDescription(
                `A new customer review has been recorded for **${config.brandName}**.`
            )
            .addFields(
                { name: '👤 Seller', value: seller, inline: true },
                { name: '⭐ Rating', value: `${starEmojis[stars]} **${stars}/5**`, inline: true },
                { name: '🆔 Vouch ID', value: `\`${vouch.id}\``, inline: true },
                { name: '📦 Product', value: `\`\`\`${truncate(product, 900)}\`\`\``, inline: false },
                { name: '💬 Customer Feedback', value: reviewValue, inline: false },
                { name: '👤 Added By', value: `<@${interaction.user.id}>`, inline: true },
                { name: '🕒 Date', value: `<t:${Math.floor(vouch.timestamp / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: `${config.brandName} • Vouch System` })
            .setTimestamp(vouch.timestamp)
    );

    try {
        const channel = await client.channels.fetch(config.vouchChannelId);

        if (!channel || !channel.isTextBased()) {
            return interaction.editReply({
                content: '❌ The configured vouch channel is invalid or inaccessible.'
            });
        }

        await channel.send({ embeds: [embed] });

        await interaction.editReply({
            content: `✅ Vouch **${vouch.id}** created and posted successfully.`
        });
    } catch (error) {
        console.error('❌ Failed to send vouch:', error);

        await interaction.editReply({
            content: `⚠️ Vouch **${vouch.id}** was saved, but Discord could not post it in the configured channel.`
        });
    }
}

async function handleVouchStatsCommand(interaction) {
    await interaction.deferReply();

    const stats = getVouchStats();

    const breakdown = Object.entries(stats.starStats)
        .map(([stars, count]) => `${starEmojis[stars]}  ${count}`)
        .join('\n');

    const embed = applyBrand(
        new EmbedBuilder()
            .setColor(config.infoColor)
            .setAuthor({ name: `${config.brandName} • Reputation` })
            .setTitle('📊 Vouch Statistics')
            .setDescription(`Current reputation overview for **${config.brandName}**.`)
            .addFields(
                { name: '🧾 Total Vouches', value: `**${stats.total}**`, inline: true },
                { name: '⭐ Average Rating', value: `**${stats.average}/5**`, inline: true },
                { name: '📈 Rating Breakdown', value: breakdown || 'No ratings yet.', inline: false }
            )
            .setFooter({
                text: stats.lastVouch
                    ? `Last vouch: ${new Date(stats.lastVouch.timestamp).toLocaleString()}`
                    : 'No vouches recorded yet.'
            })
            .setTimestamp()
    );

    await interaction.editReply({ embeds: [embed] });
}

async function handleVouchListCommand(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount') || 5;
    const recent = getRecentVouches(amount);

    if (!recent.length) {
        return interaction.editReply({
            content: `📭 **${config.brandName}** does not have any vouches yet.`
        });
    }

    const description = recent.map((vouch, index) => {
        const review = vouch.review
            ? `\n> ${truncate(vouch.review, 250)}`
            : '';

        return [
            `### ${index + 1}. ${starEmojis[vouch.stars] || '⭐'}`,
            `**${vouch.product || 'Unknown Product'}**`,
            `👤 Seller: ${vouch.seller || 'Unknown'}`,
            `🧾 ID: \`${vouch.id || 'legacy'}\` • <t:${Math.floor((vouch.timestamp || Date.now()) / 1000)}:R>`,
            review
        ].join('\n');
    }).join('\n\n');

    const embed = applyBrand(
        new EmbedBuilder()
            .setColor(config.successColor)
            .setAuthor({ name: `${config.brandName} • Customer Reviews` })
            .setTitle(`📝 Latest ${recent.length} Vouch${recent.length === 1 ? '' : 'es'}`)
            .setDescription(description)
            .setFooter({
                text: `${loadVouches().length} total vouches • ${config.brandName}`
            })
            .setTimestamp()
    );

    await interaction.editReply({ embeds: [embed] });
}

async function handleVouchPanelCommand(interaction) {
    if (!hasStaffAccess(interaction)) {
        return interaction.reply({
            content: '❌ You do not have permission to create the vouch panel.',
            ephemeral: true
        });
    }

    const embed = applyBrand(
        new EmbedBuilder()
            .setColor(config.brandColor)
            .setAuthor({ name: `${config.brandName} • Official Vouches` })
            .setTitle('✦ CUSTOMER VOUCHES')
            .setDescription([
                `Welcome to the official **${config.brandName}** vouch system.`,
                '',
                'All customer reviews are recorded by the shop vouch bot and displayed in this channel.',
                '',
                '**How it works**',
                '• Complete a purchase with a seller',
                '• Give an honest 1–5 star rating',
                '• Include the product and optional feedback',
                '• Anyone can record a vouch using `/vouch`',
                '',
                'Thank you for supporting **SOURCE SHOP**.'
            ].join('\n'))
            .addFields(
                {
                    name: '📊 Reputation',
                    value: 'Use `/vouchstats` to view the shop rating and total vouches.',
                    inline: false
                },
                {
                    name: '📝 Recent Reviews',
                    value: 'Use `/vouchlist` to view the latest customer reviews.',
                    inline: false
                }
            )
            .setFooter({ text: `${config.brandName} • Official Vouch System` })
            .setTimestamp()
    );

    await interaction.reply({ embeds: [embed] });
}

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught Exception:', error);
});

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is missing from .env');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Discord login failed:', error);
    process.exit(1);
});
