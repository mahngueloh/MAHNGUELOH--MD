const config = require('./config')
const { getBody, getSender, getFrom, isGroup, isOwner, isPublicMode } = require('./lib/utils')

const { sendMenu }              = require('./plugins/menu')
const { makeSticker }           = require('./plugins/sticker')
const { handleGroupCmd, isBanned, handleGroupEvents } = require('./plugins/groupManagement')
const { antiLinkCheck, antiSpamCheck, antiStickerCheck, antiVoiceNoteCheck, antiBugCheck, antiGroupMentionCheck } = require('./plugins/antiSpam')
const { handleAdult } = require('./plugins/adult')
const { downloadMedia }         = require('./plugins/downloader')
const { aiReply }               = require('./plugins/aiChat')
const { handleOwnerCmd, badWords, ignoredNumbers } = require('./plugins/ownerCmds')
const { handleSports }          = require('./plugins/sports')
const { getBible, getQuran }    = require('./plugins/religion')
const { getLyrics, getIMDB, getYTS } = require('./plugins/search')
const { getWallpaper, getRemini } = require('./plugins/image')
const { handleCustomCmdBuilder, checkCustomCmd } = require('./plugins/customCmds')

const spamMap = new Map()

// ── Fun data ──────────────────────────────────────────────────────────────────
const facts = ["🌍 A day on Venus is longer than a year on Venus.","🐙 Octopuses have three hearts and blue blood.","🍯 Honey never expires — 3000-year-old honey was still edible.","🌙 The moon moves away from Earth at 3.8cm per year.","🐘 Elephants are the only animals that can't jump.","⚡ Lightning strikes Earth 100 times every second.","🧠 Your brain generates about 20 watts of electricity.","🦈 Sharks are older than trees.","🐝 Bees can recognise human faces.","🌊 The ocean covers 71% of Earth's surface."]
const jokes = ["😂 Why don't scientists trust atoms?\nBecause they make up everything!","😂 Why did the scarecrow win an award?\nBecause he was outstanding in his field!","😂 What do you call fake spaghetti?\nAn impasta!","😂 What do you call cheese that isn't yours?\nNacho cheese!","😂 I told my wife she should embrace her mistakes.\nShe gave me a hug.","😂 Why don't eggs tell jokes?\nThey'd crack each other up!"]
const quotes = ["💬 _\"The only way to do great work is to love what you do.\"_ — Steve Jobs","💬 _\"In the middle of every difficulty lies opportunity.\"_ — Albert Einstein","💬 _\"It does not matter how slowly you go as long as you do not stop.\"_ — Confucius","💬 _\"The future belongs to those who believe in the beauty of their dreams.\"_ — Eleanor Roosevelt","💬 _\"Success is not final, failure is not fatal.\"_ — Churchill"]
const memes  = ["😂 Me trying to sleep at 3am: *thinks about something embarrassing from 10 years ago*","😭 Brain at 2am: Remember when you said 'you too' when the waiter said 'enjoy your meal'?","💀 POV: You're studying but your phone exists","🤣 Nobody:\nAbsolutely nobody:\nMe at 3am: Let me reorganise my entire life","😂 Me: I'll just watch one YouTube video\nAlso me 4hrs later: 🤡"]
const trivia  = [{q:"What is the capital of Australia?",a:"Canberra"},{q:"How many bones in the human body?",a:"206"},{q:"Largest planet in our solar system?",a:"Jupiter"},{q:"WW2 ended in what year?",a:"1945"},{q:"Chemical symbol for gold?",a:"Au"},{q:"Fastest land animal?",a:"Cheetah"},{q:"Who painted the Mona Lisa?",a:"Leonardo da Vinci"}]
const truthQs = ["🤔 What is the most embarrassing thing you've ever done?","🤔 Have you ever lied to get out of trouble?","🤔 What's your biggest fear?","🤔 Have you ever had a crush on someone in this group?","🤔 What is your biggest regret?","🤔 Have you ever cheated on a test?"]
const dares   = ["🎯 Send a voice note singing any song!","🎯 Change your profile picture to a funny face for 1 hour!","🎯 Tag 3 people and say something nice about each!","🎯 Send the last photo in your gallery!","🎯 Write a poem about the person above you!","🎯 Call someone in the group right now!"]
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// Sports command list
const sportsCmds = new Set(['epl','eplmatches','eplstandings','eplscorers','eplupcoming','bundesliga','bundesligamatches','bundesligastandings','bundesligascorers','bundesligaupcoming','laliga','laligamatches','laligastandings','laligascorers','laligaupcoming','seriea','serieamatches','serieastandings','serieascorers','serieaupcoming','ligue1','ligue1matches','ligue1standings','ligue1scorers','ligue1upcoming','cl','clmatches','clstandings','clscorers','clupcoming','laligamatches','laligastandings','laligascorers','laligaupcoming','bundesligamatches','bundesligastandings','bundesligascorers','bundesligaupcoming','serieamatches','serieastandings','serieascorers','serieaupcoming','ligue1matches','ligue1standings','ligue1scorers','ligue1upcoming','clmatches','clstandings','clscorers','clupcoming','eflmatches','eflstandings','eflscorers','eflupcoming','elmatches','elstandings','elscorers','elupcoming','wcmatches','wcstandings','wcscorers','wcupcoming','wrestlingevents','wwenews','wweschedule'])

// Owner-only commands
const ownerOnlyCmds = new Set(['setbotname','setownername','setownernumber','setprefix','setbio','setprofilepic','restart','block','unblock','unblockall','listblocked','join','leave','groupid','hostip','disk','addsudo','delsudo','listsudo','addbadword','deletebadword','listbadword','addignorelist','delignorelist','listignorelist','warn','resetwarn','listwarn','delete','react','online','lastseen','alwaysonline','autoread','readreceipts','autotype','tostatus','toviewonce','vv2','deljunk','setgroupname','setdesc','resetlink','setppgroup','getgrouppp','modestatus','runeval','addcmd','delcmd','editcmd','listcmd','listcmds','mycmds','cmdinfo'])

// Commands available to everyone even in private mode
const alwaysPublic = new Set(['ping','ping2','menu','help','owner','fact','jokes','quote','quotes','truth','dare','truthordare','memes','trivia'])

async function handleMessage(sock, msg) {
    try {
        const body   = getBody(msg)
        const sender = getSender(msg)
        const from   = getFrom(msg)   // ← always clean JID, no :5 suffix
        const inGroup = isGroup(from)
        const owner  = isOwner(sender, config.ownerNumber)
        const publicMode = isPublicMode()
        const prefix = config.prefix

        // Block banned users
        if (isBanned(sender)) {
            try { await sock.sendMessage(from, { delete: msg.key }) } catch {}
            return
        }

        // Ignore ignored numbers
        if (!owner && ignoredNumbers.includes(sender.replace('@s.whatsapp.net','').replace(/[^0-9]/g,''))) return

        // Mark as read
        if (config.readReceipts) { try { await sock.readMessages([msg.key]) } catch {} }

        // ── Group protection ────────────────────────────────────────────────
        if (inGroup) {
            if (await antiBugCheck(sock, msg, from, sender, owner)) return
            if (await antiLinkCheck(sock, msg, from, sender, owner)) return
            if (await antiStickerCheck(sock, msg, from, sender, owner)) return
            if (await antiVoiceNoteCheck(sock, msg, from, sender, owner)) return
            if (await antiGroupMentionCheck(sock, msg, from, sender, owner)) return
            if (await antiSpamCheck(sock, msg, from, sender, spamMap)) return
            // Bad word filter
            if (body && badWords.length) {
                const lb = body.toLowerCase()
                if (badWords.some(w => lb.includes(w))) {
                    try { await sock.sendMessage(from, { delete: msg.key }) } catch {}
                    await sock.sendMessage(from, { text: `⚠️ @${sender.split('@')[0]} Bad language is not allowed!`, mentions: [sender] })
                    return
                }
            }
        }

        if (!body) return

        const isCmd = body.startsWith(prefix)
        const cmd   = isCmd ? body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase() : ''
        const args  = isCmd ? body.slice(prefix.length + cmd.length).trim().split(/\s+/) : []
        const q     = args.join(' ').trim()

        // ── Non-command: AI auto-reply in DM ────────────────────────────────
        if (!isCmd) {
            if (!inGroup && config.aiEnabled && (owner || publicMode)) {
                try { await sock.sendPresenceUpdate('composing', from) } catch {}
                await aiReply(sock, from, body, msg)
            }
            return
        }

        // ── Check custom commands ───────────────────────────────────────────
        const customHandled = await checkCustomCmd(sock, from, cmd, msg, prefix)
        if (customHandled) return

        // ── Private mode guard ──────────────────────────────────────────────
        if (!publicMode && !owner && !alwaysPublic.has(cmd)) {
            return sock.sendMessage(from, { text: `🔒 *${config.botName}* is in *private mode*.\nOnly the owner can use commands.\n\nContact: wa.me/${config.ownerNumber}` }, { quoted: msg })
        }

        // ── Owner-only guard ────────────────────────────────────────────────
        if (ownerOnlyCmds.has(cmd) && !owner) {
            return sock.sendMessage(from, { text: `❌ This command is *owner only*.` }, { quoted: msg })
        }

        // ── Sports commands ─────────────────────────────────────────────────
        if (sportsCmds.has(cmd)) return handleSports(sock, from, cmd, msg)

        try { await sock.sendPresenceUpdate('composing', from) } catch {}

        switch (cmd) {

            // ══ MENU ════════════════════════════════════════════════════════
            case 'menu': case 'help':
                await sendMenu(sock, from, sender, msg); break

            // ══ PING ════════════════════════════════════════════════════════
            case 'ping': case 'ping2': {
                const start = Date.now()
                await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg })
                await sock.sendMessage(from, { text: `⚡ *Speed:* ${Date.now() - start}ms` }); break
            }

            // ══ OWNER INFO ══════════════════════════════════════════════════
            case 'owner':
                await sock.sendMessage(from, { text: `┏▣ ◈ *OWNER INFO* ◈\n┃ 👤 *${config.ownerName}*\n┃ 📱 wa.me/${config.ownerNumber}\n┗▣` }, { quoted: msg }); break

            // ══ MODE (owner only) ═══════════════════════════════════════════
            case 'mode': {
                if (!owner) return sock.sendMessage(from, { text: `❌ Owner only.` }, { quoted: msg })
                const newMode = q.toLowerCase()
                if (!['public','private'].includes(newMode)) {
                    return sock.sendMessage(from, { text: `❌ Usage: *${prefix}mode public* OR *${prefix}mode private*\n\nCurrent mode: *${config.mode || 'public'}*` }, { quoted: msg })
                }
                config.mode = newMode
                await sock.sendMessage(from, {
                    text: `✅ Mode changed to *${newMode.toUpperCase()}*\n\n${newMode === 'private' ? '🔒 Only you can use commands now.' : '🌐 Everyone can use commands now.'}`
                }, { quoted: msg }); break
            }
            case 'modestatus':
                await sock.sendMessage(from, { text: `📊 *Bot Mode:* ${(config.mode || 'public').toUpperCase()}` }, { quoted: msg }); break

            // ══ CHATBOT TOGGLE ═══════════════════════════════════════════════
            case 'chatbot': {
                if (!owner) return sock.sendMessage(from, { text: `❌ Owner only.` }, { quoted: msg })
                config.aiEnabled = !config.aiEnabled
                await sock.sendMessage(from, {
                    text: `🤖 *AI Auto-reply in DMs:* ${config.aiEnabled ? '*✅ ON*' : '*❌ OFF*'}\n${config.aiEnabled ? 'Bot will reply to all DMs.' : 'Bot will NOT auto-reply.\nCommands like .ai still work.'}`
                }, { quoted: msg }); break
            }

            // ══ RUNTIME / STATUS ════════════════════════════════════════════
            case 'runtime': case 'botstatus': {
                const up = process.uptime()
                const h = Math.floor(up/3600), m = Math.floor((up%3600)/60), s = Math.floor(up%60)
                await sock.sendMessage(from, { text: `┏▣ ◈ *BOT STATUS* ◈\n┃ ⏱ Uptime: ${h}h ${m}m ${s}s\n┃ 🌐 Mode: ${config.mode || 'public'}\n┃ 🤖 AI: ${config.aiEnabled ? 'ON' : 'OFF'}\n┃ ⚡ Prefix: ${prefix}\n┗▣` }, { quoted: msg }); break
            }
            case 'time': {
                const now = new Date()
                await sock.sendMessage(from, { text: `🕐 *Time:*\n${now.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}` }, { quoted: msg }); break
            }
            case 'repo':
                await sock.sendMessage(from, { text: `┏▣ ◈ *BOT INFO* ◈\n┃ 📦 ${config.botName} v1.0.0\n┃ 👤 Owner: ${config.ownerName}\n┗▣` }, { quoted: msg }); break
            case 'pair':
                await sock.sendMessage(from, { text: `🔗 Delete *auth_info* folder and restart to re-pair.` }, { quoted: msg }); break

            // ══ STICKER ═════════════════════════════════════════════════════
            case 'sticker': case 's': case 'take': case 'telesticker':
                await makeSticker(sock, msg, from, q); break

            case 'toimage': {
                const qmsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
                if (!qmsg?.stickerMessage) return sock.sendMessage(from, { text: `❌ Reply to a sticker with *${prefix}toimage*` }, { quoted: msg })
                const { downloadMediaMessage } = require('@whiskeysockets/baileys')
                const buf = await downloadMediaMessage({ message: qmsg, key: msg.key }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
                await sock.sendMessage(from, { image: buf, caption: '✅ Here is your image!' }, { quoted: msg }); break
            }

            // ══ GROUP MANAGEMENT ════════════════════════════════════════════
            case 'kick': case 'add': case 'promote': case 'demote':
            case 'mute': case 'unmute': case 'kickall': case 'kick_all':
            case 'ban': case 'unban':
            case 'antilink': case 'antispam': case 'antisticker':
            case 'antivoicenote': case 'antibug': case 'antiremove':
            case 'antibadword': case 'antibot': case 'antidemote':
            case 'antiforeign': case 'antigroupmention': case 'antilinkgc':
            case 'antitag': case 'antitagadmin': case 'hijack':
            case 'welcome': case 'goodbye': case 'getsettings':
            case 'announcements': case 'open': case 'close': case 'debugadmin':
                if (!inGroup) return sock.sendMessage(from, { text: '❌ This command works in groups only.' }, { quoted: msg })
                await handleGroupCmd(sock, msg, from, sender, cmd, args, owner); break

            // ══ TAG ═════════════════════════════════════════════════════════
            case 'tagall': case 'tag': case 'mediatag': {
                if (!inGroup) return sock.sendMessage(from, { text: '❌ Groups only.' }, { quoted: msg })
                const meta = await sock.groupMetadata(from)
                const members = meta.participants.map(p => p.id)
                await sock.sendMessage(from, { text: (q||'📢 Attention!')+'\n\n'+members.map(m=>`@${m.split('@')[0]}`).join(' '), mentions: members }); break
            }
            case 'tagadmin': {
                if (!inGroup) return sock.sendMessage(from, { text: '❌ Groups only.' }, { quoted: msg })
                const meta = await sock.groupMetadata(from)
                const admins = meta.participants.filter(p=>p.admin).map(p=>p.id)
                await sock.sendMessage(from, { text: (q||'📢 Admin!')+'\n\n'+admins.map(a=>`@${a.split('@')[0]}`).join(' '), mentions: admins }); break
            }
            case 'hidetag': {
                if (!inGroup) return sock.sendMessage(from, { text: '❌ Groups only.' }, { quoted: msg })
                const meta = await sock.groupMetadata(from)
                await sock.sendMessage(from, { text: q||'📢', mentions: meta.participants.map(p=>p.id) }); break
            }
            case 'admins': case 'admin': {
                if (!inGroup) return sock.sendMessage(from, { text: '❌ Groups only.' }, { quoted: msg })
                const meta = await sock.groupMetadata(from)
                const admins = meta.participants.filter(p=>p.admin)
                await sock.sendMessage(from, { text: `┏▣ ◈ *ADMINS* ◈\n${admins.map(a=>`┃ 👑 @${a.id.split('@')[0]}`).join('\n')}\n┗▣`, mentions: admins.map(a=>a.id) }, { quoted: msg }); break
            }
            case 'invite': case 'link': {
                if (!inGroup) return sock.sendMessage(from, { text: '❌ Groups only.' }, { quoted: msg })
                const code = await sock.groupInviteCode(from)
                await sock.sendMessage(from, { text: `🔗 https://chat.whatsapp.com/${code}` }, { quoted: msg }); break
            }
            case 'totalmembers': {
                if (!inGroup) return sock.sendMessage(from, { text: '❌ Groups only.' }, { quoted: msg })
                const meta = await sock.groupMetadata(from)
                await sock.sendMessage(from, { text: `👥 *Total Members:* ${meta.participants.length}` }, { quoted: msg }); break
            }
            case 'userid':
                await sock.sendMessage(from, { text: `🆔 *Your JID:*\n${sender}` }, { quoted: msg }); break

            // ══ DOWNLOADS ═══════════════════════════════════════════════════
            case 'play': case 'yt': case 'ytmp3': case 'ytmp4':
            case 'tiktok': case 'tt': case 'ig': case 'instagram':
            case 'facebook': case 'twitter': case 'video': case 'song':
            case 'song2': case 'download': case 'tiktokaudio':
            case 'tomp3': case 'toaudio': case 'tovideo': case 'xvideo':
            case 'videodoc': case 'apk':
                await downloadMedia(sock, from, cmd, q, msg); break

            // ══ AI ══════════════════════════════════════════════════════════
            case 'ai': case 'ask': case 'gpt': case 'gemini': case 'deepseek':
            case 'blackbox': case 'analyze': case 'code': case 'programming':
            case 'story': case 'summarize': case 'teach': case 'generate':
            case 'recipe': case 'doppleai': case 'dalle':
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}${cmd}* <your question>` }, { quoted: msg })
                await aiReply(sock, from, q, msg); break

            // ══ TRANSLATE ═══════════════════════════════════════════════════
            case 'translate': case 'translate2': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}translate* <lang> <text>\nExample: *${prefix}translate* fr Hello` }, { quoted: msg })
                const parts = q.split(' '), lang = parts[0], text = parts.slice(1).join(' ')
                if (!text) return sock.sendMessage(from, { text: `❌ Provide text after the language code.` }, { quoted: msg })
                try {
                    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`)
                    const data = await res.json()
                    await sock.sendMessage(from, { text: `🌐 *Translation (${lang}):*\n${data[0].map(x=>x[0]).join('')}` }, { quoted: msg })
                } catch { await sock.sendMessage(from, { text: '❌ Translation failed.' }, { quoted: msg }) }
                break
            }

            // ══ SEARCH ══════════════════════════════════════════════════════
            case 'weather': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}weather* <city>` }, { quoted: msg })
                try {
                    const res = await fetch(`https://wttr.in/${encodeURIComponent(q)}?format=3`)
                    await sock.sendMessage(from, { text: `🌤 *Weather:*\n${await res.text()}` }, { quoted: msg })
                } catch { await sock.sendMessage(from, { text: '❌ Could not fetch weather.' }, { quoted: msg }) }
                break
            }
            case 'define': case 'define2': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}define* <word>` }, { quoted: msg })
                try {
                    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`)
                    const data = await res.json()
                    if (data.title) return sock.sendMessage(from, { text: `❌ Not found: *${q}*` }, { quoted: msg })
                    const e=data[0], m=e.meanings[0], d=m.definitions[0]
                    await sock.sendMessage(from, { text: `📖 *${e.word}* (${m.partOfSpeech})\n${d.definition}${d.example?'\n💬 _'+d.example+'_':''}` }, { quoted: msg })
                } catch { await sock.sendMessage(from, { text: '❌ Could not fetch.' }, { quoted: msg }) }
                break
            }
            case 'lyrics': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}lyrics* <song name>` }, { quoted: msg })
                await sock.sendMessage(from, { text: await getLyrics(q) }, { quoted: msg }); break
            }
            case 'imdb': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}imdb* <movie name>` }, { quoted: msg })
                await sock.sendMessage(from, { text: await getIMDB(q) }, { quoted: msg }); break
            }
            case 'yts': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}yts* <movie name>` }, { quoted: msg })
                await sock.sendMessage(from, { text: await getYTS(q) }, { quoted: msg }); break
            }
            case 'shazam':
                await sock.sendMessage(from, { text: `🎵 *Shazam*\nFor song ID: https://www.shazam.com` }, { quoted: msg }); break

            // ══ RELIGION ════════════════════════════════════════════════════
            case 'bible':
                await sock.sendMessage(from, { text: await getBible(q) }, { quoted: msg }); break
            case 'quran':
                await sock.sendMessage(from, { text: await getQuran(q) }, { quoted: msg }); break

            // ══ IMAGE ════════════════════════════════════════════════════════
            case 'wallpaper': case 'image':
                await getWallpaper(sock, from, q, msg); break
            case 'remini':
                await getRemini(sock, from, msg); break

            // ══ TOOLS ═══════════════════════════════════════════════════════
            case 'calculate': case 'calc': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}calculate* 25*4` }, { quoted: msg })
                try {
                    const safe = q.replace(/[^0-9+\-*/().\s]/g, '')
                    await sock.sendMessage(from, { text: `🧮 *${q}* = *${Function('"use strict";return('+safe+')')()}*` }, { quoted: msg })
                } catch { await sock.sendMessage(from, { text: '❌ Invalid expression.' }, { quoted: msg }) }
                break
            }
            case 'tinyurl': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}tinyurl* <url>` }, { quoted: msg })
                try {
                    const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`)
                    await sock.sendMessage(from, { text: `🔗 ${await r.text()}` }, { quoted: msg })
                } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: msg }) }
                break
            }
            case 'qrcode': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}qrcode* <text>` }, { quoted: msg })
                await sock.sendMessage(from, { image: { url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(q)}` }, caption: `✅ QR Code` }, { quoted: msg }); break
            }
            case 'fancy': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}fancy* <text>` }, { quoted: msg })
                const bold = q.split('').map(c=>{const code=c.codePointAt(0);if(code>=65&&code<=90)return String.fromCodePoint(code+119743);if(code>=97&&code<=122)return String.fromCodePoint(code+119737);if(code>=48&&code<=57)return String.fromCodePoint(code+120764);return c}).join('')
                await sock.sendMessage(from, { text: `✨ ${bold}` }, { quoted: msg }); break
            }
            case 'genpass': {
                const len = Math.min(parseInt(q)||12, 32)
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
                await sock.sendMessage(from, { text: `🔐 \`${Array.from({length:len},()=>chars[Math.floor(Math.random()*chars.length)]).join('')}\`` }, { quoted: msg }); break
            }
            case 'say': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}say* <text>` }, { quoted: msg })
                await sock.sendMessage(from, { text: `📢 ${q}` }); break
            }
            case 'fliptext': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}fliptext* <text>` }, { quoted: msg })
                await sock.sendMessage(from, { text: `🔄 ${q.split('').reverse().join('')}` }, { quoted: msg }); break
            }
            case 'obfuscate': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}obfuscate* <text>` }, { quoted: msg })
                await sock.sendMessage(from, { text: `🔤 ${q.split('').map(c=>Math.random()>.5?c.toUpperCase():c.toLowerCase()).join('')}` }, { quoted: msg }); break
            }
            case 'ssweb': case 'sswebpc': case 'sswebtab': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}ssweb* <url>` }, { quoted: msg })
                const url = q.startsWith('http') ? q : 'https://'+q
                await sock.sendMessage(from, { image: { url: `https://api.screenshotmachine.com?key=demo&url=${encodeURIComponent(url)}&dimension=1366x768` }, caption: `📸 ${url}` }, { quoted: msg }); break
            }
            case 'gsmarena': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}gsmarena* <phone model>` }, { quoted: msg })
                await sock.sendMessage(from, { text: `📱 Search: https://www.gsmarena.com/search.php3?sQuickSearch=${encodeURIComponent(q)}` }, { quoted: msg }); break
            }
            case 'getpp': {
                const target = q ? q.replace(/[^0-9]/g,'')+'@s.whatsapp.net' : sender
                try {
                    const url = await sock.profilePictureUrl(target, 'image')
                    await sock.sendMessage(from, { image: { url }, caption: `📸 Profile picture` }, { quoted: msg })
                } catch { await sock.sendMessage(from, { text: `❌ No profile picture found.` }, { quoted: msg }) }
                break
            }
            case 'getabout': {
                const target = q ? q.replace(/[^0-9]/g,'')+'@s.whatsapp.net' : sender
                try {
                    const s = await sock.fetchStatus(target)
                    await sock.sendMessage(from, { text: `📝 *About:*\n${s?.status || 'No status.'}` }, { quoted: msg })
                } catch { await sock.sendMessage(from, { text: `❌ Could not fetch.` }, { quoted: msg }) }
                break
            }
            case 'poll': {
                if (!q || !q.includes('|')) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}poll* Question | Option1 | Option2` }, { quoted: msg })
                const parts = q.split('|').map(s=>s.trim())
                if (parts.length < 3) return sock.sendMessage(from, { text: `❌ Need question + at least 2 options.` }, { quoted: msg })
                await sock.sendMessage(from, { poll: { name: parts[0], values: parts.slice(1), selectableCount: 1 } }); break
            }
            case 'emojimix': {
                const em = q.split(' ')
                await sock.sendMessage(from, { text: em.length >= 2 ? `${em[0]}+${em[1]} = ${em[0]}${em[1]}✨` : `❌ Usage: *${prefix}emojimix* 😀 😂` }, { quoted: msg }); break
            }
            case 'tinyurl2': case 'tourl': case 'browse': {
                if (!q) return sock.sendMessage(from, { text: `❌ Provide a URL.` }, { quoted: msg })
                await sock.sendMessage(from, { text: `🌐 ${q.startsWith('http')?q:'https://'+q}` }, { quoted: msg }); break
            }
            case 'device': {
                const os = require('os')
                await sock.sendMessage(from, { text: `📱 *Device Info:*\nPlatform: ${os.platform()}\nArch: ${os.arch()}\nNode: ${process.version}\nUptime: ${Math.floor(process.uptime()/3600)}h` }, { quoted: msg }); break
            }
            case 'runeval': {
                if (!owner) return sock.sendMessage(from, { text: `❌ Owner only.` }, { quoted: msg })
                try { await sock.sendMessage(from, { text: `✅ ${JSON.stringify(eval(q),null,2)}` }, { quoted: msg }) }
                catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }) }
                break
            }

            // ══ FUN ═════════════════════════════════════════════════════════
            case 'fact':       await sock.sendMessage(from, { text: rand(facts) }, { quoted: msg }); break
            case 'jokes': case 'joke': await sock.sendMessage(from, { text: rand(jokes) }, { quoted: msg }); break
            case 'quotes': case 'quote': await sock.sendMessage(from, { text: rand(quotes) }, { quoted: msg }); break
            case 'memes': {
                try {
                    const res = await fetch('https://meme-api.com/gimme')
                    const data = await res.json()
                    await sock.sendMessage(from, { image: { url: data.url }, caption: `😂 ${data.title}` }, { quoted: msg })
                } catch { await sock.sendMessage(from, { text: rand(memes) }, { quoted: msg }) }
                break
            }
            case 'trivia': {
                const t = rand(trivia)
                await sock.sendMessage(from, { text: `🧠 *TRIVIA:*\n\n${t.q}\n\n||Answer: ${t.a}||` }, { quoted: msg }); break
            }
            case 'xxqc': case 'truthdetector': {
                const r = ['✅ TRUE','❌ FALSE','🤔 MAYBE','⚠️ DOUBTFUL','💯 ABSOLUTELY TRUE','🚫 DEFINITELY FALSE']
                await sock.sendMessage(from, { text: `🔍 *Truth Detector:*\n\n"${q||'Your statement'}"\n\nResult: *${rand(r)}*` }, { quoted: msg }); break
            }
            case 'truth':      await sock.sendMessage(from, { text: `🎯 *Truth:*\n\n${rand(truthQs)}` }, { quoted: msg }); break
            case 'dare':       await sock.sendMessage(from, { text: `🎯 *Dare:*\n\n${rand(dares)}` }, { quoted: msg }); break
            case 'truthordare': await sock.sendMessage(from, { text: Math.random()>.5?`🎯 *TRUTH:*\n\n${rand(truthQs)}`:`🎯 *DARE:*\n\n${rand(dares)}` }, { quoted: msg }); break

            // ══ SUPPORT ══════════════════════════════════════════════════════
            case 'feedback': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}feedback* <your message>` }, { quoted: msg })
                const ownerJid = config.ownerNumber + '@s.whatsapp.net'
                await sock.sendMessage(ownerJid, { text: `📬 *Feedback from* ${sender.split('@')[0]}:\n\n${q}` })
                await sock.sendMessage(from, { text: `✅ Feedback sent to owner!` }, { quoted: msg }); break
            }
            case 'helpers':
                await sock.sendMessage(from, { text: `┏▣ ◈ *SUPPORT* ◈\n┃ 📱 wa.me/${config.ownerNumber}\n┃ ⚡ Prefix: ${prefix}\n┃ Type ${prefix}menu for help\n┗▣` }, { quoted: msg }); break

            // ══ AUDIO/VIDEO EFFECTS ══════════════════════════════════════════
            case 'bass': case 'blown': case 'deep': case 'earrape':
            case 'reverse': case 'robot': case 'toptt': case 'volaudio': case 'volvideo':
                await sock.sendMessage(from, { text: `🎵 Audio effects coming soon!\n_Reply to an audio file with this command._` }, { quoted: msg }); break

            // ══ EPHOTO360 ════════════════════════════════════════════════════
            case '1917style': case 'advancedglow': case 'blackpinklogo': case 'blackpinkstyle':
            case 'cartoonstyle': case 'deletingtext': case 'dragonball': case 'effectclouds':
            case 'flag3dtext': case 'flagtext': case 'freecreate': case 'galaxystyle':
            case 'galaxywallpaper': case 'glitchtext': case 'glowingtext': case 'gradienttext':
            case 'graffiti': case 'incandescent': case 'lighteffects': case 'logomaker':
            case 'luxurygold': case 'makingneon': case 'matrix': case 'multicoloredneon':
            case 'neonglitch': case 'papercutstyle': case 'pixelglitch': case 'royaltext':
            case 'sand': case 'summerbeach': case 'topography': case 'typography':
            case 'watercolortext': case 'writetext': {
                if (!q) return sock.sendMessage(from, { text: `❌ Usage: *${prefix}${cmd}* <your text>` }, { quoted: msg })
                await sock.sendMessage(from, { text: `🎨 *${cmd}*\n\nFor: "${q}"\n\nVisit: https://en.ephoto360.com for manual creation.\n_Auto image effects coming soon._` }, { quoted: msg }); break
            }

            // ══ OWNER COMMANDS ═══════════════════════════════════════════════
            case 'setbotname': case 'setownername': case 'setownernumber': case 'setprefix':
            case 'setbio': case 'setprofilepic': case 'restart': case 'block': case 'unblock':
            case 'unblockall': case 'listblocked': case 'join': case 'leave': case 'groupid':
            case 'hostip': case 'disk': case 'addsudo': case 'delsudo': case 'listsudo':
            case 'addbadword': case 'deletebadword': case 'listbadword':
            case 'addignorelist': case 'delignorelist': case 'listignorelist':
            case 'warn': case 'resetwarn': case 'listwarn':
            case 'delete': case 'react': case 'online': case 'lastseen': case 'alwaysonline':
            case 'autoread': case 'readreceipts': case 'autotype':
            case 'tostatus': case 'toviewonce': case 'vv2': case 'deljunk':
            case 'setgroupname': case 'setdesc': case 'resetlink': case 'setppgroup':
            case 'getgrouppp': case 'fliptext2': case 'ssweb2': case 'userid':
            case 'autosavestatus': case 'autoviewstatus': case 'autoreactstatus':
            case 'autoread': case 'autotype': case 'alwaysonline': case 'anticall':
            case 'antibug': case 'antidelete': case 'antiedit': case 'antiviewonce':
            case 'autobio': case 'autoblock': case 'autoreact': case 'autorecord':
            case 'autorecordtyping': case 'statusdelay': case 'statussettings':
            case 'setwatermark': case 'setfont': case 'setcontextlink': case 'setstatusemoji':
            case 'setstickerauthor': case 'setstickerpackname': case 'settimezone':
            case 'setmenu': case 'setmenuimage': case 'setwelcome': case 'setgoodbye':
            case 'showwelcome': case 'showgoodbye': case 'testwelcome': case 'testgoodbye':
            case 'delwelcome': case 'delgoodbye': case 'resetsetting':
            case 'setanticallmsg': case 'showanticallmsg': case 'delanticallmsg': case 'testanticallmsg':
            case 'addcountrycode': case 'delcountrycode': case 'listcountrycode':
            case 'aza': case 'resetaza': case 'setaza': case 'ppprivacy': case 'gcaddprivacy': case 'dlvo': case 'update':
                await handleOwnerCmd(sock, from, cmd, args, q, msg, sender); break

            // ══ CUSTOM CMD BUILDER ═══════════════════════════════════════════
            case 'addcmd': case 'delcmd': case 'listcmd': case 'listcmds':
            case 'mycmds': case 'editcmd': case 'cmdinfo':
                await handleCustomCmdBuilder(sock, from, cmd, q, msg, prefix); break

            // ══ ADULT / NSFW ═════════════════════════════════════════════════
            case 'naughty': case 'hentai': case 'lewdwaifu': case 'nsfw':
            case 'rule34': case 'danbooru': case 'xbooru': case 'lewdanime':
                await handleAdult(sock, from, cmd, q, msg); break

            // ══ VIEW-ONCE REVEAL ═════════════════════════════════════════════
            case 'vv': case 'reveal': {
                const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
                if (!quoted) return sock.sendMessage(from, { text: `❌ Reply to a view-once image/video with *${prefix}vv*` }, { quoted: msg })
                const voMsg = quoted.viewOnceMessage?.message || quoted.viewOnceMessageV2?.message?.viewOnceMessage?.message || quoted
                try {
                    const { downloadMediaMessage } = require('@whiskeysockets/baileys')
                    const buf = await downloadMediaMessage({ message: voMsg, key: msg.key }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
                    if (voMsg.imageMessage) await sock.sendMessage(from, { image: buf, caption: '👁️ *View-once revealed!*' }, { quoted: msg })
                    else if (voMsg.videoMessage) await sock.sendMessage(from, { video: buf, caption: '👁️ *View-once revealed!*' }, { quoted: msg })
                    else await sock.sendMessage(from, { text: `❌ Reply to a view-once image or video.` }, { quoted: msg })
                } catch (e) { await sock.sendMessage(from, { text: `❌ Could not reveal: ${e.message}` }, { quoted: msg }) }
                break
            }

            // ══ DEFAULT ══════════════════════════════════════════════════════
            default:
                await sock.sendMessage(from, { text: `❓ Unknown command *${prefix}${cmd}*\nType *${prefix}menu* to see all commands.` }, { quoted: msg })
        }

    } catch (err) {
        console.error('Handler error:', err.message)
    }
}

module.exports = { handleMessage }
