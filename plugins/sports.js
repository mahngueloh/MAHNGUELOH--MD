/**
 * Sports commands using free APIs
 */
const LEAGUES = {
    epl:        { code: 'PL',  name: 'Premier League' },
    laliga:     { code: 'PD',  name: 'La Liga' },
    bundesliga: { code: 'BL1', name: 'Bundesliga' },
    seriea:     { code: 'SA',  name: 'Serie A' },
    ligue1:     { code: 'FL1', name: 'Ligue 1' },
    cl:         { code: 'CL',  name: 'Champions League' },
    efl:        { code: 'ELC', name: 'EFL Championship' },
    el:         { code: 'EL',  name: 'Europa League' },
    wc:         { code: 'WC',  name: 'World Cup' },
}

// Free token for football-data.org (allows 10 req/min)
const TOKEN = '7b7639a1b6d5476aae3c2e6e70b4cf08'

async function fbFetch(code, path) {
    const res = await fetch(`https://api.football-data.org/v4/competitions/${code}/${path}`, {
        headers: { 'X-Auth-Token': TOKEN },
        signal: AbortSignal.timeout(15000)
    })
    const data = await res.json()
    if (data.errorCode) throw new Error(data.message || 'API error')
    return data
}

async function handleSports(sock, from, cmd, msg) {
    // WWE/Wrestling
    if (['wrestlingevents','wwenews','wweschedule'].includes(cmd)) {
        return sock.sendMessage(from, {
            text: `🤼 *WWE Events*\n\nLatest events: https://www.wwe.com/events\nLatest news: https://www.wwe.com/inside_wwe/news`
        }, { quoted: msg })
    }

    // Parse: e.g "eplmatches" → league=epl, type=matches
    let league = null, type = null
    for (const key of Object.keys(LEAGUES)) {
        if (cmd.startsWith(key)) {
            league = key
            type = cmd.slice(key.length)
            break
        }
    }

    if (!league || !type) {
        return sock.sendMessage(from, { text: `❌ Unknown sports command.` }, { quoted: msg })
    }

    const { code, name } = LEAGUES[league]
    const wait = await sock.sendMessage(from, { text: `⏳ Fetching *${name}* ${type}...` }, { quoted: msg })

    try {
        let text = ''

        if (type === 'standings') {
            const data = await fbFetch(code, 'standings')
            const table = data.standings?.[0]?.table?.slice(0, 10)
            if (!table?.length) throw new Error('No data')
            text = `┏▣ ◈ *🏆 ${name} STANDINGS* ◈\n`
            table.forEach(t => {
                text += `┃ ${String(t.position).padStart(2)}. ${t.team.shortName||t.team.name} — *${t.points}pts* (${t.won}W ${t.draw}D ${t.lost}L)\n`
            })
            text += `┗▣`

        } else if (type === 'matches') {
            const data = await fbFetch(code, 'matches?status=FINISHED&limit=8')
            const matches = data.matches?.slice(-8)
            if (!matches?.length) throw new Error('No recent matches')
            text = `┏▣ ◈ *⚽ ${name} RESULTS* ◈\n`
            matches.forEach(m => {
                const h = m.score?.fullTime?.home ?? '?'
                const a = m.score?.fullTime?.away ?? '?'
                text += `┃ ${m.homeTeam.shortName||m.homeTeam.name} *${h}-${a}* ${m.awayTeam.shortName||m.awayTeam.name}\n`
            })
            text += `┗▣`

        } else if (type === 'upcoming') {
            const data = await fbFetch(code, 'matches?status=SCHEDULED&limit=8')
            const matches = data.matches?.slice(0, 8)
            if (!matches?.length) throw new Error('No upcoming matches')
            text = `┏▣ ◈ *📅 ${name} UPCOMING* ◈\n`
            matches.forEach(m => {
                const d = new Date(m.utcDate).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short' })
                const t = new Date(m.utcDate).toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' })
                text += `┃ ${m.homeTeam.shortName||m.homeTeam.name} vs ${m.awayTeam.shortName||m.awayTeam.name} — *${d} ${t}*\n`
            })
            text += `┗▣`

        } else if (type === 'scorers') {
            const data = await fbFetch(code, 'scorers?limit=10')
            const scorers = data.scorers
            if (!scorers?.length) throw new Error('No scorers data')
            text = `┏▣ ◈ *⚽ ${name} TOP SCORERS* ◈\n`
            scorers.forEach((s, i) => {
                text += `┃ ${i+1}. *${s.player.name}* (${s.team.shortName||s.team.name}) — ${s.goals} ⚽\n`
            })
            text += `┗▣`
        }

        try { await sock.sendMessage(from, { delete: wait.key }) } catch {}
        await sock.sendMessage(from, { text }, { quoted: msg })

    } catch (err) {
        try { await sock.sendMessage(from, { delete: wait.key }) } catch {}
        await sock.sendMessage(from, {
            text: `❌ *${name} ${type} unavailable*\n_${err.message}_\n\n💡 The free API allows 10 requests/min. Try again shortly.`
        }, { quoted: msg })
    }
}

module.exports = { handleSports }
