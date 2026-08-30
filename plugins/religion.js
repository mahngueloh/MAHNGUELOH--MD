async function getBible(verse) {
    try {
        const query = (verse || 'John 3:16').trim()
        const res = await fetch(`https://bible-api.com/${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10000) })
        const data = await res.json()
        if (data.error) return `❌ Verse not found.\n\n💡 Examples:\n• .bible John 3:16\n• .bible Psalms 23:1\n• .bible Genesis 1:1`
        return `📖 *${data.reference}*\n\n_${data.text.trim()}_\n\n_— Bible (WEB Translation)_`
    } catch { return `❌ Could not fetch Bible verse. Try again.` }
}

async function getQuran(input) {
    try {
        const num = parseInt(input) || 1
        if (num < 1 || num > 6236) return `❌ Invalid ayah. Enter a number between 1 and 6236.\n\nExample: .quran 255 (Ayat Al-Kursi)`
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${num}/en.asad`, { signal: AbortSignal.timeout(10000) })
        const data = await res.json()
        if (data.code !== 200) return `❌ Ayah not found.`
        const a = data.data
        // Also get Arabic text
        const res2 = await fetch(`https://api.alquran.cloud/v1/ayah/${num}/ar.alafasy`, { signal: AbortSignal.timeout(10000) })
        const data2 = await res2.json()
        const arabic = data2.code === 200 ? `\n\n🕌 *Arabic:*\n${data2.data.text}` : ''
        return `🕌 *Surah ${a.surah.englishName} (${a.surah.name})*\n*Ayah ${a.numberInSurah} of ${a.surah.numberOfAyahs}*\n\n📖 *Translation:*\n_${a.text}_${arabic}`
    } catch { return `❌ Could not fetch Quran ayah. Try again.` }
}

module.exports = { getBible, getQuran }
