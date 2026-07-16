import fs from 'fs';
import path from 'path';

const files = [
  'src/modules/watchlist/components/ScreenerFilter.tsx',
  'src/modules/trades/components/ImportCSVModal.tsx',
  'src/modules/reports/components/ReportView.tsx',
  'src/modules/plans/pages/TradingPlansPage.tsx',
  'src/modules/category/pages/CategoryPage.tsx',
  'src/modules/shared/utils/commodityData.ts'
];

function run() {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2500}-\u{25FF}\u{2100}-\u{214F}\u{1F1E6}-\u{1F1FF}]/gu;
  
  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    if (file.includes('commodityData.ts')) {
        // Just remove the emoji from the string or leave empty string if no spaces
        content = content.replace(/icon:\s*'[^']+'/g, "icon: ''");
    } else {
        // Strip emojis
        content = content.replace(emojiRegex, '');
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Stripped emojis in', file);
  }
}

run();
