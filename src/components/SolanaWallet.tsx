import React from "react";
import styled from "styled-components/native";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { setSelectedNetwork, fetchSolanaBalance, fetchSolanaTransactions } from "../store/solanaSlice";
import { ThemeType } from "../styles/theme";
import { BlockchainIcon } from "./BlockchainIcon/BlockchainIcon";
import { MotiView } from "moti";

const ScrollWrapper = styled.ScrollView`
  flex: 1;
`;

const ListContent = styled.View`
  padding: 16px;
  padding-top: 8px;
  padding-bottom: 32px;
`;

const SectionTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.header};
  color: ${(props) => props.theme.fonts.colors.primary};
  margin-bottom: 16px;
`;

const NetworkCard = styled.TouchableOpacity<{ theme: ThemeType; isActive?: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme, isActive }) =>
    isActive ? "rgba(240, 185, 11, 0.1)" : theme.colors.cardBackground};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme, isActive }) =>
    isActive ? "rgba(240, 185, 11, 0.4)" : theme.colors.border};
`;

const NetworkIconContainer = styled.View`
  justify-content: center;
  align-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background-color: rgba(240, 185, 11, 0.12);
  margin-right: 14px;
`;

const NetworkInfo = styled.View`
  flex: 1;
  margin-right: 12px;
`;

const NetworkName = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.white};
  margin-bottom: 2px;
`;

const NetworkMeta = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.small};
  color: ${(props) => props.theme.colors.lightGrey};
`;

const ActiveDot = styled.View`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: #f0b90b;
`;

const SOLANA_NETWORKS = [
  {
    id: "mainnet",
    name: "Solana Mainnet",
    rpcUrl: "Solana Mainnet RPC (Helius)",
    symbol: "SOL",
  },
  {
    id: "devnet",
    name: "Solana devnet",
    rpcUrl: "Solana devnet RPC (Helius)",
    symbol: "SOL",
  },
];

export const SolanaWallet = () => {
  const dispatch = useDispatch<AppDispatch>();
  const activeNetwork = useSelector((state: RootState) => state.solana.selectedNetwork ?? "devnet");
  const addresses = useSelector((state: RootState) => state.solana.addresses);
  const activeIndex = useSelector((state: RootState) => state.solana.activeIndex);

  const handleSetActive = (network: "mainnet" | "devnet") => {
    dispatch(setSelectedNetwork(network));
    const activeAddress = addresses[activeIndex]?.address;
    if (activeAddress) {
      dispatch(fetchSolanaBalance(activeAddress));
      dispatch(fetchSolanaTransactions(activeAddress));
    }
  };

  return (
    <ScrollWrapper showsVerticalScrollIndicator={false}>
      <ListContent>
        <SectionTitle>Solana Networks</SectionTitle>

        {SOLANA_NETWORKS.map((item, index) => {
          const isActive = item.id === activeNetwork;
          return (
            <MotiView
              key={item.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 500, delay: index * 100 }}
              style={{ width: "100%" }}
            >
              <NetworkCard
                isActive={isActive}
                onPress={() => handleSetActive(item.id as "mainnet" | "devnet")}
                activeOpacity={0.7}
              >
                <NetworkIconContainer>
                  <BlockchainIcon symbol={item.symbol} size={28} />
                </NetworkIconContainer>
                <NetworkInfo>
                  <NetworkName numberOfLines={1} ellipsizeMode="tail">
                    {item.name} {isActive && "• Active"}
                  </NetworkName>
                  <NetworkMeta numberOfLines={1} ellipsizeMode="tail">
                    {item.rpcUrl}
                  </NetworkMeta>
                </NetworkInfo>
                {isActive && <ActiveDot />}
              </NetworkCard>
            </MotiView>
          );
        })}
      </ListContent>
    </ScrollWrapper>
  );
};
