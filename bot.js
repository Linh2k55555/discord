require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { exec } = require('child_process');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

const prefix = '$';
const dataFile = 'users.json';

// 📌 Hàm đọc dữ liệu từ file JSON
function readData() {
    if (!fs.existsSync(dataFile)) return {};
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

// 📌 Hàm ghi dữ liệu vào file JSON
function writeData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

client.once('ready', async () => {
    console.log(`✅ Bot đã hoạt động: ${client.user.tag}`);

    let data = readData();

    client.guilds.cache.forEach(async (guild) => {
        console.log(`📡 Đang tải thông tin thành viên từ server: ${guild.name}`);
        const members = await guild.members.fetch();
        members.forEach((member) => {
            if (!member.user.bot) {
                data[member.id] = {
                    id: member.id,
                    username: member.user.username
                };
            }
        });
        writeData(data);
        console.log(`📥 Đã tải thông tin ${members.size} thành viên từ ${guild.name}`);
    });
});

// 🎉 Sự kiện chào mừng thành viên mới
client.on('guildMemberAdd', async (member) => {
    console.log(`➕ Thành viên mới: ${member.user.username} (${member.id}) đã tham gia.`);
    let data = readData();
    data[member.id] = {
        id: member.id,
        username: member.user.username
    };
    writeData(data);

    let guildData = readData();
    let welcomeChannelId = guildData[`welcomeChannel_${member.guild.id}`] || member.guild.systemChannelId;
    const welcomeImage = "https://imgur.com/mw5FvvB.gif";
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
    if (channel) await channel.send({ embeds: [embed] });
});

// 😢 Sự kiện khi thành viên rời server
client.on('guildMemberRemove', async (member) => {
    console.log(`➖ Thành viên rời đi: ${member.user.username} (${member.id})`);
    let data = readData();
    const username = data[member.id] ? data[member.id].username : "Thành viên ẩn danh";
    delete data[member.id];
    writeData(data);

    let guildData = readData();
    let leaveChannelId = guildData[`leaveChannel_${member.guild.id}`] || member.guild.systemChannelId;
    const leaveMessage = `😭 **${username}** đã rời khỏi ✨Te Con✨`;
    const channel = member.guild.channels.cache.get(leaveChannelId);
    if (channel) channel.send(leaveMessage);
});

// 🔧 Lệnh quản trị viên
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    console.log(`📩 Nhận lệnh: ${message.content} từ ${message.author.username}`);
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    if (!message.member.permissions.has("ADMINISTRATOR")) {
        return message.reply('🚫 Bạn cần quyền quản trị viên.');
    }

    if (command === 'setwelcomechannel') {
        let data = readData();
        data[`welcomeChannel_${message.guild.id}`] = message.channel.id;
        writeData(data);
        message.reply(`✅ Đã thiết lập kênh **chào mừng**: ${message.channel}`);
        console.log(`📌 Đã lưu kênh chào mừng: ${message.channel.id}`);
    }

    if (command === 'setleavechannel') {
        let data = readData();
        data[`leaveChannel_${message.guild.id}`] = message.channel.id;
        writeData(data);
        message.reply(`✅ Đã thiết lập kênh **thông báo rời**: ${message.channel}`);
        console.log(`📌 Đã lưu kênh thông báo rời: ${message.channel.id}`);
    }

    if (command === 'restart') {
        message.reply('🔄 Bot đang khởi động lại...');
        console.log("⚙️ Bot đang khởi động lại theo yêu cầu...");
        setTimeout(() => process.exit(0), 3000);
    }
});

// 🔄 Tự động restart bot sau 1 tiếng
setInterval(() => {
    console.log("🔄 Tự động restart bot...");
    process.exit(0);
}, 60 * 60 * 1000);

client.login(process.env.TOKEN);
