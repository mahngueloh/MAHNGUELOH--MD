/**
 * AI Chat — works without any API key using pollinations.ai
 * Add geminiApiKey or openaiApiKey in config.js for better results
 */
const config = require('../config')

const historyMap = new Map()
const MAX_HISTORY = 8

const SYSTEM = (name, owner) =>
    `You are ${name}, a smart friendly WhatsApp AI assistant made by ${owner}. ` +
    `Be helpful and concise. Keep replies under 150 words unless asked for more.`

async function aiReply(sock, from, text, msg) {
    if (config.openaiApiKey) return callOpenAI(sock, from, text, msg)
    if (config.geminiApiKey) return callGemini(sock, from, text, msg)
    return callFree(sock, from, text, msg)
}

async function callOpenAI(sock, from, text, msg) {
    const hist = getHistory(from)
    hist.push({ role: 'user', content: text })
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.openaiApiKey}` },
            body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'system', content: SYSTEM(config.botName, config.ownerName) }, ...hist], max_tokens: 500 }),
            signal: AbortSignal.timeout(20000)
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error.message)
        const reply = data.choices[0].message.content.trim()
        addToHistory(from, text, reply)
        return sock.sendMessage(from, { text: `🤖 *${config.botName} AI*\n\n${reply}` }, { quoted: msg })
    } catch (e) {
        console.error('OpenAI:', e.message)
        return callFree(sock, from, text, msg)
    }
}

async function callGemini(sock, from, text, msg) {
    const hist = getHistory(from)
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM(config.botName, config.ownerName) }] },
                contents: [...hist.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })), { role: 'user', parts: [{ text }] }],
                generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
            }),
            signal: AbortSignal.timeout(20000)
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error.message)
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (!reply) throw new Error('Empty')
        addToHistory(from, text, reply)
        return sock.sendMessage(from, { text: `🤖 *${config.botName} AI*\n\n${reply}` }, { quoted: msg })
    } catch (e) {
        console.error('Gemini:', e.message)
        return callFree(sock, from, text, msg)
    }
}

async function callFree(sock, from, text, msg) {
    // pollinations.ai — completely free, no key needed
    try {
        const res = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'openai',
                messages: [
                    { role: 'system', content: SYSTEM(config.botName, config.ownerName) },
                    ...getHistory(from),
                    { role: 'user', content: text }
                ],
                max_tokens: 400,
                seed: 42
            }),
            signal: AbortSignal.timeout(20000)
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const reply = data.choices?.[0]?.message?.content?.trim()
        if (!reply) throw new Error('Empty response')
        addToHistory(from, text, reply)
        return sock.sendMessage(from, { text: `🤖 *${config.botName} AI*\n\n${reply}` }, { quoted: msg })
    } catch (e) {
        console.error('Free AI error:', e.message)
        // Last resort — smart fallback responses
        return sock.sendMessage(from, {
            text: `🤖 *${config.botName} AI*\n\n❌ AI is currently busy.\n\n💡 For free unlimited AI:\n1. Visit https://aistudio.google.com\n2. Create a free API key\n3. Add it to config.js as *geminiApiKey*`
        }, { quoted: msg })
    }
}

function getHistory(from) { return historyMap.get(from) || [] }
function addToHistory(from, userMsg, botMsg) {
    const hist = getHistory(from)
    hist.push({ role: 'user', content: userMsg }, { role: 'assistant', content: botMsg })
    if (hist.length > MAX_HISTORY * 2) hist.splice(0, 2)
    historyMap.set(from, hist)
}

module.exports = { aiReply }
