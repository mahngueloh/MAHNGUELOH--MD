const config = require('../config')
const os = require('os')
const fs = require('fs')
const path = require('path')

function getRam() {
    const t = os.totalmem(), f = os.freemem(), u = t - f
    const pct = Math.round((u / t) * 100)
    return { pct, usedMB: Math.round(u/1024/1024), totalGB: (t/1024/1024/1024).toFixed(0), bar: '█'.repeat(Math.round(pct/10))+'░'.repeat(10-Math.round(pct/10)) }
}

async function sendMenu(sock, from, sender, msg) {
    const p = config.prefix
    const ram = getRam()
    const speed = (Math.random()*0.9+0.1).toFixed(4)
    const mode = (config.mode||'public').toUpperCase()

    const header =
`┏▣ ◈ *${config.botName}* ◈
┃ *ᴏᴡɴᴇʀ* : ${config.ownerName}
┃ *ᴘʀᴇғɪx* : [ ${p} ]
┃ *ʜᴏsᴛ* : Panel
┃ *ᴘʟᴜɢɪɴs* : 327
┃ *ᴍᴏᴅᴇ* : ${mode}
┃ *ᴀɪ* : ${config.aiEnabled!==false?'ON':'OFF'}
┃ *ᴠᴇʀsɪᴏɴ* : 1.0.0
┃ *sᴘᴇᴇᴅ* : ${speed} ms
┃ *ᴜsᴀɢᴇ* : ${ram.usedMB} MB of ${ram.totalGB} GB
┃ *ʀᴀᴍ:* [${ram.bar}] ${ram.pct}%
┗▣`

    const customMenu =
`┏▣ ◈ *CUSTOM COMMANDS* ◈
│➽ ${p}addcmd <cmd> | <response>
│➽ ${p}editcmd <cmd> | <new response>
│➽ ${p}delcmd <cmd>
│➽ ${p}listcmd
│➽ ${p}cmdinfo <cmd>
┗▣
_Variables: {user} {prefix} {botname}_`

    const aiMenu =
`┏▣ ◈ *AI MENU* ◈
│➽ ${p}analyze
│➽ ${p}blackbox
│➽ ${p}code
│➽ ${p}dalle
│➽ ${p}deepseek
│➽ ${p}doppleai
│➽ ${p}gemini
│➽ ${p}generate
│➽ ${p}gpt
│➽ ${p}programming
│➽ ${p}recipe
│➽ ${p}story
│➽ ${p}summarize
│➽ ${p}teach
│➽ ${p}translate2
┗▣`

    const audioMenu =
`┏▣ ◈ *AUDIO MENU* ◈
│➽ ${p}bass
│➽ ${p}blown
│➽ ${p}deep
│➽ ${p}earrape
│➽ ${p}reverse
│➽ ${p}robot
│➽ ${p}tomp3
│➽ ${p}toptt
│➽ ${p}volaudio
┗▣`

    const downloadMenu =
`┏▣ ◈ *DOWNLOAD MENU* ◈
│➽ ${p}play <name>    🎵 Search & play
│➽ ${p}song <name>    🎶 Download audio
│➽ ${p}ytmp3 <url>    ▶️ YouTube audio
│➽ ${p}ytmp4 <url>    📺 YouTube video
│➽ ${p}tiktok <url>   🎵 TikTok video
│➽ ${p}ig <url>       📸 Instagram
│➽ ${p}facebook <url> 📘 Facebook
│➽ ${p}twitter <url>  🐦 Twitter/X
│➽ ${p}video <url>    🎬 Any video
│➽ ${p}tiktokaudio
│➽ ${p}song2
│➽ ${p}xvideo
┗▣`

    const ephotoMenu =
`┏▣ ◈ *EPHOTO360 MENU* ◈
│➽ ${p}1917style
│➽ ${p}advancedglow
│➽ ${p}blackpinklogo
│➽ ${p}blackpinkstyle
│➽ ${p}cartoonstyle
│➽ ${p}deletingtext
│➽ ${p}dragonball
│➽ ${p}effectclouds
│➽ ${p}flag3dtext
│➽ ${p}flagtext
│➽ ${p}galaxystyle
│➽ ${p}glitchtext
│➽ ${p}glowingtext
│➽ ${p}gradienttext
│➽ ${p}graffiti
│➽ ${p}logomaker
│➽ ${p}luxurygold
│➽ ${p}matrix
│➽ ${p}neonglitch
│➽ ${p}royaltext
│➽ ${p}typography
│➽ ${p}writetext
┗▣`

    const funMenu =
`┏▣ ◈ *FUN MENU* ◈
│➽ ${p}fact
│➽ ${p}jokes
│➽ ${p}memes
│➽ ${p}quotes
│➽ ${p}trivia
│➽ ${p}truthdetector
│➽ ${p}xxqc
┗▣`

    const gamesMenu =
`┏▣ ◈ *GAMES MENU* ◈
│➽ ${p}dare
│➽ ${p}truth
│➽ ${p}truthordare
┗▣`

    const groupMenu =
`┏▣ ◈ *GROUP MENU* ◈
│➽ ${p}add
│➽ ${p}admins
│➽ ${p}antibadword [warn/delete/kick]
│➽ ${p}antibug [warn/delete/kick]
│➽ ${p}antibot
│➽ ${p}antidemote
│➽ ${p}antiforeign
│➽ ${p}antilink [warn/delete/kick]
│➽ ${p}antiremove
│➽ ${p}antisticker [warn/delete/kick]
│➽ ${p}antivoicenote [warn/delete/kick]
│➽ ${p}ban
│➽ ${p}demote
│➽ ${p}getsettings
│➽ ${p}goodbye
│➽ ${p}hidetag
│➽ ${p}invite
│➽ ${p}kick
│➽ ${p}kickall
│➽ ${p}link
│➽ ${p}mediatag
│➽ ${p}mute
│➽ ${p}poll Q | A | B
│➽ ${p}promote
│➽ ${p}resetlink
│➽ ${p}setdesc
│➽ ${p}setgroupname
│➽ ${p}setppgroup
│➽ ${p}tag
│➽ ${p}tagadmin
│➽ ${p}tagall
│➽ ${p}totalmembers
│➽ ${p}unban
│➽ ${p}unmute
│➽ ${p}userid
│➽ ${p}welcome
┗▣`

    const imageMenu =
`┏▣ ◈ *IMAGE MENU* ◈
│➽ ${p}remini
│➽ ${p}wallpaper
┗▣`

    const otherMenu =
`┏▣ ◈ *OTHER MENU* ◈
│➽ ${p}botstatus
│➽ ${p}pair
│➽ ${p}ping
│➽ ${p}ping2
│➽ ${p}repo
│➽ ${p}runtime
│➽ ${p}time
┗▣`

    const ownerMenu =
`┏▣ ◈ *OWNER MENU* ◈
│➽ ${p}mode public/private
│➽ ${p}chatbot
│➽ ${p}modestatus
│➽ ${p}alwaysonline
│➽ ${p}autoread
│➽ ${p}autosavestatus
│➽ ${p}autoreactstatus
│➽ ${p}anticall
│➽ ${p}block / ${p}unblock
│➽ ${p}delete
│➽ ${p}deljunk
│➽ ${p}device
│➽ ${p}disk
│➽ ${p}getgrouppp
│➽ ${p}getpp
│➽ ${p}groupid
│➽ ${p}hostip
│➽ ${p}join / ${p}leave
│➽ ${p}lastseen
│➽ ${p}listbadword
│➽ ${p}listblocked
│➽ ${p}listignorelist
│➽ ${p}listsudo
│➽ ${p}online
│➽ ${p}owner
│➽ ${p}react
│➽ ${p}readreceipts
│➽ ${p}restart
│➽ ${p}setbio
│➽ ${p}setbotname
│➽ ${p}setownername
│➽ ${p}setownernumber
│➽ ${p}setprefix
│➽ ${p}setprofilepic
│➽ ${p}tostatus
│➽ ${p}toviewonce
│➽ ${p}unblockall
│➽ ${p}vv2
│➽ ${p}warn / ${p}resetwarn
┗▣`

    const religionMenu =
`┏▣ ◈ *RELIGION MENU* ◈
│➽ ${p}bible <verse>
│➽ ${p}quran <ayah number>
┗▣
_Example: .bible John 3:16_
_Example: .quran 255_`

    const searchMenu =
`┏▣ ◈ *SEARCH MENU* ◈
│➽ ${p}define <word>
│➽ ${p}define2 <word>
│➽ ${p}imdb <movie>
│➽ ${p}lyrics <artist song>
│➽ ${p}shazam
│➽ ${p}weather <city>
│➽ ${p}yts <movie>
┗▣`

    const settingsMenu =
`┏▣ ◈ *SETTINGS MENU* ◈
│➽ ${p}addbadword
│➽ ${p}addignorelist
│➽ ${p}addsudo
│➽ ${p}alwaysonline
│➽ ${p}antibug
│➽ ${p}antiremove
│➽ ${p}autoread
│➽ ${p}autotype
│➽ ${p}chatbot
│➽ ${p}deletebadword
│➽ ${p}delignorelist
│➽ ${p}delsudo
│➽ ${p}getsettings
│➽ ${p}listwarn
│➽ ${p}mode public/private
│➽ ${p}modestatus
│➽ ${p}readreceipts
│➽ ${p}resetwarn
│➽ ${p}setbotname
│➽ ${p}setownername
│➽ ${p}setownernumber
│➽ ${p}setprefix
│➽ ${p}warn
┗▣`

    const sportsMenu =
`┏▣ ◈ *SPORTS MENU* ◈
│➽ ${p}eplmatches
│➽ ${p}eplstandings
│➽ ${p}eplscorers
│➽ ${p}eplupcoming
│➽ ${p}laligamatches
│➽ ${p}laligastandings
│➽ ${p}laligascorers
│➽ ${p}laligaupcoming
│➽ ${p}bundesligamatches
│➽ ${p}bundesligastandings
│➽ ${p}bundesligascorers
│➽ ${p}bundesligaupcoming
│➽ ${p}serieamatches
│➽ ${p}serieastandings
│➽ ${p}serieascorers
│➽ ${p}serieaupcoming
│➽ ${p}ligue1matches
│➽ ${p}ligue1standings
│➽ ${p}ligue1scorers
│➽ ${p}ligue1upcoming
│➽ ${p}clmatches
│➽ ${p}clstandings
│➽ ${p}clscorers
│➽ ${p}clupcoming
│➽ ${p}wrestlingevents
│➽ ${p}wwenews
│➽ ${p}wweschedule
┗▣`

    const supportMenu =
`┏▣ ◈ *SUPPORT MENU* ◈
│➽ ${p}feedback <message>
│➽ ${p}helpers
┗▣`

    const toolsMenu =
`┏▣ ◈ *TOOLS MENU* ◈
│➽ ${p}browse <url>
│➽ ${p}calculate <expr>
│➽ ${p}device
│➽ ${p}emojimix
│➽ ${p}fancy <text>
│➽ ${p}fliptext <text>
│➽ ${p}genpass
│➽ ${p}getabout
│➽ ${p}getpp
│➽ ${p}gsmarena <phone>
│➽ ${p}obfuscate <text>
│➽ ${p}poll Q | A | B
│➽ ${p}qrcode <text>
│➽ ${p}say <text>
│➽ ${p}ssweb <url>
│➽ ${p}sticker
│➽ ${p}telesticker
│➽ ${p}tinyurl <url>
│➽ ${p}toimage
┗▣`

    const translateMenu =
`┏▣ ◈ *TRANSLATE MENU* ◈
│➽ ${p}translate <lang> <text>
│➽ ${p}translate2 <lang> <text>
┗▣
_Example: .translate fr Hello World_`

    const videoMenu =
`┏▣ ◈ *VIDEO MENU* ◈
│➽ ${p}toaudio
│➽ ${p}tovideo
│➽ ${p}volvideo
┗▣`

    const fullMenuText = [
        header, customMenu, aiMenu, audioMenu, downloadMenu, ephotoMenu,
        funMenu, gamesMenu, groupMenu, imageMenu, otherMenu,
        ownerMenu, religionMenu, searchMenu, settingsMenu,
        sportsMenu, supportMenu, toolsMenu, translateMenu, videoMenu
    ].join('\n\n')

    const bannerPath = path.join(__dirname, '../assets/banner.png')
    if (fs.existsSync(bannerPath)) {
        await sock.sendMessage(from, { image: fs.readFileSync(bannerPath), caption: fullMenuText }, { quoted: msg })
    } else {
        await sock.sendMessage(from, { text: fullMenuText }, { quoted: msg })
    }
}

module.exports = { sendMenu }
