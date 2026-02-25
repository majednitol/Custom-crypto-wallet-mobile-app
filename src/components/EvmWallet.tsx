// components/EvmWallet.tsx
import React, { useState } from "react";

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Button,
  Alert,
  StyleSheet,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { CustomNetwork } from "../store/types";
import {
  addNetwork,
  removeNetwork,
  setActiveChain,
  updateNetwork,
} from "../store/ethereumSlice";

export const EvmWallet = () => {
  const dispatch = useDispatch<AppDispatch>();
  const networks = useSelector((state: RootState) => state.ethereum.networks);

  const [modalVisible, setModalVisible] = useState(false);
  const [networkName, setNetworkName] = useState("");
  const [chainId, setChainId] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [symbol, setSymbol] = useState("");
  const [editingNetworkId, setEditingNetworkId] = useState<number | null>(null);

  // -------------------- Add / Update Network --------------------
  const handleSaveNetwork = () => {
    if (!networkName || !chainId || !rpcUrl || !symbol) return;

    const network: CustomNetwork = {
      chainType : "EVM",
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

  const handleRemoveNetwork = (chainId: number) => {
    Alert.alert(
      "Remove Network",
      "Are you sure you want to remove this network?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => dispatch(removeNetwork(chainId)),
        },
      ]
    );
  };

  const handleSetActiveNetwork = (chainId: number) => {
    dispatch(setActiveChain(chainId));
  };

  // -------------------- Render Network --------------------
  const renderNetwork = (network: CustomNetwork) => {
    return (
      <View key={network.chainId} style={styles.networkContainer}>
        
        <View style={styles.networkActions}>
          <Button title="Edit" onPress={() => handleEditNetwork(network)} />
          <Button
            title="Remove"
            color="red"
            onPress={() => handleRemoveNetwork(network.chainId)}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {Object.keys(networks).length === 0 && (
        <View style={styles.center}>
          <Text style={styles.infoText}>No EVM network added</Text>
        </View>
      )}

      <FlatList
        data={Object.values(networks)}
        keyExtractor={(item) => item.chainId?.toString()}
        renderItem={({ item }) => renderNetwork(item)}
        contentContainerStyle={styles.listContainer}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>Add Network</Text>
      </TouchableOpacity>

      {/* Add / Edit Network Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingNetworkId !== null ? "Edit EVM Network" : "Add EVM Network"}
            </Text>

            <TextInput
              placeholder="Network Name"
              style={styles.input}
              value={networkName}
              onChangeText={setNetworkName}
            />
            <TextInput
              placeholder="Chain ID"
              style={styles.input}
              value={chainId}
              onChangeText={setChainId}
              keyboardType="numeric"
              editable={editingNetworkId === null}
            />
            <TextInput
              placeholder="RPC URL"
              style={styles.input}
              value={rpcUrl}
              onChangeText={setRpcUrl}
            />
            <TextInput
              placeholder="Symbol"
              style={styles.input}
              value={symbol}
              onChangeText={setSymbol}
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
              <Button
                title={editingNetworkId !== null ? "Update" : "Add"}
                onPress={handleSaveNetwork}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  listContainer: { padding: 16 },
  networkContainer: { marginBottom: 24 },
  networkTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  networkActions: { flexDirection: "row", gap: 8, justifyContent: "space-between" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  infoText: { fontSize: 14, color: "#555" },
  addButton: {
    backgroundColor: "#4A90E2",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    margin: 16,
  },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", padding: 24, borderRadius: 12, width: "90%" },
  modalTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8, marginBottom: 12 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
});
