import fs from 'fs';
import path from 'path';

const file = 'src/modules/watchlist/components/StockCard.tsx';
const fullPath = path.join(process.cwd(), file);

let content = fs.readFileSync(fullPath, 'utf8');
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2500}-\u{25FF}\u{2100}-\u{214F}\u{1F1E6}-\u{1F1FF}⭐⚡🔔]/gu;

content = content.replace(emojiRegex, '');

fs.writeFileSync(fullPath, content, 'utf8');
console.log('Stripped emojis from StockCard');
