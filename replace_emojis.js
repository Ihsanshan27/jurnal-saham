import fs from 'fs';
import path from 'path';

const replacements = [
  // Admin pages
  {
    file: 'src/modules/admin/pages/AdminPlaceholderPage.tsx',
    find: /<div className="empty-state-icon">🧩<\/div>/g,
    replace: `<div className="empty-state-icon"><Puzzle size={48} className="text-gray-400" /></div>`,
    imports: `import { Puzzle } from 'lucide-react';\n`
  },
  // We already did AdminUsersPage.tsx and AnalyticsCategoriesTab.tsx

  // Auth pages
  {
    file: 'src/modules/auth/pages/ForgotPasswordPage.tsx',
    find: /<div className="login-logo-icon">🔐<\/div>/g,
    replace: `<div className="login-logo-icon"><Lock size={48} className="text-blue-500" /></div>`,
    imports: `import { Lock } from 'lucide-react';\n`
  },
  {
    file: 'src/modules/auth/pages/LoginPage.tsx',
    find: /<div className="login-logo-icon">📈<\/div>/g,
    replace: `<div className="login-logo-icon"><TrendingUp size={48} className="text-blue-500" /></div>`,
    imports: `import { TrendingUp } from 'lucide-react';\n`
  },
  {
    file: 'src/modules/auth/pages/RegisterPage.tsx',
    find: /<div className="login-logo-icon">📈<\/div>/g,
    replace: `<div className="login-logo-icon"><TrendingUp size={48} className="text-blue-500" /></div>`,
    imports: `import { TrendingUp } from 'lucide-react';\n`
  },
  {
    file: 'src/modules/auth/pages/ResetPasswordPage.tsx',
    find: /<div className="login-logo-icon">🔒<\/div>/g,
    replace: `<div className="login-logo-icon"><Lock size={48} className="text-blue-500" /></div>`,
    imports: `import { Lock } from 'lucide-react';\n`
  },
  {
    file: 'src/modules/auth/pages/VerifyEmailPage.tsx',
    find: /<div className="login-logo-icon">📩<\/div>/g,
    replace: `<div className="login-logo-icon"><Mail size={48} className="text-blue-500" /></div>`,
    imports: `import { Mail } from 'lucide-react';\n`
  },
  // CategoryPage.tsx
  {
    file: 'src/modules/category/pages/CategoryPage.tsx',
    replacements: [
      { find: /'📦'/g, replace: "<Package size={24} />" },
      { find: /'▲'/g, replace: "<Triangle size={16} fill=\"currentColor\" />" },
      { find: /'▼'/g, replace: "<Triangle size={16} fill=\"currentColor\" style={{ transform: 'rotate(180deg)' }} />" },
      { find: />📂</g, replace: "><Folder size={16} /> <" },
      { find: />📋</g, replace: "><Clipboard size={16} /> <" },
      { find: />📈</g, replace: "><TrendingUp size={16} /> <" },
      { find: />📉</g, replace: "><TrendingDown size={16} /> <" },
      { find: />🔍</g, replace: "><Search size={16} /> <" },
      { find: /"empty-state-icon">📂<\/div>/g, replace: `"empty-state-icon"><Folder size={48} className="text-gray-400" /></div>` }
    ],
    imports: `import { Package, Triangle, Folder, Clipboard, TrendingUp, TrendingDown, Search } from 'lucide-react';\n`
  },
  // Mentor Pages
  {
    file: 'src/modules/mentor/pages/MentorTraderDetailPage.tsx',
    replacements: [
      { find: /"empty-state-icon">📭<\/div>/g, replace: `"empty-state-icon"><Mailbox size={48} className="text-gray-400" /></div>` },
      { find: /"empty-state-icon">📝<\/div>/g, replace: `"empty-state-icon"><FileText size={48} className="text-gray-400" /></div>` }
    ],
    imports: `import { Mailbox, FileText } from 'lucide-react';\n`
  },
  {
    file: 'src/modules/mentor/pages/MentorTradersPage.tsx',
    find: /"empty-state-icon">👥<\/div>/g,
    replace: `"empty-state-icon"><Users size={48} className="text-gray-400" /></div>`,
    imports: `import { Users } from 'lucide-react';\n`
  },
  // TradingPlansPage.tsx
  {
    file: 'src/modules/plans/pages/TradingPlansPage.tsx',
    replacements: [
      { find: /"empty-state-icon">📝<\/div>/g, replace: `"empty-state-icon"><FileText size={48} className="text-gray-400" /></div>` },
      { find: /"empty-state-icon">📊<\/div>/g, replace: `"empty-state-icon"><BarChart size={48} className="text-gray-400" /></div>` },
      { find: />⚠</g, replace: "><AlertTriangle size={16} /> <" },
      { find: />💾</g, replace: "><Save size={16} /> <" },
      { find: />📋</g, replace: "><Clipboard size={16} /> <" }
    ],
    imports: `import { FileText, BarChart, AlertTriangle, Save, Clipboard } from 'lucide-react';\n`
  },
  // PortfolioPage.tsx
  {
    file: 'src/modules/portfolios/pages/PortfolioPage.tsx',
    find: /"empty-state-icon">💼<\/div>/g,
    replace: `"empty-state-icon"><Briefcase size={48} className="text-gray-400" /></div>`,
    imports: `import { Briefcase } from 'lucide-react';\n`
  },
  // ReportView.tsx
  {
    file: 'src/modules/reports/components/ReportView.tsx',
    find: /"empty-state-icon">📄<\/div>/g,
    replace: `"empty-state-icon"><File size={48} className="text-gray-400" /></div>`,
    imports: `import { File } from 'lucide-react';\n`
  },
  // ImportCSVModal.tsx
  {
    file: 'src/modules/trades/components/ImportCSVModal.tsx',
    replacements: [
      { find: />📥/g, replace: "><Download size={20} /> <" },
      { find: />📄/g, replace: "><File size={16} /> <" },
      { find: />📁/g, replace: "><Folder size={16} /> <" },
      { find: />⚠/g, replace: "><AlertTriangle size={16} /> <" }
    ],
    imports: `import { Download, File, Folder, AlertTriangle } from 'lucide-react';\n`
  },
  // BsjpRecapPage.tsx
  {
    file: 'src/modules/trades/pages/BsjpRecapPage.tsx',
    replacements: [
      { find: /"empty-state-icon">📊<\/div>/g, replace: `"empty-state-icon"><BarChart size={48} className="text-gray-400" /></div>` },
      { find: />🇺🇸</g, replace: "><span style={{fontSize: '0.8em', marginLeft: '4px'}}>(US)</span><" }
    ],
    imports: `import { BarChart } from 'lucide-react';\n`
  },
  // TradesPage.tsx
  {
    file: 'src/modules/trades/pages/TradesPage.tsx',
    find: />🇺🇸</g,
    replace: "><span style={{fontSize: '0.8em', marginLeft: '4px'}}>(US)</span><"
  },
  // NewTradePage.tsx
  {
    file: 'src/modules/trades/pages/NewTradePage.tsx',
    find: /"trade-type-icon">★<\/div>/g,
    replace: `"trade-type-icon"><Star size={24} /></div>`,
    imports: `import { Star } from 'lucide-react';\n`
  },
  // TradeDetailPage.tsx
  {
    file: 'src/modules/trades/pages/TradeDetailPage.tsx',
    replacements: [
      { find: /"trade-type-icon">★<\/div>/g, replace: `"trade-type-icon"><Star size={24} /></div>` },
      { find: /🖼/g, replace: "Icon" }, // If it's a small icon inline, might need a better replacement
      { find: /👤/g, replace: "" },
      { find: /📅/g, replace: "" }
    ],
    imports: `import { Star, Image as ImageIcon, User, Calendar } from 'lucide-react';\n`
  }
];

function run() {
  for (const rep of replacements) {
    const fullPath = path.join(process.cwd(), rep.file);
    if (!fs.existsSync(fullPath)) {
      console.warn('Not found:', fullPath);
      continue;
    }
    let content = fs.readFileSync(fullPath, 'utf8');
    
    if (rep.find && rep.replace) {
      content = content.replace(rep.find, rep.replace);
    }
    if (rep.replacements) {
      for (const r of rep.replacements) {
        content = content.replace(r.find, r.replace);
      }
    }
    
    // add imports if needed
    if (rep.imports && !content.includes(rep.imports.split(' ')[2])) { // crude check for already imported
      content = rep.imports + content;
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated', rep.file);
  }
}

run();
