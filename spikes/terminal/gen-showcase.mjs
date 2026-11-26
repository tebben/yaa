// A static screen exercising styles and Unicode, for side-by-side screenshots.
import fs from 'node:fs';
const E = '\x1b[';
let s = `${E}2J${E}H${E}1mBold${E}22m ${E}2mDim${E}22m ${E}3mItalic${E}23m ${E}4mUnder${E}24m ${E}4:3mCurly${E}4:0m ${E}58;2;255;0;0m${E}4mRedUL${E}59m${E}24m ${E}9mStrike${E}29m ${E}7mInverse${E}27m ${E}53mOverline${E}55m\r\n`;
for (let i = 0; i < 16; i++) s += `${E}48;5;${i}m  ${E}0m`; s += '\r\n';
for (let i = 0; i < 120; i++) s += `${E}48;2;${Math.round(255 * i / 119)};${Math.round(128 - Math.abs(64 - i))};${255 - Math.round(255 * i / 119)}m ${E}0m`; s += '\r\n';
s += 'CJK: 日本語のテキスト 한국어 中文  | Emoji: 🎉 👩‍💻 🇳🇱 ❤️ 👍🏽 | Combining: é ñ ő | RTL: مرحبا שלום\r\n';
s += 'Devanagari: नमस्ते दुनिया | Thai: สวัสดี | Math: ∀x∈ℝ ∑ ∫ ≠ ≤ | Arrows: ← ↑ → ↓ ⇒\r\n';
s += '┌──────────┬──────────┐  ╭────╮  ▁▂▃▄▅▆▇█  ░▒▓█  ⠁⠂⠄⡀⢀⠠⠐⠈\r\n│ box      │ drawing  │  │ ok │  Powerline:   \r\n└──────────┴──────────┘  ╰────╯\r\n';
s += `${E}38;5;208mOSC 8 link: ${E}0m\x1b]8;;https://example.com\x1b\\example.com\x1b]8;;\x1b\\\r\n`;
s += 'Wide at edge: ' + 'x'.repeat(60) + '日本\r\n';
fs.writeFileSync('corpus/showcase.bin', s);
