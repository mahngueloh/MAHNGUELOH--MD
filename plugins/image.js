async function getWallpaper(sock, from, query, msg) {
    try {
        const q = encodeURIComponent(query || 'nature 4k')
        // Unsplash source — free, no key needed for direct image
        const url = `https://source.unsplash.com/1080x1920/?${q}&random=${Date.now()}`
        await sock.sendMessage(from, {
            image: { url },
            caption: `🖼️ *Wallpaper:* ${query || 'Random'}\n_Powered by Unsplash_`
        }, { quoted: msg })
    } catch {
        // Fallback: picsum
        try {
            await sock.sendMessage(from, {
                image: { url: `https://picsum.photos/1080/1920?random=${Date.now()}` },
                caption: `🖼️ *Random Wallpaper*`
            }, { quoted: msg })
        } catch {
            await sock.sendMessage(from, { text: '❌ Could not fetch wallpaper.' }, { quoted: msg })
        }
    }
}

async function getRemini(sock, from, msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted?.imageMessage) {
        return sock.sendMessage(from, { text: `❌ Reply to an *image* with *.remini* to enhance it.` }, { quoted: msg })
    }
    try {
        const { downloadMediaMessage } = require('@whiskeysockets/baileys')
        const buf = await downloadMediaMessage(
            { message: quoted, key: msg.message.extendedTextMessage.contextInfo },
            'buffer', {}, { logger: { level: 'silent', child: () => ({ level: 'silent', info: () => {}, error: () => {}, warn: () => {} }) }, reuploadRequest: sock.updateMediaMessage }
        )
        // Use remini-style upscaling via a free API
        const res = await fetch('https://api.deepai.org/api/torch-srgan', {
            method: 'POST',
            headers: { 'api-key': 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K' },
            body: (() => { const fd = new FormData(); fd.append('image', new Blob([buf], { type: 'image/jpeg' }), 'image.jpg'); return fd })(),
            signal: AbortSignal.timeout(30000)
        })
        const data = await res.json()
        if (data.output_url) {
            await sock.sendMessage(from, {
                image: { url: data.output_url },
                caption: '✅ Enhanced image!'
            }, { quoted: msg })
        } else {
            throw new Error('No result')
        }
    } catch {
        await sock.sendMessage(from, {
            text: `❌ Enhancement failed.\n\n💡 Try: https://remini.ai or https://letsenhance.io`
        }, { quoted: msg })
    }
}

module.exports = { getWallpaper, getRemini }
