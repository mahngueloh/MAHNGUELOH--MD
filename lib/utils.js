/**
 * Strip device suffix from JID
 * 254732223354:5@s.whatsapp.net → 254732223354@s.whatsapp.net
 */
function cleanJid(jid) {
    if (!jid) return ''
    return jid.replace(/:\d+@/, '@')
}

/**
 * Extract just the number from any JID
 */
function jidToNum(jid) {
    return cleanJid(jid).replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/[^0-9]/g, '')
}

/**
 * Extract text body from ALL WhatsApp message types
 */
function getBody(msg) {
    const m = msg.message
    if (!m) return ''
    const inner =
        m.ephemeralMessage?.message ||
        m.viewOnceMessage?.message ||
        m.viewOnceMessageV2?.message?.viewOnceMessage?.message ||
        m.documentWithCaptionMessage?.message ||
        m
    return (
        inner.conversation ||
        inner.extendedTextMessage?.text ||
        inner.imageMessage?.caption ||
        inner.videoMessage?.caption ||
        inner.documentMessage?.caption ||
        inner.buttonsResponseMessage?.selectedButtonId ||
        inner.listResponseMessage?.singleSelectReply?.selectedRowId ||
        inner.templateButtonReplyMessage?.selectedId ||
        ''
    )
}

/**
 * Get the sender JID — always returns clean number@s.whatsapp.net
 * When fromMe=true (owner typed this), return owner's JID
 */
function getSender(msg) {
    const config = require('../config')
    if (msg.key.fromMe) {
        return config.ownerNumber + '@s.whatsapp.net'
    }
    const raw = msg.key.participant || msg.key.remoteJid || ''
    return cleanJid(raw)
}

/**
 * Get the chat JID — always clean (no device suffix)
 */
function getFrom(msg) {
    return cleanJid(msg.key.remoteJid || '')
}

/**
 * Check if JID is a group
 */
function isGroup(jid) {
    return (jid || '').endsWith('@g.us')
}

/**
 * Check if sender is the bot owner or sudo user
 */
function isOwner(sender, ownerNumber) {
    const config = require('../config')
    const num = jidToNum(sender)
    if (num === String(ownerNumber).replace(/[^0-9]/g, '')) return true
    if (Array.isArray(config.sudoNumbers)) {
        return config.sudoNumbers.map(n => String(n).replace(/[^0-9]/g, '')).includes(num)
    }
    return false
}

/**
 * Check if bot is in public mode
 */
function isPublicMode() {
    const config = require('../config')
    return !config.mode || config.mode === 'public'
}

/**
 * Check if sender is a group admin
 */
async function isAdmin(sock, groupId, jid) {
    try {
        const meta = await sock.groupMetadata(groupId)
        const num = jidToNum(jid)
        return meta.participants.some(p => jidToNum(p.id) === num && (p.admin === 'admin' || p.admin === 'superadmin'))
    } catch { return false }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

module.exports = { getBody, getSender, getFrom, isGroup, isOwner, isAdmin, isPublicMode, cleanJid, jidToNum, sleep, formatBytes }
