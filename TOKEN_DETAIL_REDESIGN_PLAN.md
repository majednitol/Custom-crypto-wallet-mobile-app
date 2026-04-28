# Token Detail Screen Redesign — Implementation Plan

## Overview
Transform the current token detail screen (`[id].tsx`) from a single-scroll layout into a **tab-based interface** with rich CoinGecko market data, matching the reference screenshots (Ethereum Classic / SecureChain designs).

---

## Current State (Screenshot 4)
- Single scroll view with: Balance, Send/Receive, About section, Add Token, NFTs, Transaction History bottom sheet
- Fetches only `price.usd` from CoinGecko
- No chart, no market stats, no performance data

## Target State (Screenshots 1-3)
- **Tab Navigation**: Info | Activity | Token | NFT
- **Info Tab**: Chain logo, balance, market price + % change, price chart, performance stats, market stats, address, Send/Receive
- **Activity Tab**: Transaction history (moved from bottom sheet)
- **Token Tab**: Add New Token + ERC-20/SPL token list
- **NFT Tab**: NFT gallery

---

## Phase 1: CoinGecko API Expansion

### 1.1 Update `fetchCryptoPrices.ts`
**Current**: Fetches only `usd` price via `/simple/price`
**New**: Create two functions:

```typescript
// Existing — keep for home screen
fetchPricesByChainIds(chainIds: number[]): Promise<Record<number, { usd: number }>>

// NEW — fetch full market data for token detail
fetchCoinGeckoMarketData(chainId: number): Promise<CoinGeckoMarketData>

// NEW — fetch chart data for price graph
fetchCoinGeckoChartData(
  chainId: number, 
  days: '1' | '7' | '30' | '90' | '365'
): Promise<{ prices: [timestamp, price][] }>
```

### 1.2 CoinGeckoMarketData Interface
```typescript
interface CoinGeckoMarketData {
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  priceChangePercentage7d: number;
  priceChangePercentage30d: number;
  priceChangePercentage1y: number;
  marketCap: number;
  totalVolume: number;
  circulatingSupply: number;
  totalSupply: number;
  ath: number;           // All Time High
  athChangePercentage: number;
  atl: number;           // All Time Low
  atlChangePercentage: number;
  lastUpdated: string;
}
```

### 1.3 API Endpoints
- **Market Data**: `GET /coins/{id}` (returns full coin data)
- **Chart Data**: `GET /coins/{id}/market_chart?vs_currency=usd&days={days}`

### 1.4 Rate Limiting Strategy
- Cache market data in AsyncStorage with 5-minute TTL
- Cache chart data with 1-hour TTL
- Show cached data immediately, refresh in background

---

## Phase 2: Redux State Extension

### 2.1 Extend `priceSlice.ts`
```typescript
interface PriceState {
  data: Record<number, { usd: number }>;           // existing
  marketData: Record<number, CoinGeckoMarketData>;  // NEW
  chartData: Record<string, { prices: [number, number][] }>; // NEW — key: "chainId:days"
  lastUpdated: number;
  status: GeneralStatus;
}
```

### 2.2 New Async Thunks
```typescript
fetchMarketData(chainId: number): Promise<CoinGeckoMarketData>
fetchChartData({ chainId, days }: { chainId: number; days: string }): Promise<ChartData>
```

---

## Phase 3: Tab Navigation Component

### 3.1 Create `TokenDetailTabs.tsx`
- Horizontal tab bar below header
- 4 tabs: Info | Activity | Token | NFT
- Active tab: gold/yellow underline (matches current theme)
- Inactive tab: grey text
- Animated tab indicator

### 3.2 State Management
```typescript
const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'token' | 'nft'>('info');
```

---

## Phase 4: Info Tab Implementation

### 4.1 Layout Structure (top to bottom)
```
┌─────────────────────────────┐
│  Chain Logo (80x80, center) │
│  0.0000 SYMBOL              │
│  Market Price: $X.XX (+X%)  │
├─────────────────────────────┤
│  Price Chart (200px height) │
│  [1D] [1W] [1M] [3M] [1Y]   │
├─────────────────────────────┤
│  Performance                │
│  1 Day    $0.00 USD         │
│  1 Week   $0.00 USD         │
│  1 Month  $0.00 USD         │
│  1 Year   $0.00 USD         │
├─────────────────────────────┤
│  Stats                      │
│  Market Cap         $X.XXB  │
│  Current Volume     $X.XXM  │
│  Max Volume         $X.XXB  │
│  1 Year Low         $X.XX   │
│  1 Year High        $X.XX   │
├─────────────────────────────┤
│  Address  0x...      [copy] │
├─────────────────────────────┤
│  [Send]        [Receive]    │
└─────────────────────────────┘
```

### 4.2 Price Chart Component
- Use `react-native-svg` for line chart
- Red line for price movement (as in screenshots)
- Grid lines (horizontal)
- Y-axis labels (min/max price)
- Touch support for tooltip (future enhancement)
- Fallback: "No chart data available" for unsupported chains

### 4.3 Performance Section
- Calculate USD returns for each period:
  - `return = balance * (currentPrice - historicalPrice)`
  - Show green for positive, red for negative

### 4.4 Stats Section
- Display market data from CoinGecko
- Format large numbers: `$1.324B USD`, `$29,178,551.13 USD`

### 4.5 Address Row
- Truncated address with copy button
- Same styling as screenshots

---

## Phase 5: Activity Tab Implementation

### 5.1 Move Transaction History
- Extract transaction list from BottomSheet
- Move to Activity tab as full-screen scrollable list
- Keep filter buttons (All, Received, Sent)
- Remove BottomSheet entirely

### 5.2 Transaction List
- Same `CryptoInfoCard` rendering
- Same `keyExtractor` fix (null-safe)
- Pull-to-refresh support

---

## Phase 6: Token Tab Implementation

### 6.1 Move Add New Token
- Move "Add New Token" button from Info tab to Token tab
- Place at top of list

### 6.2 Token List
- Display ERC-20 tokens (for EVM chains)
- Display SPL tokens (for Solana)
- Same `CryptoInfoCard` rendering as current
- Tap to navigate to token detail/send

---

## Phase 7: NFT Tab Implementation

### 7.1 Move NFT Gallery
- Move NFTs from Info tab to NFT tab
- Use existing `Nfts` component
- Display in grid or list layout

---

## Phase 8: Styling & Theme

### 8.1 Keep Current Color Palette
- Background: `#1a1a2e` (dark)
- Card background: `#16213e` 
- Primary: `#f0b90b` (gold/yellow)
- Text: `#ffffff` (white)
- Secondary text: `#8b8b8b` (grey)
- Positive: `#4ade80` (green)
- Negative: `#ef4444` (red)

### 8.2 Typography
- Use existing theme fonts (OpenSans Bold/Regular)
- Match font sizes from screenshots

---

## Phase 9: SecureChain Special Handling

### 9.1 SecureChain Price API
- SecureChain (chainId 34) uses custom price API: `https://price-api.securechain.ai/`
- Extend to fetch full market data if available
- If not available, show "No data available" with fallback

---

## File Changes Summary

### Modified Files
1. `src/utils/fetchCryptoPrices.ts` — Add market data + chart fetching
2. `src/store/priceSlice.ts` — Extend state with marketData + chartData
3. `src/app/(app)/token/[id].tsx` — Complete redesign with tabs

### New Files
1. `src/components/TokenDetailTabs/TokenDetailTabs.tsx` — Tab navigation
2. `src/components/PriceChart/PriceChart.tsx` — SVG line chart
3. `src/components/MarketStats/MarketStats.tsx` — Stats grid
4. `src/components/PerformanceStats/PerformanceStats.tsx` — Performance rows

---

## Implementation Order
1. **Phase 1** — CoinGecko API (backend)
2. **Phase 2** — Redux state extension
3. **Phase 3** — Tab component
4. **Phase 4** — Info tab (core feature)
5. **Phase 5-7** — Other tabs (move existing content)
6. **Phase 8** — Polish & styling
7. **Phase 9** — SecureChain handling

---

## DFII Score
| Dimension | Score | Notes |
|-----------|-------|-------|
| Aesthetic Impact | 4 | Matches professional crypto wallet patterns |
| Context Fit | 5 | Perfect fit for token detail screen |
| Implementation Feasibility | 4 | Well-understood patterns, CoinGecko API |
| Performance Safety | 4 | Caching strategy prevents API abuse |
| Consistency Risk | 2 | New tab pattern, but consistent with app theme |
| **DFII Total** | **15** | Excellent — execute fully |

---

## Questions for User
1. **Chart Library**: Should we use `react-native-svg` for custom chart, or install a library like `react-native-chart-kit`?
2. **Alerts Tab**: The reference screenshots show "Alerts" tab, but you requested "Info, Activity, Token, NFT" — should Alerts be included or replaced?
3. **SecureChain Chart**: Should SecureChain show the custom price chart from its API, or skip the chart section?
