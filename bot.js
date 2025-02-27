require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { QuickDB } = require("quick.db");

const db = new QuickDB();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

const prefix = '$';

client.once('ready', async () => {
    console.log(`Bot đã hoạt động: ${client.user.tag}`);

    // 📝 Tải thông tin tất cả thành viên trong server
    client.guilds.cache.forEach(async (guild) => {
        const members = await guild.members.fetch();
        members.forEach(async (member) => {
            if (!member.user.bot) {
                await db.set(`userData_${member.id}`, {
                    id: member.id,
                    username: member.user.username
                });
            }
        });
        console.log(`📥 Đã tải thông tin ${members.size} thành viên từ ${guild.name}`);
    });
});

// 🎉 Sự kiện chào mừng thành viên mới
client.on('guildMemberAdd', async (member) => {
    let welcomeChannelId = await db.get(`welcomeChannel_${member.guild.id}`);
    
    if (!welcomeChannelId) {
        welcomeChannelId = '123456789012345678'; // ID kênh mặc định
        await db.set(`welcomeChannel_${member.guild.id}`, welcomeChannelId);
    }

    const welcomeImage = "https://imgur.com/mw5FvvB.gif"; // GIF cố định
    const memberCount = member.guild.memberCount;

    const welcomeMessage = 
        `Chào mừng bạn <@${member.id}> đến với đại gia đình của ✨Te Con✨\n\n` +
        `🔰 Bạn là **thành viên thứ ${memberCount}** của server. Bạn nhớ đọc kĩ luật của server ✨Te Con✨ và tôn trọng mọi người nhé.\n\n` +
        `🔰 Mong bạn sẽ luôn có thời gian vui vẻ tại ✨Te Con✨`;

    const embed = new EmbedBuilder()
        .setColor('#FF5733')
        .setTitle("✨ Chào mừng thành viên mới! ✨")
        .setDescription(welcomeMessage)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage(welcomeImage)
        .setFooter({ text: "Chúc bạn có khoảng thời gian vui vẻ tại server!", iconURL: member.guild.iconURL({ dynamic: true }) });

    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (channel) {
        await channel.send({ embeds: [embed] });
    }

    // 📌 Lưu thông tin thành viên vào database
    await db.set(`userData_${member.id}`, {
        id: member.id,
        username: member.user.username
    });
});

// 😢 Sự kiện khi thành viên rời server
client.on('guildMemberRemove', async (member) => {
    let leaveChannelId = await db.get(`leaveChannel_${member.guild.id}`);
    if (!leaveChannelId) {
        leaveChannelId = '123456789012345678'; // ID kênh mặc định
        await db.set(`leaveChannel_${member.guild.id}`, leaveChannelId);
    }

    const userData = await db.get(`userData_${member.id}`);
    const username = userData ? userData.username : "Thành viên ẩn danh";

    const leaveMessage = `😭 **${username}** đã tạm biệt ✨Te Con✨`;

    const channel = member.guild.channels.cache.get(leaveChannelId);
    if (channel) {
        channel.send(leaveMessage);
    }

    // ❌ Xóa thông tin thành viên khỏi database
    await db.delete(`userData_${member.id}`);
});

// 🔧 Lệnh quản trị viên để thiết lập kênh chào mừng & rời
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    if (!message.member.permissions.has("ADMINISTRATOR")) {
        return message.reply('🚫 Bạn cần quyền quản trị viên.');
    }

    if (command === 'setwelcomechannel') {
        await db.set(`welcomeChannel_${message.guild.id}`, message.channel.id);
        message.reply(`✅ Đã thiết lập kênh **chào mừng**: ${message.channel}`);
    }

    if (command === 'setleavechannel') {
        await db.set(`leaveChannel_${message.guild.id}`, message.channel.id);
        message.reply(`✅ Đã thiết lập kênh **thông báo rời**: ${message.channel}`);
    }
});

client.login(process.env.TOKEN);
