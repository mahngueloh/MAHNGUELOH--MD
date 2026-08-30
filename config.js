module.exports = {
    // ─── Bot Identity ───────────────────────────────────────────────
    botName: 'MAHNGUELOH-MD',
    ownerName: 'MAHNGUELOH',
    ownerNumber: '254732223354', // Owner number (no + or spaces)
    prefix: '.',                 // Command prefix e.g. .menu .sticker

    // ─── Public Mode ─────────────────────────────────────────────────
    // 'public'  → everyone can use all commands
    // 'private' → only owner can use commands
    mode: 'public',

    // ─── Sudo Users (extra admins besides owner) ─────────────────────
    // Add numbers here to give them owner-level access
    sudoNumbers: [],             // e.g. ['254711111111', '254722222222']

    // ─── AI Chat (uses free Gemini API — no key needed by default) ───
    openaiApiKey: '',            // Optional: paste OpenAI key to use GPT instead
    geminiApiKey: '',            // Optional: paste Gemini key for higher limits
    aiEnabled: true,
    aiModel: 'gpt-3.5-turbo',   // Used only if openaiApiKey is set

    // ─── Group Settings ─────────────────────────────────────────────
    antiLink: true,              // Block links in groups
    antiSpam: true,              // Block repeated messages
    welcomeMsg: true,            // Welcome new members
    goodbyeMsg: true,            // Farewell leaving members

    // ─── Download Settings ──────────────────────────────────────────
    ytCookies: '',               // Optional: YouTube cookies for age-restricted
    maxDownloadSize: 100,        // Max file size in MB

    // ─── Misc ────────────────────────────────────────────────────────
    readReceipts: true,          // Mark messages as read
    typingIndicator: true,       // Show typing while processing
    language: 'en',
}
