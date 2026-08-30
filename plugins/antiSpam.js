const { isAdmin } = require('../lib/utils')
const { getSettings } = require('./groupSettings')

const LINK_REGEX = /(?:https?:\/\/|www\.|chat\.whatsapp\.com|t\.me|bit\.ly|youtu\.be)\S+/gi
const SPAM_LIMIT = 5
const SPAM_WINDOW = 5000
const BUG_PATTERNS = [/[\u0600-\u06FF]{500,}/, /\u202E/, /(\u0000){5,}/, /[\uFE30-\uFE4F]{50,}/]

const warnCounts = new Map() // key: groupId_sender

// ── Generic action helper ─────────────────────────────────────────────────────
async function applyAction(sock, msg, from, sender, action, reason) {
    const key = `${from}_${sender}`
    const warns = (warnCounts.get(key) || 0) + 1

    // Always delete message first
    try { await sock.sendMessage(from, { delete: msg.key }) } catch {}

    if (action === 'warn') {
        warnCounts.set(key, warns)
        await sock.sendMessage(from, {
            text: `⚠️ @${sender.split('@')[0]} *Warning ${warns}/3* — ${reason}`,
            mentions: [sender]
        })
        if (warns >= 3) {
            warnCounts.delete(key)
            try { await sock.groupParticipantsUpdate(from, [sender], 'remove') } catch {}
            await sock.sendMessage(from, {
                text: `🚫 @${sender.split('@')[0]} removed after 3 warnings!`,
                mentions: [sender]
            })
        }
    } else if (action === 'delete') {
        await sock.sendMessage(from, {
            text: `🗑️ @${sender.split('@')[0]} — ${reason}. Message deleted.`,
            mentions: [sender]
        })
    } else if (action === 'kick') {
        try { await sock.groupParticipantsUpdate(from, [sender], 'remove') } catch {}
        await sock.sendMessage(from, {
            text: `🚫 @${sender.split('@')[0]} was removed — ${reason}`,
            mentions: [sender]
        })
    }
}

// ── Anti-link ─────────────────────────────────────────────────────────────────
async function antiLinkCheck(sock, msg, from, sender, ownerIsUser) {
    const s = getSettings(from)
    if (!s.antilink) return false
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || ''
    if (!LINK_REGEX.test(body)) return false
    if ((await isAdmin(sock, from, sender)) || ownerIsUser) return false
    await applyAction(sock, msg, from, sender, s.antilinkAction, 'No links allowed')
    return true
}

// ── Anti-spam ─────────────────────────────────────────────────────────────────
async function antiSpamCheck(sock, msg, from, sender, spamMap) {
    const s = getSettings(from)
    if (!s.antispam) return false
    if (await isAdmin(sock, from, sender)) return false
    const key = `${from}_${sender}`
    const now = Date.now()
    const entry = spamMap.get(key) || { count: 0, first: now }
    if (now - entry.first > SPAM_WINDOW) { spamMap.set(key, { count: 1, first: now }); return false }
    entry.count++
    spamMap.set(key, entry)
    if (entry.count >= SPAM_LIMIT) {
        spamMap.delete(key)
        try { await sock.groupParticipantsUpdate(from, [sender], 'remove') } catch {}
        await sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} removed for spamming.`, mentions: [sender] })
        return true
    }
    return false
}

// ── Anti-sticker ──────────────────────────────────────────────────────────────
async function antiStickerCheck(sock, msg, from, sender, ownerIsUser) {
    const s = getSettings(from)
    if (!s.antisticker || !msg.message?.stickerMessage) return false
    if ((await isAdmin(sock, from, sender)) || ownerIsUser) return false
    await applyAction(sock, msg, from, sender, s.antistickerAction, 'Stickers not allowed')
    return true
}

// ── Anti-voice note ───────────────────────────────────────────────────────────
async function antiVoiceNoteCheck(sock, msg, from, sender, ownerIsUser) {
    const s = getSettings(from)
    if (!s.antivoicenote || msg.message?.audioMessage?.ptt !== true) return false
    if ((await isAdmin(sock, from, sender)) || ownerIsUser) return false
    await applyAction(sock, msg, from, sender, s.antivoicenoteAction, 'Voice notes not allowed')
    return true
}

// ── Anti-bug ──────────────────────────────────────────────────────────────────
async function antiBugCheck(sock, msg, from, sender, ownerIsUser) {
    const s = getSettings(from)
    if (!s.antibug) return false
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    if (!BUG_PATTERNS.some(p => p.test(body))) return false
    if ((await isAdmin(sock, from, sender)) || ownerIsUser) return false
    await applyAction(sock, msg, from, sender, s.antibugAction, 'Bug/crash message detected')
    return true
}

async function antiGroupMentionCheck(sock, msg, from, sender, ownerIsUser) {
    const { getSettings } = require('./groupSettings')
    const settings = getSettings(from)
    if (!settings.antigroupmention) return false
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    // Detect @everyone, @all, @here or actual group mention (participantCount)
    const hasGroupMention = /@(everyone|all|here|group)/i.test(body) ||
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 5
    if (!hasGroupMention) return false
    const senderIsAdmin = await isAdmin(sock, from, sender)
    if (senderIsAdmin || ownerIsUser) return false
    await doAction(sock, from, sender, msg, settings.antigroupmentionAction || 'delete', 'Group-wide mentions not allowed')
    return true
}

module.exports = { antiLinkCheck, antiSpamCheck, antiStickerCheck, antiVoiceNoteCheck, antiBugCheck, antiGroupMentionCheck }
