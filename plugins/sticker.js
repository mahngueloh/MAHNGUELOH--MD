const { downloadMediaMessage } = require('@whiskeysockets/baileys')
const { Sticker, StickerTypes } = require('wa-sticker-formatter')
const config = require('../config')

async function makeSticker(sock, msg, from, q) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const targetMsg = quoted
        ? { message: quoted, key: msg.message.extendedTextMessage.contextInfo }
        : msg

    const mtype = Object.keys(targetMsg.message || {})[0]
    const isImage = mtype === 'imageMessage'
    const isVideo = mtype === 'videoMessage'
    const isSticker = mtype === 'stickerMessage'

    if (!isImage && !isVideo && !isSticker) {
        return sock.sendMessage(from, {
            text: `❌ Please send or reply to an *image* or *video* with *${config.prefix}sticker*`
        }, { quoted: msg })
    }

    try {
        await sock.sendMessage(from, { text: '⏳ Making sticker...' }, { quoted: msg })

        const buffer = await downloadMediaMessage(
            { message: targetMsg.message, key: targetMsg.key },
            'buffer',
            {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        )

        // Parse pack/author from args e.g. .sticker PackName | AuthorName
        let packname = config.botName
        let author = config.ownerName
        if (q) {
            const parts = q.split('|')
            packname = parts[0]?.trim() || packname
            author = parts[1]?.trim() || author
        }

        const sticker = new Sticker(buffer, {
            pack: packname,
            author: author,
            type: isVideo ? StickerTypes.ANIMATED : StickerTypes.FULL,
            categories: ['🤩', '🎉'],
            id: '12345',
            quality: 70,
        })

        const stickerBuffer = await sticker.toBuffer()
        await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg })

    } catch (err) {
        console.error('Sticker error:', err)
        await sock.sendMessage(from, { text: `❌ Failed to create sticker: ${err.message}` }, { quoted: msg })
    }
}

module.exports = { makeSticker }
