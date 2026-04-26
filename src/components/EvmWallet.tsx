// components/EvmWallet.tsx
import React, { useState } from "react";
import {
  View,
  FlatList,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import styled, { useTheme } from "styled-components/native";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { CustomNetwork } from "../store/types";
import {
  addNetwork,
  removeNetwork,
  setActiveChain,
  updateNetwork,
} from "../store/ethereumSlice";
import { ThemeType } from "../styles/theme";
import EditIcon from "../assets/svg/edit.svg";
import TrashIcon from "../assets/svg/clear.svg";
import CloseIcon from "../assets/svg/close.svg";
import CheckIcon from "../assets/svg/check.svg";
import { BlockchainIcon } from "./BlockchainIcon/BlockchainIcon";

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

const ActionButtons = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const IconButton = styled.TouchableOpacity`
  justify-content: center;
  align-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background-color: ${({ theme }) => theme.colors.primary};
`;

const AddButton = styled.TouchableOpacity<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.primary};
  border-radius: 12px;
  padding: 16px;
  align-items: center;
  margin-top: 8px;
`;

const AddButtonText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.dark};
`;

const EmptyState = styled.View`
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
`;

const EmptyText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.lightGrey};
`;

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.7);
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ModalContent = styled.View<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.cardBackground};
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ModalTitle = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.title};
  color: ${(props) => props.theme.colors.white};
`;

const CloseButton = styled.TouchableOpacity`
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.colors.grey};
`;

const Input = styled.TextInput<{ theme: ThemeType }>`
  background-color: ${(props) => props.theme.colors.dark};
  border-radius: 12px;
  padding: 14px 16px;
  color: ${(props) => props.theme.colors.white};
  font-family: ${(props) => props.theme.fonts.families.openRegular};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  margin-bottom: 12px;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const ModalButtons = styled.View`
  flex-direction: row;
  gap: 12px;
  margin-top: 8px;
`;

const CancelButton = styled.TouchableOpacity<{ theme: ThemeType }>`
  flex: 1;
  background-color: ${(props) => props.theme.colors.grey};
  border-radius: 12px;
  padding: 14px;
  align-items: center;
`;

const CancelButtonText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.white};
`;

const SaveButton = styled.TouchableOpacity<{ theme: ThemeType }>`
  flex: 1;
  background-color: ${(props) => props.theme.colors.primary};
  border-radius: 12px;
  padding: 14px;
  align-items: center;
`;

const SaveButtonText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.dark};
`;

export const EvmWallet = () => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const networks = useSelector((state: RootState) => state.ethereum.networks);
  const activeChainId = useSelector((state: RootState) => state.ethereum.activeChainId);

  const [modalVisible, setModalVisible] = useState(false);
  const [networkName, setNetworkName] = useState("");
  const [chainId, setChainId] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [symbol, setSymbol] = useState("");
  const [editingNetworkId, setEditingNetworkId] = useState<number | null>(null);

  const handleSaveNetwork = () => {
    if (!networkName || !chainId || !rpcUrl || !symbol) return;

    const network: CustomNetwork = {
      chainType: "EVM",
      chainId: Number(chainId),
      chainName: networkName,
      rpcUrl,
      symbol,
    };

    if (editingNetworkId !== null) {
      dispatch(updateNetwork(network));
    } else {
      dispatch(addNetwork(network));
    }

    resetForm();
  };

  const resetForm = () => {
    setNetworkName("");
    setChainId("");
    setRpcUrl("");
    setSymbol("");
    setEditingNetworkId(null);
    setModalVisible(false);
  };

  const handleEditNetwork = (network: CustomNetwork) => {
    setEditingNetworkId(network.chainId);
    setNetworkName(network.chainName);
    setChainId(network.chainId?.toString());
    setRpcUrl(network.rpcUrl);
    setSymbol(network.symbol);
    setModalVisible(true);
  };

  const handleRemoveNetwork = (network: CustomNetwork) => {
    Alert.alert(
      "Remove Network",
      `Are you sure you want to remove ${network.chainName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => dispatch(removeNetwork(network.chainId)),
        },
      ]
    );
  };

  const handleSetActive = (chainId: number) => {
    dispatch(setActiveChain(chainId));
  };

  const renderNetwork = ({ item }: { item: CustomNetwork }) => {
    const isActive = item.chainId === activeChainId;

    return (
      <NetworkCard
        isActive={isActive}
        onPress={() => handleSetActive(item.chainId)}
        activeOpacity={0.7}
      >
        <NetworkIconContainer>
          <BlockchainIcon symbol={item.symbol} size={28} />
        </NetworkIconContainer>
        <NetworkInfo>
          <NetworkName>
            {item.chainName} {isActive && "• Active"}
          </NetworkName>
          <NetworkMeta>
            Chain ID: {item.chainId} · {item.symbol}
          </NetworkMeta>
        </NetworkInfo>
        <ActionButtons>
          <IconButton onPress={() => handleEditNetwork(item)}>
            <EditIcon width={16} height={16} fill={theme.colors.lightGrey} />
          </IconButton>
          <IconButton onPress={() => handleRemoveNetwork(item)}>
            <TrashIcon width={16} height={16} fill={theme.colors.error} />
          </IconButton>
        </ActionButtons>
      </NetworkCard>
    );
  };

  const networkList = Object.values(networks);

  return (
    <ScrollWrapper showsVerticalScrollIndicator={false}>
      <ListContent>
        <SectionTitle>Networks</SectionTitle>

        {networkList.length === 0 ? (
          <EmptyState>
            <EmptyText>No custom networks added yet</EmptyText>
          </EmptyState>
        ) : (
          networkList.map((item) => (
            <NetworkCard
              key={item.chainId}
              isActive={item.chainId === activeChainId}
              onPress={() => handleSetActive(item.chainId)}
              activeOpacity={0.7}
            >
              <NetworkIconContainer>
                <BlockchainIcon symbol={item.symbol} size={28} />
              </NetworkIconContainer>
          <NetworkInfo>
            <NetworkName numberOfLines={1} ellipsizeMode="tail">
              {item.chainName} {item.chainId === activeChainId && "• Active"}
            </NetworkName>
            <NetworkMeta numberOfLines={1} ellipsizeMode="tail">
              Chain ID: {item.chainId} · {item.symbol}
            </NetworkMeta>
          </NetworkInfo>
              <ActionButtons>
                <IconButton onPress={() => handleEditNetwork(item)}>
                  <EditIcon width={16} height={16} fill={theme.colors.dark} />
                </IconButton>
                <IconButton onPress={() => handleRemoveNetwork(item)}>
                  <TrashIcon width={16} height={16} fill={theme.colors.dark} />
                </IconButton>
              </ActionButtons>
            </NetworkCard>
          ))
        )}

        <AddButton onPress={() => setModalVisible(true)}>
          <AddButtonText>Add Network</AddButtonText>
        </AddButton>
      </ListContent>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetForm}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ModalOverlay>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%", maxWidth: 400 }}
            >
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <ModalContent>
                  <ModalHeader>
                    <ModalTitle>
                      {editingNetworkId !== null ? "Edit Network" : "Add EVM Network"}
                    </ModalTitle>
                    <CloseButton onPress={resetForm}>
                      <CloseIcon width={18} height={18} fill={theme.colors.lightGrey} />
                    </CloseButton>
                  </ModalHeader>

                  <Input
                    placeholder="Network Name"
                    placeholderTextColor={theme.colors.lightGrey}
                    value={networkName}
                    onChangeText={setNetworkName}
                  />
                  <Input
                    placeholder="Chain ID"
                    placeholderTextColor={theme.colors.lightGrey}
                    value={chainId}
                    onChangeText={setChainId}
                    keyboardType="numeric"
                    editable={editingNetworkId === null}
                  />
                  <Input
                    placeholder="RPC URL"
                    placeholderTextColor={theme.colors.lightGrey}
                    value={rpcUrl}
                    onChangeText={setRpcUrl}
                    autoCapitalize="none"
                  />
                  <Input
                    placeholder="Symbol"
                    placeholderTextColor={theme.colors.lightGrey}
                    value={symbol}
                    onChangeText={setSymbol}
                    autoCapitalize="characters"
                  />

                  <ModalButtons>
                    <CancelButton onPress={resetForm}>
                      <CancelButtonText>Cancel</CancelButtonText>
                    </CancelButton>
                    <SaveButton onPress={handleSaveNetwork}>
                      <SaveButtonText>
                        {editingNetworkId !== null ? "Update" : "Add"}
                      </SaveButtonText>
                    </SaveButton>
                  </ModalButtons>
                </ModalContent>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </ModalOverlay>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollWrapper>
  );
};
