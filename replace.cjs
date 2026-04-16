const fs = require('fs');
const path = require('path');

const map = {
  Star: 'BsStar',
  ShoppingBag: 'BsCartCheck',
  Gavel: 'BsBag',
  Send: 'BsSend',
  Search: 'BsSearch',
  Filter: 'BsFunnel',
  List: 'BsList',
  XCircle: 'BsXCircle',
  Check: 'BsCheckLg',
  Lock: 'BsLock',
  HelpCircle: 'BsQuestionCircle',
  Phone: 'BsTelephone',
  Coins: 'BsCoin',
  Thermometer: 'BsThermometerHalf',
  ShieldAlert: 'BsShieldExclamation',
  Eye: 'BsEye',
  Image: 'BsImage',
  Link: 'BsLink',
  FileText: 'BsFileEarmarkText',
  Trash2: 'BsTrash3',
  RefreshCw: 'BsArrowRepeat',
  Edit2: 'BsPen',
  Upload: 'BsUpload',
  ArrowUpDown: 'BsArrowDownUp',
  Sparkles: 'BsStars'
};

const DIRS = [
  'c:/javaStudy/JAVAJAVA_PROJECT/FullStack-JavaBootCamp-FrontEnd/src'
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

let files = [];
DIRS.forEach(dir => {
  files = files.concat(walk(dir));
});

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let hasChanges = false;
  let bsImportsToApply = [];
  
  // Lucide react component replaces
  const regex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/g;
  let newContent = content.replace(regex, (match, p1) => {
    let imports = p1.split(',').map(i => i.trim());
    let keptImports = [];
    
    imports.forEach(imp => {
      if (!imp) return;
      let parts = imp.split(' as ');
      let originalName = parts[0].trim();
      let alias = parts.length > 1 ? parts[1].trim() : originalName;
      
      if (map[originalName]) {
        bsImportsToApply.push({ original: originalName, alias: alias, mapped: map[originalName] });
      } else {
        keptImports.push(imp);
      }
    });

    if (bsImportsToApply.length === 0) return match;
    hasChanges = true;
    
    let bsString = `import { ${[...new Set(bsImportsToApply.map(b => b.mapped))].join(', ')} } from 'react-icons/bs';\n`;
    let res = bsString;
    if (keptImports.length > 0) {
      res += `import { ${keptImports.join(', ')} } from 'lucide-react';`;
    }
    return res;
  });

  // Replace components in JSX
  if (hasChanges) {
    bsImportsToApply.forEach(b => {
      let rx = new RegExp(`<${b.alias}( |>|/>)`, 'g');
      newContent = newContent.replace(rx, `<${b.mapped}$1`);
      
      let rxClose = new RegExp(`</${b.alias}>`, 'g');
      newContent = newContent.replace(rxClose, `</${b.mapped}>`);
    });
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});
