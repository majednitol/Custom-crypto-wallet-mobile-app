const fs = require('fs');
const path = require('path');
const iconDir = path.join(__dirname, 'node_modules', '@vnaidin', 'react-native-cryptocurrency-icons', 'icons', '128');
if (fs.existsSync(iconDir)) {
  const files = fs.readdirSync(iconDir);
  const names = files.map(f => f.replace('.png', '').toLowerCase());
  const toCheck = ['arb', 'arbitrum', 'op', 'optimism', 'base', 'scroll', 'blast', 'zora', 'linea', 'zksync', 'matic', 'polygon', 'bnb', 'bsc', 'avax', 'avalanche'];
  toCheck.forEach(c => {
    console.log(`${c}: ${names.includes(c) ? 'YES' : 'NO'}`);
  });
} else {
  console.log('Icon dir not found');
}
