import React from 'react';
import { Image } from 'expo-image';
import { CryptoIcon } from '@vnaidin/react-native-cryptocurrency-icons';
import { View } from 'react-native';

interface BlockchainIconProps {
  symbol: string;
  size?: number;
  chainId?: number | string;
  chainName?: string;
}

// Map modern L2s to Trust Wallet asset IDs
const TRUST_WALLET_ASSETS: Record<string, string> = {
  'base': 'base',
  'scroll': 'scroll',
  'blast': 'blast',
  'linea': 'linea',
  'celo': 'celo',
  'zksync': 'zksync',
  'taiko': 'taiko',
  'mantle': 'mantle',
  'optimism': 'optimism',
  'arbitrum': 'arbitrum',
  'polygon': 'polygon',
  'binance': 'binance',
  'ethereum': 'ethereum',
};

export const BlockchainIcon: React.FC<BlockchainIconProps> = ({ 
  symbol, 
  size = 32, 
  chainId, 
  chainName 
}) => {
  const name = (chainName || '').toLowerCase();
  const lowerSymbol = (symbol || '').toLowerCase();
  const id = Number(chainId);

  // 1. Identify if this is a chain that we should fetch from Trust Wallet Assets
  let trustWalletKey = '';
  if (name.includes('base') || id === 8453 || id === 84532) trustWalletKey = 'base';
  else if (name.includes('scroll') || id === 534352 || id === 534351) trustWalletKey = 'scroll';
  else if (name.includes('blast') || id === 81457 || id === 168587773) trustWalletKey = 'blast';
  else if (name.includes('linea') || id === 59144 || id === 59141) trustWalletKey = 'linea';
  else if (name.includes('celo') || lowerSymbol === 'celo' || id === 42220) trustWalletKey = 'celo';
  else if (name.includes('zksync') || id === 324 || id === 300) trustWalletKey = 'zksync';
  else if (name.includes('optimism') || lowerSymbol === 'op' || id === 10 || id === 11155420) trustWalletKey = 'optimism';
  else if (name.includes('arbitrum') || lowerSymbol === 'arb' || id === 42161 || id === 421614) trustWalletKey = 'arbitrum';
  else if (name.includes('polygon') || lowerSymbol === 'matic' || lowerSymbol === 'pol' || id === 137 || id === 80002) trustWalletKey = 'polygon';
  else if (name.includes('binance') || lowerSymbol === 'bnb' || lowerSymbol === 'bsc' || id === 56 || id === 97) trustWalletKey = 'binance';
  else if (name.includes('ethereum') || lowerSymbol === 'eth' || id === 1 || id === 11155111) trustWalletKey = 'ethereum';
  else if (name.includes('securechain') || lowerSymbol === 'scai' || id === 34 || id === 3434) {
    return (
      <Image
        source={require('../../assets/svg/securechain.jpeg')}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="contain"
      />
    );
  }

  if (trustWalletKey) {
    return (
      <Image
        source={`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${trustWalletKey}/info/logo.png`}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="contain"
        cachePolicy="disk"
      />
    );
  }

  // 2. Otherwise use the CryptoIcon package (Arbitrum, Optimism, Polygon, etc.)
  return <CryptoIcon symbol={symbol} size={size} />;
};
