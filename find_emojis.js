import fs from 'fs';
import path from 'path';

function findEmojis(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findEmojis(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2500}-\u{25FF}\u{2100}-\u{214F}\u{1F1E6}-\u{1F1FF}]/gu;
      
      let match;
      const emojis = new Set();
      while ((match = emojiRegex.exec(content)) !== null) {
        emojis.add(match[0]);
      }
      
      if (emojis.size > 0) {
        fileList.push({ file: filePath, emojis: Array.from(emojis) });
      }
    }
  }

  return fileList;
}

const results = findEmojis('./src');
console.log(JSON.stringify(results, null, 2));
