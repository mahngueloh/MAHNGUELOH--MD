const config = require('../config')
const fs = require('fs')
const path = require('path')

const TMP_DIR = path.join(__dirname, '../tmp')
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

// ── YouTube search using youtube-sr ──────────────────────────────────────────
async function ytSearch(query) {
    try {
        const YouTube = require('youtube-sr').default
        const results = await YouTube.search(query, { limit: 1, type: 'video' })
        if (!results?.length) return null
        return { id: results[0].id, title: results[0].title, url: `https://www.youtube.com/watch?v=${results[0].id}` }
    } catch {
        // Fallback: scrape YouTube search
        try {
            const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                signal: AbortSignal.timeout(10000)
            })
            const html = await res.text()
            const idMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
            const titleMatch = html.match(/"title":{"runs":\[{"text":"([^"]+)"/)
            if (!idMatch) return null
            return { id: idMatch[1], title: titleMatch?.[1] || query, url: `https://www.youtube.com/watch?v=${idMatch[1]}` }
        } catch { return null }
    }
}

// ── Download audio using ytdl-core ───────────────────────────────────────────
async function downloadAudio(url) {
    const ytdl = require('@distube/ytdl-core')
    const info = await ytdl.getInfo(url, { requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0' } } })
    const title = info.videoDetails.title

    // Get best audio format
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' })
        || ytdl.chooseFormat(info.formats, { filter: f => f.hasAudio })
    if (!format) throw new Error('No audio format available for this video')

    const chunks = []
    await new Promise((resolve, reject) => {
        const stream = ytdl.downloadFromInfo(info, { format })
        stream.on('data', chunk => chunks.push(chunk))
        stream.on('end', resolve)
        stream.on('error', reject)
        setTimeout(() => reject(new Error('Download timeout after 2 minutes')), 120000)
    })
    return { buf: Buffer.concat(chunks), title }
}

// ── Download video using ytdl-core ───────────────────────────────────────────
async function downloadVideo(url) {
    const ytdl = require('@distube/ytdl-core')
    const info = await ytdl.getInfo(url, { requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0' } } })
    const title = info.videoDetails.title

    // Try mp4 format under size limit
    const formats = ytdl.filterFormats(info.formats, f =>
        f.container === 'mp4' && f.hasVideo && f.hasAudio && f.contentLength && parseInt(f.contentLength) < config.maxDownloadSize * 1024 * 1024
    )
    const format = formats.sort((a, b) => parseInt(b.contentLength || 0) - parseInt(a.contentLength || 0))[0]
        || ytdl.chooseFormat(info.formats, { quality: 'lowest', filter: 'videoandaudio' })
    if (!format) throw new Error('No suitable video format found')

    const chunks = []
    await new Promise((resolve, reject) => {
        const stream = ytdl.downloadFromInfo(info, { format })
        stream.on('data', chunk => chunks.push(chunk))
        stream.on('end', resolve)
        stream.on('error', reject)
        setTimeout(() => reject(new Error('Download timeout after 3 minutes')), 180000)
    })
    return { buf: Buffer.concat(chunks), title }
}

// ── Social media download via cobalt ─────────────────────────────────────────
async function downloadSocial(url, audioOnly = false) {
    for (const endpoint of ['https://cobalt.tools/api/json', 'https://co.wuk.sh/api/json']) {
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ url, isAudioOnly: audioOnly, vQuality: '720', filenamePattern: 'basic' }),
                signal: AbortSignal.timeout(20000)
            })
            const data = await res.json()
            if (['stream','redirect','tunnel'].includes(data.status) && data.url) {
                const dlRes = await fetch(data.url, { signal: AbortSignal.timeout(60000) })
                if (!dlRes.ok) throw new Error(`HTTP ${dlRes.status}`)
                const buf = Buffer.from(await dlRes.arrayBuffer())
                return { buf, title: 'Downloaded' }
            }
        } catch {}
    }
    throw new Error('Could not download from this URL')
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function downloadMedia(sock, from, cmd, q, msg) {
    const isAudio = ['play','song','song2','ytmp3','yt','tiktokaudio','tomp3','toaudio'].includes(cmd)
    const isVideo = ['video','ytmp4','tiktok','tt','ig','instagram','facebook','twitter','download','tovideo','xvideo','videodoc'].includes(cmd)
    const isSocial = ['tiktok','tt','ig','instagram','facebook','twitter'].includes(cmd)

    if (!q) {
        return sock.sendMessage(from, {
            text: `❌ Usage: *${config.prefix}${cmd}* <song name or URL>\nExample: *${config.prefix}${cmd}* Blinding Lights`
        }, { quoted: msg })
    }

    const wait = await sock.sendMessage(from, { text: `⏳ *Processing:* _${q}_` }, { quoted: msg })

    try {
        // For social media, use cobalt
        if (isSocial && q.startsWith('http')) {
            const { buf, title } = await downloadSocial(q, isAudio)
            try { await sock.sendMessage(from, { delete: wait.key }) } catch {}
            if (isAudio) {
                await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg })
            } else {
                await sock.sendMessage(from, { video: buf, mimetype: 'video/mp4', caption: `🎬 Downloaded!` }, { quoted: msg })
            }
            return
        }

        // Resolve YouTube URL
        let videoUrl = q
        let title = q
        if (!q.startsWith('http')) {
            const found = await ytSearch(q)
            if (!found) throw new Error(`No results found for: "${q}"\n\nTip: Try a more specific song name`)
            videoUrl = found.url
            title = found.title
            await sock.sendMessage(from, { text: `🎵 Found: *${title}*` })
        }

        if (isAudio) {
            const { buf, title: t } = await downloadAudio(videoUrl)
            if (t) title = t
            if (buf.length / (1024*1024) > config.maxDownloadSize) throw new Error(`File too large. Max: ${config.maxDownloadSize}MB`)
            try { await sock.sendMessage(from, { delete: wait.key }) } catch {}
            await sock.sendMessage(from, {
                audio: buf, mimetype: 'audio/mp4', ptt: false, fileName: `${title}.m4a`
            }, { quoted: msg })
            await sock.sendMessage(from, { text: `✅ *${title}*` })

        } else if (isVideo) {
            const { buf, title: t } = await downloadVideo(videoUrl)
            if (t) title = t
            if (buf.length / (1024*1024) > config.maxDownloadSize) throw new Error(`File too large. Max: ${config.maxDownloadSize}MB`)
            try { await sock.sendMessage(from, { delete: wait.key }) } catch {}
            await sock.sendMessage(from, {
                video: buf, mimetype: 'video/mp4', caption: `🎬 *${title}*`
            }, { quoted: msg })
        }

    } catch (err) {
        console.error('Download error:', err.message)
        try { await sock.sendMessage(from, { delete: wait.key }) } catch {}
        await sock.sendMessage(from, {
            text: `❌ *Download failed*\n\n_${err.message}_\n\n💡 Tips:\n• Run *npm install* in console if packages missing\n• Try: *${config.prefix}ytmp3 https://youtu.be/VIDEO_ID*\n• Make sure the video is public & under ${config.maxDownloadSize}MB`
        }, { quoted: msg })
    }
}

module.exports = { downloadMedia }
