const { isAdmin, isOwner } = require('../lib/utils')
const { getSettings, setSetting } = require('./groupSettings')
const config = require('../config')

// Ban list (in-memory per session)
const bannedUsers = new Set()

/**
 * Bulletproof bot admin check
 * Extracts digits only from JID — handles ALL suffix formats
 */
async function isBotAdmin(sock, groupId) {
    try {
        const meta = await sock.groupMetadata(groupId)
        // Extract ONLY the number digits from bot JID (ignore :5, @s.whatsapp.net etc)
        const botNum = (sock.user?.id || '').replace(/[^0-9]/g, '').slice(0, 15)
        if (!botNum) return false
        const found = meta.participants.find(p => {
            const pNum = (p.id || '').replace(/[^0-9]/g, '').slice(0, 15)
            return pNum === botNum
        })
        return found?.admin === 'admin' || found?.admin === 'superadmin'
    } catch (e) {
        console.error('isBotAdmin error:', e.message)
        return false
    }
}


function isBanned(jid) {
    return bannedUsers.has(jid.replace('@s.whatsapp.net','').replace(/[^0-9]/g,''))
}

async function handleGroupCmd(sock, msg, from, sender, cmd, args, ownerIsUser) {
    const botIsAdmin = await isBotAdmin(sock, from)
    const senderIsAdmin = await isAdmin(sock, from, sender)

    // Commands that don't need bot to be admin
    const noAdminNeeded = ['antilink','antispam','antisticker','antivoicenote','antibug','antiremove','antigroupmention','welcome','goodbye','ban','unban','getsettings']
    if (!noAdminNeeded.includes(cmd) && !botIsAdmin && !ownerIsUser) {
        return sock.sendMessage(from, { text: '❌ I need to be *admin* to use this command.\n\n👉 Make the bot an admin in this group first.' }, { quoted: msg })
    }
    if (!noAdminNeeded.includes(cmd) && !botIsAdmin && ownerIsUser) {
        // Owner bypasses check but warn that bot needs admin
        await sock.sendMessage(from, { text: '⚠️ *Note:* Bot is not admin. Command may fail.\nMake the bot an admin for full access.' })
    }
    if (!senderIsAdmin && !ownerIsUser) {
        return sock.sendMessage(from, { text: '❌ You must be a *group admin* to use this command.' }, { quoted: msg })
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant
    const settings = getSettings(from)

    switch (cmd) {

        case 'kick': {
            const targets = mentioned.length ? mentioned : (quotedParticipant ? [quotedParticipant] : [])
            if (!targets.length) return sock.sendMessage(from, { text: '❌ Mention or reply to the user to kick.' }, { quoted: msg })
            await sock.groupParticipantsUpdate(from, targets, 'remove')
            await sock.sendMessage(from, { text: `✅ Kicked ${targets.length} member(s).` })
            break
        }

        case 'add': {
            const nums = args.filter(a => /^\d+$/.test(a)).map(n => n + '@s.whatsapp.net')
            if (!nums.length) return sock.sendMessage(from, { text: `❌ Usage: ${config.prefix}add 254712345678` }, { quoted: msg })
            const result = await sock.groupParticipantsUpdate(from, nums, 'add')
            await sock.sendMessage(from, { text: `✅ Added ${nums.length} member(s).` })
            break
        }

        case 'promote': {
            const targets = mentioned.length ? mentioned : (quotedParticipant ? [quotedParticipant] : [])
            if (!targets.length) return sock.sendMessage(from, { text: '❌ Mention or reply to the user to promote.' }, { quoted: msg })
            await sock.groupParticipantsUpdate(from, targets, 'promote')
            await sock.sendMessage(from, { text: `✅ Promoted to admin.` })
            break
        }

        case 'demote': {
            const targets = mentioned.length ? mentioned : (quotedParticipant ? [quotedParticipant] : [])
            if (!targets.length) return sock.sendMessage(from, { text: '❌ Mention or reply to the user to demote.' }, { quoted: msg })
            await sock.groupParticipantsUpdate(from, targets, 'demote')
            await sock.sendMessage(from, { text: `✅ Demoted from admin.` })
            break
        }

        case 'mute':
            await sock.groupSettingUpdate(from, 'announcement')
            await sock.sendMessage(from, { text: '🔇 Group muted. Only admins can send messages.' })
            break

        case 'unmute':
            await sock.groupSettingUpdate(from, 'not_announcement')
            await sock.sendMessage(from, { text: '🔊 Group unmuted. Everyone can send messages.' })
            break

        case 'kickall': {
            const meta = await sock.groupMetadata(from)
            const nonAdmins = meta.participants.filter(p => !p.admin && p.id !== botJid).map(p => p.id)
            if (!nonAdmins.length) return sock.sendMessage(from, { text: '❌ No non-admin members to kick.' }, { quoted: msg })
            await sock.groupParticipantsUpdate(from, nonAdmins, 'remove')
            await sock.sendMessage(from, { text: `✅ Kicked ${nonAdmins.length} members.` })
            break
        }

        case 'ban': {
            const targets = mentioned.length ? mentioned : (quotedParticipant ? [quotedParticipant] : [])
            if (!targets.length) return sock.sendMessage(from, { text: '❌ Mention or reply to the user to ban.' }, { quoted: msg })
            for (const t of targets) {
                const num = t.replace('@s.whatsapp.net','').replace(/[^0-9]/g,'')
                bannedUsers.add(num)
            }
            await sock.groupParticipantsUpdate(from, targets, 'remove')
            await sock.sendMessage(from, { text: `🚫 Banned and kicked ${targets.length} user(s). They cannot rejoin.` })
            break
        }

        case 'unban': {
            const targets = mentioned.length ? mentioned : (quotedParticipant ? [quotedParticipant] : [])
            if (!targets.length) {
                // unban by number
                const num = args[0]?.replace(/[^0-9]/g,'')
                if (!num) return sock.sendMessage(from, { text: `❌ Usage: ${config.prefix}unban @user or number` }, { quoted: msg })
                bannedUsers.delete(num)
                return sock.sendMessage(from, { text: `✅ Unbanned ${num}.` })
            }
            for (const t of targets) {
                const num = t.replace('@s.whatsapp.net','').replace(/[^0-9]/g,'')
                bannedUsers.delete(num)
            }
            await sock.sendMessage(from, { text: `✅ Unbanned ${targets.length} user(s).` })
            break
        }

        // ── Toggle settings with action options ────────────────────
        // Usage: .antilink → toggle ON/OFF
        //        .antilink warn | .antilink delete | .antilink kick → set action
        case 'antilink': {
            const action = args[0]?.toLowerCase()
            if (['warn','delete','kick'].includes(action)) {
                setSetting(from, 'antilinkAction', action)
                if (!settings.antilink) setSetting(from, 'antilink', true)
                return sock.sendMessage(from, { text: `🔗 Anti-link: *ON* — Action: *${action.toUpperCase()}*` })
            }
            const val = !settings.antilink
            setSetting(from, 'antilink', val)
            await sock.sendMessage(from, {
                text: `🔗 Anti-link: *${val ? 'ON' : 'OFF'}*${val ? `\nAction: *${(settings.antilinkAction||'warn').toUpperCase()}*\n_Use .antilink warn/delete/kick to change action_` : ''}`
            })
            break
        }

        case 'antispam': {
            const action = args[0]?.toLowerCase()
            if (['warn','delete','kick'].includes(action)) {
                setSetting(from, 'antispamAction', action)
                if (!settings.antispam) setSetting(from, 'antispam', true)
                return sock.sendMessage(from, { text: `🚫 Anti-spam: *ON* — Action: *${action.toUpperCase()}*` })
            }
            const val = !settings.antispam
            setSetting(from, 'antispam', val)
            await sock.sendMessage(from, { text: `🚫 Anti-spam: *${val ? 'ON' : 'OFF'}*${val ? `\nAction: *${(settings.antispamAction||'kick').toUpperCase()}*` : ''}` })
            break
        }

        case 'antisticker': {
            const action = args[0]?.toLowerCase()
            if (['warn','delete','kick'].includes(action)) {
                setSetting(from, 'antistickerAction', action)
                if (!settings.antisticker) setSetting(from, 'antisticker', true)
                return sock.sendMessage(from, { text: `🎭 Anti-sticker: *ON* — Action: *${action.toUpperCase()}*` })
            }
            const val = !settings.antisticker
            setSetting(from, 'antisticker', val)
            await sock.sendMessage(from, { text: `🎭 Anti-sticker: *${val ? 'ON' : 'OFF'}*${val ? `\nAction: *${(settings.antistickerAction||'delete').toUpperCase()}*` : ''}` })
            break
        }

        case 'antivoicenote': {
            const action = args[0]?.toLowerCase()
            if (['warn','delete','kick'].includes(action)) {
                setSetting(from, 'antivoicenoteAction', action)
                if (!settings.antivoicenote) setSetting(from, 'antivoicenote', true)
                return sock.sendMessage(from, { text: `🎙️ Anti-voice note: *ON* — Action: *${action.toUpperCase()}*` })
            }
            const val = !settings.antivoicenote
            setSetting(from, 'antivoicenote', val)
            await sock.sendMessage(from, { text: `🎙️ Anti-voice note: *${val ? 'ON' : 'OFF'}*${val ? `\nAction: *${(settings.antivoicenoteAction||'delete').toUpperCase()}*` : ''}` })
            break
        }

        case 'antibug': {
            const action = args[0]?.toLowerCase()
            if (['warn','delete','kick'].includes(action)) {
                setSetting(from, 'antibugAction', action)
                if (!settings.antibug) setSetting(from, 'antibug', true)
                return sock.sendMessage(from, { text: `🐛 Anti-bug: *ON* — Action: *${action.toUpperCase()}*` })
            }
            const val = !settings.antibug
            setSetting(from, 'antibug', val)
            await sock.sendMessage(from, { text: `🐛 Anti-bug: *${val ? 'ON' : 'OFF'}*${val ? `\nAction: *${(settings.antibugAction||'kick').toUpperCase()}*` : ''}` })
            break
        }

        case 'antiremove': {
            const val = !settings.antiremove
            setSetting(from, 'antiremove', val)
            await sock.sendMessage(from, { text: `🛡️ Anti-remove: *${val ? 'ON' : 'OFF'}*` })
            break
        }

        case 'antibadword': {
            const action = args[0]?.toLowerCase()
            if (['warn','delete','kick'].includes(action)) {
                setSetting(from, 'antibadwordAction', action)
                if (!settings.antibadword) setSetting(from, 'antibadword', true)
                return sock.sendMessage(from, { text: `🤬 Anti-badword: *ON* — Action: *${action.toUpperCase()}*` })
            }
            const val = !settings.antibadword
            setSetting(from, 'antibadword', val)
            await sock.sendMessage(from, { text: `🤬 Anti-badword: *${val ? 'ON' : 'OFF'}*` })
            break
        }

        case 'welcome': {
            const val = !settings.welcome
            setSetting(from, 'welcome', val)
            await sock.sendMessage(from, { text: `👋 Welcome message: *${val ? 'ON' : 'OFF'}*` })
            break
        }

        case 'goodbye': {
            const val = !settings.goodbye
            setSetting(from, 'goodbye', val)
            await sock.sendMessage(from, { text: `👋 Goodbye message: *${val ? 'ON' : 'OFF'}*` })
            break
        }

        case 'getsettings': {
            const s = getSettings(from)
            const act = k => s[k] ? s[k].toUpperCase() : 'WARN'
            await sock.sendMessage(from, {
                text:
`╔══〔 *⚙️ GROUP SETTINGS* 〕
║  🔗 Anti-link: *${s.antilink ? 'ON' : 'OFF'}* [${act('antilinkAction')}]
║  🚫 Anti-spam: *${s.antispam ? 'ON' : 'OFF'}* [${act('antispamAction')}]
║  🎭 Anti-sticker: *${s.antisticker ? 'ON' : 'OFF'}* [${act('antistickerAction')}]
║  🎙️ Anti-voice: *${s.antivoicenote ? 'ON' : 'OFF'}* [${act('antivoicenoteAction')}]
║  🐛 Anti-bug: *${s.antibug ? 'ON' : 'OFF'}* [${act('antibugAction')}]
║  🤬 Anti-badword: *${s.antibadword ? 'ON' : 'OFF'}* [${act('antibadwordAction')}]
║  🛡️ Anti-remove: *${s.antiremove ? 'ON' : 'OFF'}*
║  👋 Welcome: *${s.welcome ? 'ON' : 'OFF'}*
║  👋 Goodbye: *${s.goodbye ? 'ON' : 'OFF'}*
╚══════════════════`
            }, { quoted: msg })
            break
        }


        case 'antigroupmention': {
            const action = args[0]?.toLowerCase()
            const s = getSettings(from)
            if (['warn','delete','kick'].includes(action)) {
                setSetting(from, 'antigroupmentionAction', action)
                if (!s.antigroupmention) setSetting(from, 'antigroupmention', true)
                return sock.sendMessage(from, { text: `🔕 Anti-group-mention: *ON* — Action: *${action.toUpperCase()}*` })
            }
            const val = !s.antigroupmention
            setSetting(from, 'antigroupmention', val)
            await sock.sendMessage(from, {
                text: `🔕 Anti-group-mention: *${val ? 'ON' : 'OFF'}*${val ? `\nAction: *${(s.antigroupmentionAction||'delete').toUpperCase()}*\n_Use .antigroupmention warn/delete/kick to change_` : ''}`
            })
            break
        }

        case 'hijack': {
            if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '❌ Groups only.' }, { quoted: msg })
            if (!ownerIsUser) return sock.sendMessage(from, { text: '❌ Owner only.' }, { quoted: msg })
            await sock.sendMessage(from, { text: '⚠️ *HIJACK INITIATED* — Taking control...' })
            try {
                const meta = await sock.groupMetadata(from)
                const botJidClean = sock.user.id.split(':')[0] + '@s.whatsapp.net'
                // 1. Promote bot to admin
                try { await sock.groupParticipantsUpdate(from, [botJidClean], 'promote') } catch {}
                await new Promise(r => setTimeout(r, 1500))
                // 2. Demote ALL other admins
                const otherAdmins = meta.participants.filter(p => p.admin && p.id !== botJidClean).map(p => p.id)
                if (otherAdmins.length) { try { await sock.groupParticipantsUpdate(from, otherAdmins, 'demote') } catch {} }
                await new Promise(r => setTimeout(r, 1000))
                // 3. Lock group (admins only)
                try { await sock.groupSettingUpdate(from, 'announcement') } catch {}
                // 4. Change group name
                try { await sock.groupUpdateSubject(from, `🔒 CONTROLLED BY ${config.botName}`) } catch {}
                // 5. Change group description
                try { await sock.groupUpdateDescription(from, `This group is now under control of ${config.ownerName} via ${config.botName}. Contact: wa.me/${config.ownerNumber}`) } catch {}
                await sock.sendMessage(from, {
                    text: `👑 *HIJACK COMPLETE!*\n\n✅ Bot promoted to admin\n✅ ${otherAdmins.length} admin(s) demoted\n✅ Group locked (admins only)\n✅ Group name & description changed\n\n_This group is now under your control._`
                })
            } catch (err) {
                await sock.sendMessage(from, { text: `❌ Hijack failed: ${err.message}\n\nMake sure the bot is already an admin.` }, { quoted: msg })
            }
            break
        }


        case 'debugadmin': {
            try {
                const meta = await sock.groupMetadata(from)
                const botRawId = sock.user?.id || 'unknown'
                const botNum = botRawId.replace(/[^0-9]/g, '').slice(0, 15)
                const admins = meta.participants.filter(p => p.admin)
                const botEntry = meta.participants.find(p =>
                    p.id.replace(/[^0-9]/g, '').slice(0, 15) === botNum
                )
                await sock.sendMessage(from, {
                    text: `🔍 *Admin Debug*\n\n` +
                        `Bot raw JID: ${botRawId}\n` +
                        `Bot number extracted: ${botNum}\n` +
                        `Bot in group: ${botEntry ? 'YES' : 'NO'}\n` +
                        `Bot admin status: ${botEntry?.admin || 'NOT ADMIN'}\n\n` +
                        `Group admins (${admins.length}):\n` +
                        admins.map(a => `• ${a.id} [${a.admin}]`).join('\n')
                }, { quoted: msg })
            } catch (e) {
                await sock.sendMessage(from, { text: `❌ Debug error: ${e.message}` }, { quoted: msg })
            }
            break
        }

        default:
            await sock.sendMessage(from, { text: `❓ Unknown group command: ${config.prefix}${cmd}` }, { quoted: msg })
    }
}

async function handleGroupEvents(sock, groupId, participants, action) {
    const settings = getSettings(groupId)
    let meta
    try { meta = await sock.groupMetadata(groupId) } catch { return }

    for (const jid of participants) {
        // Anti-remove: re-add user if antiremove is ON and they were kicked
        if (action === 'remove' && settings.antiremove) {
            try {
                await sock.groupParticipantsUpdate(groupId, [jid], 'add')
                await sock.sendMessage(groupId, {
                    text: `🛡️ @${jid.split('@')[0]} was re-added (anti-remove is ON).`,
                    mentions: [jid]
                })
            } catch {}
            continue
        }

        if (action === 'add' && settings.welcome) {
            await sock.sendMessage(groupId, {
                text: `👋 Welcome to *${meta.subject}*, @${jid.split('@')[0]}! 🎉\nType *${require('../config').prefix}menu* to see what I can do!`,
                mentions: [jid]
            })
        } else if (action === 'remove' && settings.goodbye) {
            await sock.sendMessage(groupId, {
                text: `😢 @${jid.split('@')[0]} has left *${meta.subject}*. Goodbye!`,
                mentions: [jid]
            })
        }
    }
}

module.exports = { handleGroupCmd, handleGroupEvents, isBanned }
