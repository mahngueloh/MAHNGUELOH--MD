const config = require('../config')
const os = require('os')

const runtimeSettings = {
    alwaysonline:       false,
    autoread:           false,
    autotype:           false,
    autorecord:         false,
    autorecordtyping:   false,
    antibug:            false,
    anticall:           false,
    antidelete:         false,
    antiedit:           false,
    antiviewonce:       false,
    autoblock:          false,
    autoreact:          false,
    autoreactstatus:    false,
    autoviewstatus:     false,
    autosavestatus:     false,
    statusdelay:        3,
    lastseen:           true,
    online:             true,
    autobio:            null,
}

const STATUS_EMOJIS = ['❤️','🔥','😍','👏','😂','😮','😢','🙏','🎉','💯']

const sudoList    = [...(config.sudoNumbers || [])]
const badWords    = []
const ignoredNumbers = []
const warnMap     = new Map()

async function handleOwnerCmd(sock, from, cmd, args, q, msg, sender) {
    switch (cmd) {

        case 'setbotname': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setbotname <name>` }, { quoted: msg })
            config.botName = q
            await sock.sendMessage(from, { text: `✅ Bot name → *${q}*` }, { quoted: msg }); break
        }
        case 'setownername': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setownername <name>` }, { quoted: msg })
            config.ownerName = q
            await sock.sendMessage(from, { text: `✅ Owner name → *${q}*` }, { quoted: msg }); break
        }
        case 'setownernumber': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setownernumber <number>` }, { quoted: msg })
            config.ownerNumber = q.replace(/[^0-9]/g,'')
            await sock.sendMessage(from, { text: `✅ Owner number → *${config.ownerNumber}*` }, { quoted: msg }); break
        }
        case 'setprefix': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setprefix <char>` }, { quoted: msg })
            config.prefix = q[0]
            await sock.sendMessage(from, { text: `✅ Prefix → *${config.prefix}*` }, { quoted: msg }); break
        }

        case 'setbio': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setbio <text>` }, { quoted: msg })
            try { await sock.updateProfileStatus(q); await sock.sendMessage(from, { text: `✅ Bio updated.` }, { quoted: msg }) }
            catch { await sock.sendMessage(from, { text: `❌ Could not update bio.` }, { quoted: msg }) }
            break
        }
        case 'setprofilepic': {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted?.imageMessage) return sock.sendMessage(from, { text: `❌ Reply to an image.` }, { quoted: msg })
            try {
                const { downloadMediaMessage } = require('@whiskeysockets/baileys')
                const buf = await downloadMediaMessage({ message: quoted, key: msg.key }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
                await sock.updateProfilePicture(sock.user.id, buf)
                await sock.sendMessage(from, { text: `✅ Profile picture updated.` }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `❌ Could not update picture.` }, { quoted: msg }) }
            break
        }

        // ── Auto-status features ──────────────────────────────────────────
        case 'autoreactstatus': {
            runtimeSettings.autoreactstatus = !runtimeSettings.autoreactstatus
            await sock.sendMessage(from, {
                text: `${runtimeSettings.autoreactstatus ? '✅' : '❌'} Auto-react to status: *${runtimeSettings.autoreactstatus ? 'ON' : 'OFF'}*\n_Bot will ${runtimeSettings.autoreactstatus ? 'now' : 'no longer'} react to status updates with random emojis._`
            }, { quoted: msg }); break
        }
        case 'autoviewstatus': {
            runtimeSettings.autoviewstatus = !runtimeSettings.autoviewstatus
            await sock.sendMessage(from, {
                text: `${runtimeSettings.autoviewstatus ? '✅' : '❌'} Auto-view status: *${runtimeSettings.autoviewstatus ? 'ON' : 'OFF'}*\n_Bot will ${runtimeSettings.autoviewstatus ? 'now' : 'no longer'} automatically view all status updates._`
            }, { quoted: msg }); break
        }
        case 'autosavestatus': {
            runtimeSettings.autosavestatus = !runtimeSettings.autosavestatus
            await sock.sendMessage(from, {
                text: `${runtimeSettings.autosavestatus ? '✅' : '❌'} Auto-save status: *${runtimeSettings.autosavestatus ? 'ON' : 'OFF'}*\n_Bot will ${runtimeSettings.autosavestatus ? 'now' : 'no longer'} forward status media to your DM._`
            }, { quoted: msg }); break
        }

        case 'modestatus': {
            await sock.sendMessage(from, {
                text: `╔══〔 ⚙️ *BOT STATUS* 〕\n║  🌐 Mode: *${(config.mode||'public').toUpperCase()}*\n║  🤖 AI: *${config.aiEnabled !== false ? 'ON' : 'OFF'}*\n║  👁️ Auto-view status: *${runtimeSettings.autoviewstatus ? 'ON' : 'OFF'}*\n║  ❤️ Auto-react status: *${runtimeSettings.autoreactstatus ? 'ON' : 'OFF'}*\n║  💾 Auto-save status: *${runtimeSettings.autosavestatus ? 'ON' : 'OFF'}*\n║  🟢 Always online: *${runtimeSettings.alwaysonline ? 'ON' : 'OFF'}*\n║  📖 Auto-read: *${runtimeSettings.autoread ? 'ON' : 'OFF'}*\n╚══════════════════`
            }, { quoted: msg }); break
        }

        case 'alwaysonline': {
            runtimeSettings.alwaysonline = !runtimeSettings.alwaysonline
            await sock.sendMessage(from, { text: `✅ Always online: *${runtimeSettings.alwaysonline ? 'ON' : 'OFF'}*` }, { quoted: msg }); break
        }
        case 'autoread': {
            runtimeSettings.autoread = !runtimeSettings.autoread
            config.readReceipts = runtimeSettings.autoread
            await sock.sendMessage(from, { text: `✅ Auto-read: *${runtimeSettings.autoread ? 'ON' : 'OFF'}*` }, { quoted: msg }); break
        }
        case 'autotype': {
            runtimeSettings.autotype = !runtimeSettings.autotype
            await sock.sendMessage(from, { text: `✅ Typing indicator: *${runtimeSettings.autotype ? 'ON' : 'OFF'}*` }, { quoted: msg }); break
        }

        case 'block': {
            const targets = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
            const num = q.replace(/[^0-9]/g,'')
            const list = targets.length ? targets : (num ? [num+'@s.whatsapp.net'] : [])
            if (!list.length) return sock.sendMessage(from, { text: `❌ Usage: .block @user or .block 254712345678` }, { quoted: msg })
            for (const t of list) await sock.updateBlockStatus(t, 'block')
            await sock.sendMessage(from, { text: `✅ Blocked ${list.length} user(s).` }, { quoted: msg }); break
        }
        case 'unblock': {
            const targets = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
            const num = q.replace(/[^0-9]/g,'')
            const list = targets.length ? targets : (num ? [num+'@s.whatsapp.net'] : [])
            if (!list.length) return sock.sendMessage(from, { text: `❌ Usage: .unblock @user` }, { quoted: msg })
            for (const t of list) await sock.updateBlockStatus(t, 'unblock')
            await sock.sendMessage(from, { text: `✅ Unblocked ${list.length} user(s).` }, { quoted: msg }); break
        }
        case 'unblockall': {
            try {
                const list = await sock.fetchBlocklist()
                for (const t of list) await sock.updateBlockStatus(t, 'unblock')
                await sock.sendMessage(from, { text: `✅ Unblocked ${list.length} users.` }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `❌ Failed.` }, { quoted: msg }) }
            break
        }
        case 'listblocked': {
            try {
                const list = await sock.fetchBlocklist()
                await sock.sendMessage(from, { text: `🚫 *Blocked (${list.length}):*\n${list.map(j=>`• ${j.split('@')[0]}`).join('\n') || 'None'}` }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `❌ Failed.` }, { quoted: msg }) }
            break
        }

        case 'delete': {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
            const quotedKey = msg.message?.extendedTextMessage?.contextInfo
            if (!quoted) return sock.sendMessage(from, { text: `❌ Reply to the message to delete.` }, { quoted: msg })
            try {
                await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: quotedKey.participant === sock.user.id, id: quotedKey.stanzaId, participant: quotedKey.participant } })
                await sock.sendMessage(from, { text: `✅ Deleted.` }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `❌ Could not delete.` }, { quoted: msg }) }
            break
        }
        case 'react': {
            const emoji = q || '❤️'
            const quotedKey = msg.message?.extendedTextMessage?.contextInfo
            if (!quotedKey) return sock.sendMessage(from, { text: `❌ Reply to a message with .react <emoji>` }, { quoted: msg })
            await sock.sendMessage(from, { react: { text: emoji, key: { remoteJid: from, id: quotedKey.stanzaId, participant: quotedKey.participant } } }); break
        }

        case 'join': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .join <invite link>` }, { quoted: msg })
            const code = q.split('chat.whatsapp.com/').pop().split('/').pop().trim()
            try { await sock.groupAcceptInvite(code); await sock.sendMessage(from, { text: `✅ Joined group.` }, { quoted: msg }) }
            catch { await sock.sendMessage(from, { text: `❌ Could not join. Invalid/expired link?` }, { quoted: msg }) }
            break
        }
        case 'leave': {
            if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: `❌ Must be in a group.` }, { quoted: msg })
            await sock.groupLeave(from); break
        }
        case 'groupid': {
            if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: `❌ Must be in a group.` }, { quoted: msg })
            await sock.sendMessage(from, { text: `🆔 *Group ID:*\n${from}` }, { quoted: msg }); break
        }

        case 'disk': {
            const { execSync } = require('child_process')
            try { await sock.sendMessage(from, { text: `💽 *Disk:*\n${execSync('df -h /').toString()}` }, { quoted: msg }) }
            catch { await sock.sendMessage(from, { text: `❌ Failed.` }, { quoted: msg }) }
            break
        }
        case 'hostip': {
            const { execSync } = require('child_process')
            try { await sock.sendMessage(from, { text: `🌐 *Host IP:*\n${execSync('curl -s ifconfig.me').toString()}` }, { quoted: msg }) }
            catch { await sock.sendMessage(from, { text: `❌ Failed.` }, { quoted: msg }) }
            break
        }
        case 'device': {
            await sock.sendMessage(from, {
                text: `📱 *Device Info*\n• Platform: ${os.platform()}\n• Arch: ${os.arch()}\n• Node: ${process.version}\n• Uptime: ${Math.floor(process.uptime()/3600)}h ${Math.floor((process.uptime()%3600)/60)}m`
            }, { quoted: msg }); break
        }
        case 'restart': {
            await sock.sendMessage(from, { text: `🔄 Restarting...` }, { quoted: msg })
            setTimeout(() => process.exit(0), 1000); break
        }
        case 'deljunk': {
            try {
                const fs = require('fs'), path = require('path')
                const tmp = path.join(__dirname, '../tmp')
                if (fs.existsSync(tmp)) {
                    const files = fs.readdirSync(tmp)
                    files.forEach(f => { try { fs.unlinkSync(path.join(tmp,f)) } catch {} })
                    await sock.sendMessage(from, { text: `✅ Cleared ${files.length} temp file(s).` }, { quoted: msg })
                } else { await sock.sendMessage(from, { text: `✅ No junk found.` }, { quoted: msg }) }
            } catch { await sock.sendMessage(from, { text: `❌ Failed.` }, { quoted: msg }) }
            break
        }

        case 'lastseen': {
            runtimeSettings.lastseen = !runtimeSettings.lastseen
            try {
                await sock.updateLastSeenPrivacy(runtimeSettings.lastseen ? 'all' : 'none')
                await sock.sendMessage(from, { text: `✅ Last seen: *${runtimeSettings.lastseen ? 'Visible' : 'Hidden'}*` }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `✅ Last seen toggled.` }, { quoted: msg }) }
            break
        }
        case 'online': {
            runtimeSettings.online = !runtimeSettings.online
            await sock.sendMessage(from, { text: `✅ Online status: *${runtimeSettings.online ? 'Visible' : 'Hidden'}*` }, { quoted: msg }); break
        }

        case 'getpp': {
            const target = q ? q.replace(/[^0-9]/g,'')+'@s.whatsapp.net' : sender
            try {
                const url = await sock.profilePictureUrl(target, 'image')
                await sock.sendMessage(from, { image: { url }, caption: `📸 Profile picture of ${target.split('@')[0]}` }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `❌ No profile picture.` }, { quoted: msg }) }
            break
        }
        case 'getgrouppp': {
            try {
                const url = await sock.profilePictureUrl(from, 'image')
                await sock.sendMessage(from, { image: { url }, caption: `📸 Group picture` }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `❌ No group picture.` }, { quoted: msg }) }
            break
        }
        case 'getabout': {
            const target = q ? q.replace(/[^0-9]/g,'')+'@s.whatsapp.net' : sender
            try {
                const s = await sock.fetchStatus(target)
                await sock.sendMessage(from, { text: `📝 *About:*\n${s?.status || 'No status set.'}` }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `❌ Could not fetch.` }, { quoted: msg }) }
            break
        }

        // ── Status posting ──────────────────────────────────────────────────
        case 'tostatus': {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted) return sock.sendMessage(from, { text: `❌ Reply to a message.` }, { quoted: msg })
            try {
                const { downloadMediaMessage } = require('@whiskeysockets/baileys')
                if (quoted.imageMessage) {
                    const buf = await downloadMediaMessage({ message: quoted, key: msg.key }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
                    await sock.sendMessage('status@broadcast', { image: buf, caption: quoted.imageMessage.caption || '' })
                } else if (quoted.videoMessage) {
                    const buf = await downloadMediaMessage({ message: quoted, key: msg.key }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
                    await sock.sendMessage('status@broadcast', { video: buf, caption: quoted.videoMessage.caption || '' })
                } else {
                    const text = quoted.conversation || quoted.extendedTextMessage?.text || ''
                    await sock.sendMessage('status@broadcast', { text })
                }
                await sock.sendMessage(from, { text: `✅ Posted to status!` }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `❌ Could not post.` }, { quoted: msg }) }
            break
        }
        case 'toviewonce': {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted?.imageMessage && !quoted?.videoMessage) return sock.sendMessage(from, { text: `❌ Reply to an image or video.` }, { quoted: msg })
            try {
                const { downloadMediaMessage } = require('@whiskeysockets/baileys')
                const buf = await downloadMediaMessage({ message: quoted, key: msg.key }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
                if (quoted.imageMessage) {
                    await sock.sendMessage(from, { image: buf, viewOnce: true, caption: '' }, { quoted: msg })
                } else {
                    await sock.sendMessage(from, { video: buf, viewOnce: true, caption: '' }, { quoted: msg })
                }
            } catch { await sock.sendMessage(from, { text: `❌ Failed.` }, { quoted: msg }) }
            break
        }
        case 'vv2': {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
            const voMsg = quoted?.viewOnceMessage?.message || quoted?.viewOnceMessageV2?.message?.viewOnceMessage?.message || quoted
            if (!voMsg) return sock.sendMessage(from, { text: `❌ Reply to a view-once.` }, { quoted: msg })
            try {
                const { downloadMediaMessage } = require('@whiskeysockets/baileys')
                const buf = await downloadMediaMessage({ message: voMsg, key: msg.key }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
                if (voMsg.imageMessage) await sock.sendMessage(from, { image: buf, caption: '👁️ View-once revealed!' }, { quoted: msg })
                else if (voMsg.videoMessage) await sock.sendMessage(from, { video: buf, caption: '👁️ View-once revealed!' }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `❌ Failed to reveal.` }, { quoted: msg }) }
            break
        }

        // ── Sudo / badwords / ignore ────────────────────────────────────────
        case 'addsudo': {
            const num = q.replace(/[^0-9]/g,'')
            if (!num) return sock.sendMessage(from, { text: `❌ Usage: .addsudo <number>` }, { quoted: msg })
            if (!sudoList.includes(num)) sudoList.push(num)
            await sock.sendMessage(from, { text: `✅ ${num} added to sudo.` }, { quoted: msg }); break
        }
        case 'delsudo': {
            const num = q.replace(/[^0-9]/g,'')
            const idx = sudoList.indexOf(num)
            if (idx === -1) return sock.sendMessage(from, { text: `❌ Not in sudo list.` }, { quoted: msg })
            sudoList.splice(idx, 1)
            await sock.sendMessage(from, { text: `✅ ${num} removed from sudo.` }, { quoted: msg }); break
        }
        case 'listsudo': {
            await sock.sendMessage(from, { text: `👑 *Sudo List (${sudoList.length}):*\n${sudoList.map(n=>`• ${n}`).join('\n') || 'None'}` }, { quoted: msg }); break
        }
        case 'addbadword': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .addbadword <word>` }, { quoted: msg })
            if (!badWords.includes(q.toLowerCase())) badWords.push(q.toLowerCase())
            await sock.sendMessage(from, { text: `✅ Added bad word: *${q}*` }, { quoted: msg }); break
        }
        case 'deletebadword': {
            const idx = badWords.indexOf(q.toLowerCase())
            if (idx === -1) return sock.sendMessage(from, { text: `❌ Word not found.` }, { quoted: msg })
            badWords.splice(idx, 1)
            await sock.sendMessage(from, { text: `✅ Removed: *${q}*` }, { quoted: msg }); break
        }
        case 'listbadword': {
            await sock.sendMessage(from, { text: `🚫 *Bad Words (${badWords.length}):*\n${badWords.join(', ') || 'None'}` }, { quoted: msg }); break
        }
        case 'addignorelist': {
            const num = q.replace(/[^0-9]/g,'')
            if (!ignoredNumbers.includes(num)) ignoredNumbers.push(num)
            await sock.sendMessage(from, { text: `✅ ${num} ignored.` }, { quoted: msg }); break
        }
        case 'delignorelist': {
            const num = q.replace(/[^0-9]/g,'')
            const idx = ignoredNumbers.indexOf(num)
            if (idx !== -1) ignoredNumbers.splice(idx, 1)
            await sock.sendMessage(from, { text: `✅ ${num} removed from ignore.` }, { quoted: msg }); break
        }
        case 'listignorelist': {
            await sock.sendMessage(from, { text: `🙈 *Ignored (${ignoredNumbers.length}):*\n${ignoredNumbers.join('\n') || 'None'}` }, { quoted: msg }); break
        }

        // ── Warn system ─────────────────────────────────────────────────────
        case 'warn': {
            const targets = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
            if (!targets.length) return sock.sendMessage(from, { text: `❌ Mention a user.` }, { quoted: msg })
            const t = targets[0], key = t
            const warns = (warnMap.get(key)||0) + 1
            warnMap.set(key, warns)
            await sock.sendMessage(from, {
                text: `⚠️ @${t.split('@')[0]} warned (*${warns}/3*)${warns >= 3 ? '\n🚫 Max warnings reached!' : ''}`,
                mentions: [t]
            }, { quoted: msg }); break
        }
        case 'resetwarn': {
            const targets = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
            if (!targets.length) return sock.sendMessage(from, { text: `❌ Mention a user.` }, { quoted: msg })
            warnMap.delete(targets[0])
            await sock.sendMessage(from, { text: `✅ Warnings reset for @${targets[0].split('@')[0]}`, mentions: [targets[0]] }, { quoted: msg }); break
        }
        case 'listwarn': {
            const list = [...warnMap.entries()].map(([j,c]) => `• ${j.split('@')[0]}: ${c}/3`)
            await sock.sendMessage(from, { text: `⚠️ *Warnings:*\n${list.join('\n') || 'None'}` }, { quoted: msg }); break
        }

        case 'setgroupname': {
            if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: `❌ Groups only.` }, { quoted: msg })
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setgroupname <name>` }, { quoted: msg })
            await sock.groupUpdateSubject(from, q)
            await sock.sendMessage(from, { text: `✅ Group name → *${q}*` }, { quoted: msg }); break
        }
        case 'setdesc': {
            if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: `❌ Groups only.` }, { quoted: msg })
            await sock.groupUpdateDescription(from, q || '')
            await sock.sendMessage(from, { text: `✅ Group description updated.` }, { quoted: msg }); break
        }
        case 'resetlink': {
            if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: `❌ Groups only.` }, { quoted: msg })
            await sock.groupRevokeInvite(from)
            await sock.sendMessage(from, { text: `✅ Group link reset.` }, { quoted: msg }); break
        }
        case 'setppgroup': {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted?.imageMessage) return sock.sendMessage(from, { text: `❌ Reply to an image.` }, { quoted: msg })
            try {
                const { downloadMediaMessage } = require('@whiskeysockets/baileys')
                const buf = await downloadMediaMessage({ message: quoted, key: msg.key }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
                await sock.updateProfilePicture(from, buf)
                await sock.sendMessage(from, { text: `✅ Group picture updated.` }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `❌ Failed.` }, { quoted: msg }) }
            break
        }
        case 'poll': {
            if (!q || !q.includes('|')) return sock.sendMessage(from, { text: `❌ Usage: .poll Question | Option1 | Option2 | Option3` }, { quoted: msg })
            const parts = q.split('|').map(s=>s.trim())
            if (parts.length < 3) return sock.sendMessage(from, { text: `❌ Need at least 2 options.` }, { quoted: msg })
            await sock.sendMessage(from, { poll: { name: parts[0], values: parts.slice(1), selectableCount: 1 } }); break
        }
        case 'dlvo': {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
            const voMsg = quoted?.viewOnceMessage?.message || quoted?.viewOnceMessageV2?.message?.viewOnceMessage?.message || quoted
            if (!voMsg) return sock.sendMessage(from, { text: `❌ Reply to a view-once.` }, { quoted: msg })
            try {
                const { downloadMediaMessage } = require('@whiskeysockets/baileys')
                const buf = await downloadMediaMessage({ message: voMsg, key: msg.key }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
                if (voMsg.imageMessage) await sock.sendMessage(from, { image: buf, caption: '✅ Saved!' }, { quoted: msg })
                else if (voMsg.videoMessage) await sock.sendMessage(from, { video: buf, caption: '✅ Saved!' }, { quoted: msg })
            } catch { await sock.sendMessage(from, { text: `❌ Failed.` }, { quoted: msg }) }
            break
        }

        case 'fliptext': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .fliptext <text>` }, { quoted: msg })
            await sock.sendMessage(from, { text: `🔄 ${q.split('').reverse().join('')}` }, { quoted: msg }); break
        }
        case 'obfuscate': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .obfuscate <text>` }, { quoted: msg })
            await sock.sendMessage(from, { text: `🔤 ${q.split('').map(c=>Math.random()>.5?c.toUpperCase():c.toLowerCase()).join('')}` }, { quoted: msg }); break
        }
        case 'ssweb': case 'sswebpc': case 'sswebtab': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .ssweb <url>` }, { quoted: msg })
            const url = q.startsWith('http') ? q : 'https://'+q
            await sock.sendMessage(from, { image: { url: `https://api.screenshotmachine.com?key=demo&url=${encodeURIComponent(url)}&dimension=1366x768` }, caption: `📸 ${url}` }, { quoted: msg }); break
        }

        case 'anticall': {
            runtimeSettings.anticall = !runtimeSettings.anticall
            await sock.sendMessage(from, { text: `${runtimeSettings.anticall ? '✅' : '❌'} Anti-call: *${runtimeSettings.anticall ? 'ON' : 'OFF'}*\n_Bot will ${runtimeSettings.anticall ? 'now reject' : 'no longer reject'} incoming calls._` }, { quoted: msg }); break
        }
        case 'antibug': {
            runtimeSettings.antibug = !runtimeSettings.antibug
            await sock.sendMessage(from, { text: `${runtimeSettings.antibug ? '✅' : '❌'} Anti-bug: *${runtimeSettings.antibug ? 'ON' : 'OFF'}*` }, { quoted: msg }); break
        }
        case 'antidelete': {
            runtimeSettings.antidelete = !runtimeSettings.antidelete
            await sock.sendMessage(from, { text: `${runtimeSettings.antidelete ? '✅' : '❌'} Anti-delete: *${runtimeSettings.antidelete ? 'ON' : 'OFF'}*` }, { quoted: msg }); break
        }
        case 'antiedit': {
            runtimeSettings.antiedit = !runtimeSettings.antiedit
            await sock.sendMessage(from, { text: `${runtimeSettings.antiedit ? '✅' : '❌'} Anti-edit: *${runtimeSettings.antiedit ? 'ON' : 'OFF'}*` }, { quoted: msg }); break
        }
        case 'antiviewonce': {
            runtimeSettings.antiviewonce = !runtimeSettings.antiviewonce
            await sock.sendMessage(from, { text: `${runtimeSettings.antiviewonce ? '✅' : '❌'} Anti-viewonce: *${runtimeSettings.antiviewonce ? 'ON' : 'OFF'}*\n_Bot will ${runtimeSettings.antiviewonce ? 'now auto-reveal' : 'no longer reveal'} view-once messages._` }, { quoted: msg }); break
        }
        case 'autobio': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .autobio <bio text>\nUse {time} for dynamic time` }, { quoted: msg })
            runtimeSettings.autobio = q
            await sock.sendMessage(from, { text: `✅ Auto-bio set to: _${q}_` }, { quoted: msg }); break
        }
        case 'autoblock': {
            runtimeSettings.autoblock = !runtimeSettings.autoblock
            await sock.sendMessage(from, { text: `${runtimeSettings.autoblock ? '✅' : '❌'} Auto-block unknown: *${runtimeSettings.autoblock ? 'ON' : 'OFF'}*` }, { quoted: msg }); break
        }
        case 'autoreact': {
            runtimeSettings.autoreact = !runtimeSettings.autoreact
            await sock.sendMessage(from, { text: `${runtimeSettings.autoreact ? '✅' : '❌'} Auto-react to messages: *${runtimeSettings.autoreact ? 'ON' : 'OFF'}*` }, { quoted: msg }); break
        }
        case 'autorecord': {
            runtimeSettings.autorecord = !runtimeSettings.autorecord
            await sock.sendMessage(from, { text: `${runtimeSettings.autorecord ? '✅' : '❌'} Auto-recording indicator: *${runtimeSettings.autorecord ? 'ON' : 'OFF'}*` }, { quoted: msg }); break
        }
        case 'autorecordtyping': {
            runtimeSettings.autorecordtyping = !runtimeSettings.autorecordtyping
            await sock.sendMessage(from, { text: `${runtimeSettings.autorecordtyping ? '✅' : '❌'} Auto record+typing: *${runtimeSettings.autorecordtyping ? 'ON' : 'OFF'}*` }, { quoted: msg }); break
        }
        case 'statusdelay': {
            const delay = parseInt(q) || 3
            runtimeSettings.statusdelay = delay
            await sock.sendMessage(from, { text: `✅ Status view delay: *${delay}s*` }, { quoted: msg }); break
        }
        case 'statussettings': {
            await sock.sendMessage(from, {
                text: `╔══〔 📊 *STATUS SETTINGS* 〕\n║  👁️ Auto-view: *${runtimeSettings.autoviewstatus ? 'ON' : 'OFF'}*\n║  ❤️ Auto-react: *${runtimeSettings.autoreactstatus ? 'ON' : 'OFF'}*\n║  💾 Auto-save: *${runtimeSettings.autosavestatus ? 'ON' : 'OFF'}*\n║  ⏱️ Delay: *${runtimeSettings.statusdelay || 3}s*\n╚══════════════════`
            }, { quoted: msg }); break
        }
        case 'setwatermark': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setwatermark <text>` }, { quoted: msg })
            config.watermark = q
            await sock.sendMessage(from, { text: `✅ Watermark set: *${q}*` }, { quoted: msg }); break
        }
        case 'setfont': {
            await sock.sendMessage(from, { text: `⚙️ Font style: coming soon.` }, { quoted: msg }); break
        }
        case 'setcontextlink': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setcontextlink <url>` }, { quoted: msg })
            config.contextLink = q
            await sock.sendMessage(from, { text: `✅ Context link set.` }, { quoted: msg }); break
        }
        case 'setstatusemoji': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setstatusemoji <emoji>` }, { quoted: msg })
            STATUS_EMOJIS.length = 0; STATUS_EMOJIS.push(q)
            await sock.sendMessage(from, { text: `✅ Status emoji: ${q}` }, { quoted: msg }); break
        }
        case 'setstickerauthor': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setstickerauthor <name>` }, { quoted: msg })
            config.stickerAuthor = q
            await sock.sendMessage(from, { text: `✅ Sticker author: *${q}*` }, { quoted: msg }); break
        }
        case 'setstickerpackname': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setstickerpackname <name>` }, { quoted: msg })
            config.stickerPack = q
            await sock.sendMessage(from, { text: `✅ Sticker pack name: *${q}*` }, { quoted: msg }); break
        }
        case 'settimezone': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .settimezone <timezone>\nExample: .settimezone Africa/Nairobi` }, { quoted: msg })
            config.timezone = q
            await sock.sendMessage(from, { text: `✅ Timezone: *${q}*` }, { quoted: msg }); break
        }
        case 'setwelcome': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setwelcome <message>\nUse {name} for member name, {group} for group name` }, { quoted: msg })
            config.welcomeText = q
            await sock.sendMessage(from, { text: `✅ Welcome message set:\n_${q}_` }, { quoted: msg }); break
        }
        case 'setgoodbye': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setgoodbye <message>` }, { quoted: msg })
            config.goodbyeText = q
            await sock.sendMessage(from, { text: `✅ Goodbye message set:\n_${q}_` }, { quoted: msg }); break
        }
        case 'showwelcome': {
            await sock.sendMessage(from, { text: `👋 *Welcome message:*\n${config.welcomeText || 'Welcome to {group}, @{name}!'}` }, { quoted: msg }); break
        }
        case 'showgoodbye': {
            await sock.sendMessage(from, { text: `👋 *Goodbye message:*\n${config.goodbyeText || 'Goodbye @{name}!'}` }, { quoted: msg }); break
        }
        case 'testwelcome': {
            const name = sender.split('@')[0]
            const group = from.endsWith('@g.us') ? (await sock.groupMetadata(from).catch(()=>({subject:'Test Group'}))).subject : 'Test Group'
            const wtext = (config.welcomeText || 'Welcome to *{group}*, @{name}! 🎉').replace('{name}', name).replace('{group}', group)
            await sock.sendMessage(from, { text: wtext, mentions: [sender] }, { quoted: msg }); break
        }
        case 'testgoodbye': {
            const name2 = sender.split('@')[0]
            const btext = (config.goodbyeText || 'Goodbye @{name}! 👋').replace('{name}', name2)
            await sock.sendMessage(from, { text: btext, mentions: [sender] }, { quoted: msg }); break
        }
        case 'delwelcome': {
            config.welcomeText = null
            await sock.sendMessage(from, { text: `✅ Welcome message reset to default.` }, { quoted: msg }); break
        }
        case 'delgoodbye': {
            config.goodbyeText = null
            await sock.sendMessage(from, { text: `✅ Goodbye message reset to default.` }, { quoted: msg }); break
        }
        case 'resetsetting': {
            config.mode = 'public'; config.aiEnabled = true; config.welcomeText = null; config.goodbyeText = null
            await sock.sendMessage(from, { text: `✅ Settings reset to defaults.` }, { quoted: msg }); break
        }
        case 'setanticallmsg': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .setanticallmsg <message>` }, { quoted: msg })
            config.anticallMsg = q
            await sock.sendMessage(from, { text: `✅ Anti-call message set.` }, { quoted: msg }); break
        }
        case 'showanticallmsg': {
            await sock.sendMessage(from, { text: `📞 Anti-call message:\n${config.anticallMsg || 'Sorry, I don\'t accept calls.'}` }, { quoted: msg }); break
        }
        case 'delanticallmsg': {
            config.anticallMsg = null
            await sock.sendMessage(from, { text: `✅ Anti-call message reset.` }, { quoted: msg }); break
        }
        case 'testanticallmsg': {
            await sock.sendMessage(from, { text: config.anticallMsg || `❌ Sorry, I don't accept calls.\nContact: wa.me/${config.ownerNumber}` }, { quoted: msg }); break
        }
        case 'addcountrycode': {
            if (!q) return sock.sendMessage(from, { text: `❌ Usage: .addcountrycode <code>\nExample: .addcountrycode 254` }, { quoted: msg })
            if (!config.countryCodes) config.countryCodes = []
            if (!config.countryCodes.includes(q)) config.countryCodes.push(q)
            await sock.sendMessage(from, { text: `✅ Country code +${q} allowed.` }, { quoted: msg }); break
        }
        case 'delcountrycode': {
            if (!config.countryCodes) return sock.sendMessage(from, { text: `❌ No country codes set.` }, { quoted: msg })
            const idx = config.countryCodes.indexOf(q)
            if (idx !== -1) config.countryCodes.splice(idx, 1)
            await sock.sendMessage(from, { text: `✅ Country code +${q} removed.` }, { quoted: msg }); break
        }
        case 'listcountrycode': {
            await sock.sendMessage(from, { text: `🌍 *Allowed country codes:*\n${(config.countryCodes||[]).map(c=>'+'+c).join(', ') || 'All allowed'}` }, { quoted: msg }); break
        }
        case 'setmenu': case 'setmenuimage': {
            await sock.sendMessage(from, { text: `⚙️ Custom menu: coming soon.\nCurrently using default menu.` }, { quoted: msg }); break
        }

        case 'gcaddprivacy': case 'ppprivacy': case 'aza': case 'resetaza': case 'setaza':
        case 'update': case 'autosavestatus2': {
            await sock.sendMessage(from, { text: `⚙️ This feature is coming soon.` }, { quoted: msg }); break
        }

        default:
            await sock.sendMessage(from, { text: `❓ Unknown owner command: .${cmd}` }, { quoted: msg })
    }
}

module.exports = { handleOwnerCmd, badWords, ignoredNumbers, runtimeSettings, STATUS_EMOJIS }
