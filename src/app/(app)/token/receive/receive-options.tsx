import * as Clipboard from "expo-clipboard";
import { Platform } from "react-native";
import { useSelector } from "react-redux";
import styled, { useTheme } from "styled-components/native";
import { useRouter } from "expo-router";
import { ThemeType } from "../../../../styles/theme";
import type { RootState } from "../../../../store";
import { BlockchainIcon } from "../../../../components/BlockchainIcon/BlockchainIcon";
import { getChainIconSymbol } from "../../../../utils/getChainIconSymbol";
import CopyIcon from "../../../../assets/svg/copy.svg";
import QRCodeIcon from "../../../../assets/svg/qr-code.svg";
import { SafeAreaContainer } from "../../../../components/Styles/Layout.styles";

const ContentContainer = styled.View<{ theme: ThemeType }>`
  flex: 1;
  justify-content: flex-start;
  padding: ${(props) => props.theme.spacing.medium};
  margin-top: ${(props) => Platform.OS === "android" && "75px"};
`;

const ReceiveCardsContainer = styled.View<{ theme: ThemeType }>`
  height: 75px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background-color: ${(props) => props.theme.colors.lightDark};
  margin-bottom: ${(props) => props.theme.spacing.medium};
  border-radius: ${(props) => props.theme.borderRadius.large};
  padding: ${(props) => props.theme.spacing.medium};
`;

const ReceiveText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.large};
  color: ${(props) => props.theme.fonts.colors.primary};
`;

const TextContainer = styled.View<{ theme: ThemeType }>`
  flex-direction: row;
  align-items: center;
`;

const IconContainer = styled.View<{ theme: ThemeType }>`
  justify-content: center;
  align-items: center;
  width: 45px;
  height: 45px;
  border-radius: 100px;
  margin-right: 5px;
`;

const IconView = styled.TouchableOpacity<{ theme: ThemeType }>`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  background-color: ${(props) => props.theme.colors.primary};
  border-radius: 50px;
  padding: ${(props) => props.theme.spacing.medium};
  height: 45px;
  width: 45px;
  margin-right: ${(props) => props.theme.spacing.small};
`;

const ActionContainer = styled.View<{ theme: ThemeType }>`
  display: flex;
  flex-direction: row;
`;

interface ReceiveCardsProps {
  chainName: string;
  address: string;
  icon: React.ReactNode;
}

const ReceiveCard: React.FC<ReceiveCardsProps> = ({
  chainName,
  address,
  icon,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const handleCopy = async () => {
    await Clipboard.setStringAsync(address);
  };

  return (
    <ReceiveCardsContainer>
      <TextContainer>
        <IconContainer>{icon}</IconContainer>
        <ReceiveText>{chainName}</ReceiveText>
      </TextContainer>
      <ActionContainer>
        <IconView
          onPress={() =>
            router.replace({
              pathname: "camera",
              params: {
                chain: chainName.toLowerCase(),
              },
            })
          }
        >
          <QRCodeIcon width={20} height={20} fill={theme.colors.white} />
        </IconView>
        <IconView onPress={handleCopy}>
          <CopyIcon width={20} height={20} fill={theme.colors.white} />
        </IconView>
      </ActionContainer>
    </ReceiveCardsContainer>
  );
};

export default function ReceiveOptionsPage() {
  const ethereum = useSelector((state: RootState) => state.ethereum);
  const networks = useSelector((state: RootState) => state.ethereum.networks);

  /* ---------- SOLANA (keep same) ---------- */
  const activeSolIndex = useSelector(
    (state: RootState) => state.solana.activeIndex
  );

  const solAddress = useSelector(
    (state: RootState) =>
      state.solana.addresses?.[activeSolIndex]?.address
  );

  return (
    <SafeAreaContainer>
      <ContentContainer>

        {/* 🔹 Dynamic EVM receive cards */}
        {Object.values(networks).map((network) => {
          const chainId = network.chainId;
          const activeIndex =
            ethereum.activeIndex ?? 0;

          const address =
            ethereum.globalAddresses?.[activeIndex]?.address;

          if (!address) return null;

          return (
            <ReceiveCard
              key={`evm-receive-${chainId}`}
              chainName={network.chainName}
              address={address}
              icon={<BlockchainIcon 
                symbol={getChainIconSymbol(network.chainName, network.symbol, network.chainId)} 
                chainId={network.chainId}
                chainName={network.chainName}
                size={35} 
              />}
            />
          );
        })}

        {/* 🔹 Solana (unchanged) */}
        {solAddress && (
          <ReceiveCard
            chainName="Solana"
            address={solAddress}
            icon={<BlockchainIcon symbol="sol" size={25} />}
          />
        )}

      </ContentContainer>
    </SafeAreaContainer>
  );
}
