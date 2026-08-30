const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const readline = require('readline')
const path = require('path')
const fs = require('fs')

const { handleMessage } = require('./handler')
const { runtimeSettings, STATUS_EMOJIS } = require('./plugins/ownerCmds')
const config = require('./config')

console.log(`\n🤖 ${config.botName} — Starting...`)
console.log(`👤 Owner: ${config.ownerName} (${config.ownerNumber})`)
console.log(`⚡ Prefix: ${config.prefix} | Mode: ${config.mode || 'public'}\n`)

function question(prompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans.trim()) }))
}

let pairingCodeRequested = false
let sock

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: Browsers.ubuntu('Chrome'),
        getMessage: async () => ({ conversation: '' }),
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        retryRequestDelayMs: 2000,
    })

    sock.ev.on('creds.update', saveCreds)

    // ── Status updates (auto-view / react / save) ────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        for (const msg of messages) {
            try {
                if (!msg.message) continue

                const jid = msg.key.remoteJid || ''

                // ── Status updates ────────────────────────────────────
                if (jid === 'status@broadcast') {
                    if (runtimeSettings.autoviewstatus) {
                        try { await sock.readMessages([msg.key]) } catch {}
                    }
                    if (runtimeSettings.autoreactstatus) {
                        try {
                            const emoji = STATUS_EMOJIS[Math.floor(Math.random() * STATUS_EMOJIS.length)]
                            await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } })
                        } catch {}
                    }
                    if (runtimeSettings.autosavestatus) {
                        try {
                            const { downloadMediaMessage } = require('@whiskeysockets/baileys')
                            const ownerJid = config.ownerNumber + '@s.whatsapp.net'
                            if (msg.message.imageMessage) {
                                const buf = await downloadMediaMessage(msg, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
                                await sock.sendMessage(ownerJid, { image: buf, caption: '📸 Auto-saved status' })
                            } else if (msg.message.videoMessage) {
                                const buf = await downloadMediaMessage(msg, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage })
                                await sock.sendMessage(ownerJid, { video: buf, caption: '🎥 Auto-saved status' })
                            }
                        } catch {}
                    }
                    continue
                }

                // ── Skip non-notify and reaction messages ─────────────
                if (type !== 'notify') continue

                // Skip pure reaction messages — they have only reactionMessage
                const msgKeys = Object.keys(msg.message)
                if (msgKeys.length === 1 && msgKeys[0] === 'reactionMessage') continue

                // Skip bot's own outgoing messages unless owner typed a command
                if (msg.key.fromMe) {
                    const body = extractBody(msg)
                    if (!body || !body.startsWith(config.prefix)) continue
                }

                // ── Auto-react to incoming messages ────────────────────
                if (runtimeSettings.autoreact && !msg.key.fromMe) {
                    try {
                        const emoji = STATUS_EMOJIS[Math.floor(Math.random() * STATUS_EMOJIS.length)]
                        await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } })
                    } catch {}
                }

                await handleMessage(sock, msg)

            } catch (err) {
                console.error('Message error:', err.message)
            }
        }
    })

    // ── Connection handler ───────────────────────────────────────────
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {

        if (connection === 'connecting') {
            console.log('🔌 Connecting to WhatsApp...')

            // Request pairing code only once when not yet registered
            if (!sock.authState.creds.registered && !pairingCodeRequested) {
                pairingCodeRequested = true

                let phoneNumber = config.ownerNumber
                if (!phoneNumber || phoneNumber === '1234567890') {
                    phoneNumber = await question('📱 Enter your number (with country code, no +): ')
                }
                phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

                console.log(`\n⏳ Requesting pairing code for +${phoneNumber}...`)
                await new Promise(r => setTimeout(r, 4000))

                try {
                    const code = await sock.requestPairingCode(phoneNumber)
                    const fmt = code.match(/.{1,4}/g)?.join('-') || code
                    console.log('\n╔═══════════════════════════════╗')
                    console.log(`║   🔑 PAIRING CODE: ${fmt}   ║`)
                    console.log('╚═══════════════════════════════╝')
                    console.log('📱 WhatsApp → Linked Devices → Link a Device → Enter code')
                    console.log('⏰ Enter within 60 seconds!\n')
                } catch (err) {
                    console.error('❌ Pairing code error:', err.message)
                    pairingCodeRequested = false
                }
            }
        }

        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
            console.log('🔴 Disconnected. Status:', statusCode)

            if (statusCode === DisconnectReason.loggedOut) {
                console.log('🚫 Logged out! Delete the auth_info folder and restart.')
            } else {
                pairingCodeRequested = false
                console.log('🔄 Reconnecting in 5 seconds...')
                await new Promise(r => setTimeout(r, 5000))
                startBot()
            }
        }

        if (connection === 'open') {
            console.log(`\n✅ ${config.botName} Connected successfully!`)
            console.log(`👤 Owner: ${config.ownerName}`)
            console.log(`⚡ Prefix: ${config.prefix}`)
            console.log(`🌐 Mode: ${config.mode || 'public'}\n`)

            // Always-online presence
            if (runtimeSettings.alwaysonline) {
                try { await sock.sendPresenceUpdate('available') } catch {}
            }

            // Send startup notification to owner
            try {
                const ownerJid = config.ownerNumber + '@s.whatsapp.net'
                const bannerPath = path.join(__dirname, 'assets', 'banner.png')
                if (fs.existsSync(bannerPath)) {
                    await sock.sendMessage(ownerJid, {
                        image: fs.readFileSync(bannerPath),
                        caption: `✅ *${config.botName} is now online!*\n👤 Owner: *${config.ownerName}*\n⚡ Prefix: *${config.prefix}*\n🌐 Mode: *${config.mode || 'public'}*\n\nType *${config.prefix}menu* to see all commands.`
                    })
                } else {
                    await sock.sendMessage(ownerJid, {
                        text: `✅ *${config.botName} is now online!*\n👤 Owner: *${config.ownerName}*\n⚡ Prefix: *${config.prefix}*\n🌐 Mode: *${config.mode || 'public'}*\n\nType *${config.prefix}menu* to see all commands.`
                    })
                }
            } catch (e) {
                console.log('Startup message error:', e.message)
            }
        }
    })

    // ── Group events ─────────────────────────────────────────────────
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        try {
            const { handleGroupEvents } = require('./plugins/groupManagement')
            await handleGroupEvents(sock, id, participants, action)
        } catch {}
    })

    // ── Call rejection ───────────────────────────────────────────────
    sock.ev.on('call', async (calls) => {
        for (const call of calls) {
            if (runtimeSettings.anticall && call.status === 'offer') {
                try {
                    await sock.rejectCall(call.id, call.from)
                    await sock.sendMessage(call.from, {
                        text: `❌ Sorry, I don't accept calls.\nContact: wa.me/${config.ownerNumber}`
                    })
                } catch {}
            }
        }
    })
}

function extractBody(msg) {
    const m = msg.message
    if (!m) return ''
    const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m
    return (
        inner.conversation ||
        inner.extendedTextMessage?.text ||
        inner.imageMessage?.caption ||
        inner.videoMessage?.caption ||
        ''
    )
}

startBot()
