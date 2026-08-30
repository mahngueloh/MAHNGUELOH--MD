async function getLyrics(query) {
    try {
        // Try lyrics.ovh API (free, no key)
        const parts = query.split(' ')
        const artist = parts[0]
        const title = parts.slice(1).join(' ') || parts[0]
        const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, {
            signal: AbortSignal.timeout(10000)
        })
        const data = await res.json()
        if (data.lyrics) {
            const lyrics = data.lyrics.substring(0, 3000)
            return `🎵 *${query}*\n\n${lyrics}${data.lyrics.length > 3000 ? '\n\n_(truncated — too long)_' : ''}`
        }
        // Fallback: some-random-api
        const res2 = await fetch(`https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10000) })
        const data2 = await res2.json()
        if (data2.lyrics) {
            const lyrics = data2.lyrics.substring(0, 3000)
            return `🎵 *${data2.title}* — ${data2.author}\n\n${lyrics}${data2.lyrics.length > 3000 ? '\n_(truncated)_' : ''}`
        }
        return `❌ Lyrics not found for: *${query}*\n\nTip: Try *Artist SongName* e.g. *Adele Hello*`
    } catch { return `❌ Could not fetch lyrics. Try: *Artist SongName*` }
}

async function getIMDB(query) {
    try {
        // OMDb free API
        const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=trilogy`, { signal: AbortSignal.timeout(10000) })
        const data = await res.json()
        if (data.Response === 'True') {
            return `🎬 *${data.Title}* (${data.Year})\n⭐ *Rating:* ${data.imdbRating}/10\n🎭 *Genre:* ${data.Genre}\n📝 *Plot:* ${data.Plot}\n👤 *Director:* ${data.Director}\n🌟 *Cast:* ${data.Actors}`
        }
        // Fallback search
        const res2 = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=trilogy`, { signal: AbortSignal.timeout(10000) })
        const data2 = await res2.json()
        if (data2.Search?.length) {
            const m = data2.Search[0]
            return `🎬 *${m.Title}* (${m.Year})\n📺 Type: ${m.Type}\n🆔 IMDB: imdb.com/title/${m.imdbID}`
        }
        return `❌ Not found: *${query}*`
    } catch { return `❌ Could not fetch IMDB data.` }
}

async function getYTS(query) {
    try {
        const res = await fetch(`https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&limit=5`, { signal: AbortSignal.timeout(10000) })
        const data = await res.json()
        const movies = data.data?.movies
        if (!movies?.length) return `❌ No movies found for: *${query}*`
        let text = `🎬 *YTS: ${query}*\n\n`
        movies.forEach((m, i) => {
            const torrent = m.torrents?.[0]
            text += `${i+1}. *${m.title}* (${m.year}) ⭐${m.rating}\n`
            if (torrent) text += `   📥 ${torrent.quality} — ${torrent.size}\n   🔗 ${torrent.url}\n\n`
        })
        return text
    } catch { return `❌ Could not fetch YTS results.` }
}

module.exports = { getLyrics, getIMDB, getYTS }
