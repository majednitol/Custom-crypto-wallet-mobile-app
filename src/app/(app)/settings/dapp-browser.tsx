import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
  BackHandler,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { useSelector } from "react-redux";
import { router } from "expo-router";
import { useTheme } from "styled-components/native";
import { Wallet, parseEther, formatEther, JsonRpcProvider, Network as EthersNetwork } from "ethers";
import type { RootState } from "../../../store";
import type { ThemeType } from "../../../styles/theme";
import { generateWeb3ProviderScript } from "../../../services/web3Provider";
import { getPhrase } from "../../../hooks/useStorageState";
import { EVMService } from "../../../services/EthereumService";
import { getImportedEvmKey } from "../../../utils/importedKeyStorage";
import { truncateWalletAddress } from "../../../utils/truncateWalletAddress";
import NETWORKS from "../../../services/defaultNetwork";

const DAPP_URL = "https://lite.coinmask.org/";
const SECURECHAIN_CHAIN_ID = 34;

interface Web3Message {
  type: "web3";
  id: number;
  method: string;
  params: any[];
}

interface TxRequest {
  id: number;
  to: string;
  value: string;
  data?: string;
  from?: string;
}

interface SignRequest {
  id: number;
  message: string;
  from: string;
}

export default function DAppBrowser() {
  const theme = useTheme() as ThemeType;
  const webViewRef = useRef<WebView>(null);

  // ── State ──
  const [connected, setConnected] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(DAPP_URL);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const userDisconnected = useRef(false);

  // Approval modals
  const [txRequest, setTxRequest] = useState<TxRequest | null>(null);
  const [signRequest, setSignRequest] = useState<SignRequest | null>(null);
  const [processing, setProcessing] = useState(false);

  // ── Redux state ──
  const activeIndex = useSelector(
    (state: RootState) => state.ethereum.activeIndex ?? 0
  );
  const importedEvm = useSelector(
    (state: RootState) => state.importedAccounts?.activeEvmAddress
  );
  const ethAddress = useSelector((state: RootState) => {
    if (importedEvm) return importedEvm;
    return state.ethereum.globalAddresses?.[state.ethereum.activeIndex ?? 0]?.address ?? "";
  });

  // Use SecureChain as default chain for the browser
  const chainId = SECURECHAIN_CHAIN_ID;
  const network = NETWORKS.find((n) => n.chainId === chainId);

  // ── Injected JS ──
  const injectedScript = generateWeb3ProviderScript(ethAddress, chainId);

  // ── Android back button ──
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [canGoBack]);

  // ── Get private key ──
  const getPrivateKey = useCallback(async (): Promise<string> => {
    if (importedEvm) {
      const key = await getImportedEvmKey(importedEvm);
      if (!key) throw new Error("Failed to retrieve imported private key");
      return key;
    }
    const seedPhrase = await getPhrase();
    if (!seedPhrase) throw new Error("No seed phrase found");
    const { wallet } = EVMService.deriveWalletByIndex(seedPhrase, activeIndex);
    return wallet.privateKey;
  }, [importedEvm, activeIndex]);

  // ── Send response back to WebView ──
  const sendResponse = useCallback(
    (id: number, error: string | null, result: any) => {
      const errorArg = error ? `'${error.replace(/'/g, "\\'")}'` : "null";
      const resultArg = JSON.stringify(result);
      webViewRef.current?.injectJavaScript(
        `window._rn_resolveWeb3(${id}, ${errorArg}, ${resultArg}); true;`
      );
    },
    []
  );

  // ── Handle RPC proxy calls ──
  const handleRpcProxy = useCallback(
    async (id: number, method: string, params: any[]) => {
      try {
        if (!network) throw new Error("Network not configured");
        const ethNetwork = EthersNetwork.from(chainId);
        const provider = new JsonRpcProvider(network.rpcUrl, ethNetwork, {
          staticNetwork: true,
        });
        const result = await provider.send(method, params);
        sendResponse(id, null, result);
      } catch (err: any) {
        sendResponse(id, err.message || "RPC error", null);
      }
    },
    [chainId, network, sendResponse]
  );

  // ── WebView message handler ──
  const onMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      let msg: Web3Message;
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return; // Not a Web3 message
      }

      if (msg.type !== "web3") return;

      const { id, method, params } = msg;

      switch (method) {
        case "eth_requestAccounts":
          if (userDisconnected.current) {
            sendResponse(id, "User disconnected", null);
          } else {
            setConnected(true);
            sendResponse(id, null, [ethAddress]);
          }
          break;

        case "eth_accounts":
          sendResponse(id, null, connected ? [ethAddress] : []);
          break;

        case "eth_chainId":
          sendResponse(id, null, `0x${chainId.toString(16)}`);
          break;

        case "net_version":
          sendResponse(id, null, chainId.toString());
          break;

        case "eth_sendTransaction": {
          const txParams = params[0];
          setTxRequest({
            id,
            to: txParams.to || "",
            value: txParams.value || "0x0",
            data: txParams.data,
            from: txParams.from,
          });
          break;
        }

        case "personal_sign": {
          setSignRequest({
            id,
            message: params[0],
            from: params[1],
          });
          break;
        }

        case "eth_sign": {
          setSignRequest({
            id,
            message: params[1],
            from: params[0],
          });
          break;
        }

        case "wallet_switchEthereumChain":
          // For now, reject chain switching
          sendResponse(id, "Chain switching not supported", null);
          break;

        default:
          // Proxy other methods to RPC
          handleRpcProxy(id, method, params);
          break;
      }
    },
    [ethAddress, chainId, connected, sendResponse, handleRpcProxy]
  );

  // ── Approve transaction ──
  const approveTx = useCallback(async () => {
    if (!txRequest) return;
    setProcessing(true);
    try {
      const privateKey = await getPrivateKey();
      if (!network) throw new Error("Network not configured");

      const ethNetwork = EthersNetwork.from(chainId);
      const provider = new JsonRpcProvider(network.rpcUrl, ethNetwork, {
        staticNetwork: true,
      });
      const wallet = new Wallet(privateKey, provider);

      const tx = await wallet.sendTransaction({
        to: txRequest.to,
        value: txRequest.value,
        data: txRequest.data || "0x",
      });

      sendResponse(txRequest.id, null, tx.hash);
      setTxRequest(null);
    } catch (err: any) {
      sendResponse(txRequest.id, err.message || "Transaction failed", null);
      setTxRequest(null);
    } finally {
      setProcessing(false);
    }
  }, [txRequest, getPrivateKey, chainId, network, sendResponse]);

  // ── Approve sign ──
  const approveSign = useCallback(async () => {
    if (!signRequest) return;
    setProcessing(true);
    try {
      const privateKey = await getPrivateKey();
      const wallet = new Wallet(privateKey);
      const signature = await wallet.signMessage(
        signRequest.message.startsWith("0x")
          ? Buffer.from(signRequest.message.slice(2), "hex")
          : signRequest.message
      );
      sendResponse(signRequest.id, null, signature);
      setSignRequest(null);
    } catch (err: any) {
      sendResponse(signRequest.id, err.message || "Signing failed", null);
      setSignRequest(null);
    } finally {
      setProcessing(false);
    }
  }, [signRequest, getPrivateKey, sendResponse]);

  // ── Reject handlers ──
  const rejectTx = useCallback(() => {
    if (txRequest) {
      sendResponse(txRequest.id, "User rejected the transaction", null);
      setTxRequest(null);
    }
  }, [txRequest, sendResponse]);

  const rejectSign = useCallback(() => {
    if (signRequest) {
      sendResponse(signRequest.id, "User rejected the request", null);
      setSignRequest(null);
    }
  }, [signRequest, sendResponse]);

  // ── Disconnect ──
  const disconnect = useCallback(() => {
    userDisconnected.current = true;
    setConnected(false);
    setShowMenu(false);
    webViewRef.current?.injectJavaScript(
      `window._rn_disconnect(); true;`
    );
  }, []);

  // ── Refresh ──
  const refresh = useCallback(() => {
    userDisconnected.current = false;
    setConnected(false);
    setShowMenu(false);
    webViewRef.current?.reload();
  }, []);

  // ── Format value for display ──
  const formatTxValue = (hexValue: string): string => {
    try {
      const wei = BigInt(hexValue);
      return formatEther(wei);
    } catch {
      return "0";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.darker }]}>
      <StatusBar barStyle="light-content" />

      {/* ═══ Top Bar ═══ */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: theme.colors.cardBackground,
            borderBottomColor: theme.colors.border,
            paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight ?? 24,
          },
        ]}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.navIcon, { color: theme.colors.white }]}>←</Text>
        </TouchableOpacity>

        {/* URL bar */}
        <View
          style={[
            styles.urlBar,
            { backgroundColor: theme.colors.darker, borderColor: theme.colors.border },
          ]}
        >
          <Text
            style={[styles.urlText, { color: theme.colors.lightGrey }]}
            numberOfLines={1}
          >
            {currentUrl}
          </Text>
        </View>

        {/* Home button */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => webViewRef.current?.injectJavaScript(`window.location.href='${DAPP_URL}'; true;`)}
        >
          <Text style={[styles.navIcon, { color: theme.colors.white }]}>⌂</Text>
        </TouchableOpacity>

        {/* Menu button */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Text style={[styles.navIcon, { color: theme.colors.white }]}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ Dropdown Menu ═══ */}
      {showMenu && (
        <View
          style={[
            styles.menuDropdown,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              top: Platform.OS === "ios" ? 100 : (StatusBar.currentHeight ?? 24) + 56,
            },
          ]}
        >
          <TouchableOpacity style={styles.menuItem} onPress={refresh}>
            <Text style={[styles.menuItemText, { color: theme.colors.white }]}>
              🔄  Refresh
            </Text>
          </TouchableOpacity>
          {connected && (
            <TouchableOpacity style={styles.menuItem} onPress={disconnect}>
              <Text style={[styles.menuItemText, { color: theme.colors.error }]}>
                ↪  Disconnect
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ═══ WebView ═══ */}
      <WebView
        ref={webViewRef}
        source={{ uri: DAPP_URL }}
        style={styles.webView}
        injectedJavaScriptBeforeContentLoaded={injectedScript}
        onMessage={onMessage}
        onNavigationStateChange={(navState) => {
          setCurrentUrl(navState.url);
          setCanGoBack(navState.canGoBack);
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={true}
        cacheEnabled={true}
        onShouldStartLoadWithRequest={(request) => {
          // Block navigation away from CoinMask for security
          if (
            request.url.startsWith("https://lite.coinmask.org") ||
            request.url.startsWith("https://coinmask.org") ||
            request.url.startsWith("about:") ||
            request.url.startsWith("data:")
          ) {
            return true;
          }
          // Allow google fonts, etc.
          if (
            request.url.includes("fonts.googleapis.com") ||
            request.url.includes("fonts.gstatic.com") ||
            request.url.includes("googletagmanager.com")
          ) {
            return true;
          }
          return true; // Allow all for now since dApp may load external resources
        }}
      />

      {/* ═══ Loading Bar ═══ */}
      {loading && (
        <View style={[styles.loadingBar, { backgroundColor: theme.colors.primary }]} />
      )}

      {/* ═══ Transaction Approval Modal ═══ */}
      <Modal
        visible={!!txRequest}
        transparent
        animationType="slide"
        onRequestClose={rejectTx}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.cardBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.white }]}>
              Confirm Transaction
            </Text>

            <View style={styles.modalDivider} />

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.colors.lightGrey }]}>
                To
              </Text>
              <Text style={[styles.modalValue, { color: theme.colors.white }]}>
                {txRequest ? truncateWalletAddress(txRequest.to) : ""}
              </Text>
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.colors.lightGrey }]}>
                Value
              </Text>
              <Text style={[styles.modalValue, { color: theme.colors.primary }]}>
                {txRequest ? formatTxValue(txRequest.value) : "0"} {network?.symbol || "ETH"}
              </Text>
            </View>

            {txRequest?.data && txRequest.data !== "0x" && (
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: theme.colors.lightGrey }]}>
                  Contract Call
                </Text>
                <Text style={[styles.modalValue, { color: theme.colors.white }]}>
                  Yes
                </Text>
              </View>
            )}

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.colors.lightGrey }]}>
                Network
              </Text>
              <Text style={[styles.modalValue, { color: theme.colors.white }]}>
                {network?.chainName || "Unknown"}
              </Text>
            </View>

            <View style={styles.modalDivider} />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.rejectButton,
                  { borderColor: theme.colors.error },
                ]}
                onPress={rejectTx}
                disabled={processing}
              >
                <Text style={[styles.rejectText, { color: theme.colors.error }]}>
                  Reject
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.approveButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={approveTx}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={theme.colors.dark} />
                ) : (
                  <Text style={[styles.approveText, { color: theme.colors.dark }]}>
                    Approve
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ Sign Approval Modal ═══ */}
      <Modal
        visible={!!signRequest}
        transparent
        animationType="slide"
        onRequestClose={rejectSign}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.cardBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.white }]}>
              Sign Message
            </Text>

            <View style={styles.modalDivider} />

            <View style={styles.messageBox}>
              <Text
                style={[styles.messageText, { color: theme.colors.lightGrey }]}
                numberOfLines={10}
              >
                {signRequest?.message || ""}
              </Text>
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.colors.lightGrey }]}>
                From
              </Text>
              <Text style={[styles.modalValue, { color: theme.colors.white }]}>
                {signRequest ? truncateWalletAddress(signRequest.from) : ""}
              </Text>
            </View>

            <View style={styles.modalDivider} />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.rejectButton,
                  { borderColor: theme.colors.error },
                ]}
                onPress={rejectSign}
                disabled={processing}
              >
                <Text style={[styles.rejectText, { color: theme.colors.error }]}>
                  Reject
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.approveButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={approveSign}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={theme.colors.dark} />
                ) : (
                  <Text style={[styles.approveText, { color: theme.colors.dark }]}>
                    Sign
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    gap: 4,
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  navIcon: {
    fontSize: 20,
    fontWeight: "bold",
  },
  urlBar: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  urlText: {
    fontSize: 13,
  },
  connectedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
  },
  connectedText: {
    fontSize: 11,
    fontWeight: "700",
  },
  menuDropdown: {
    position: "absolute",
    right: 8,
    zIndex: 100,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    minWidth: 160,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "600",
  },
  webView: {
    flex: 1,
  },
  loadingBar: {
    height: 3,
    width: "100%",
  },
  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 16,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  modalLabel: {
    fontSize: 14,
  },
  modalValue: {
    fontSize: 14,
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },
  messageBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  approveButton: {},
  rejectText: {
    fontSize: 16,
    fontWeight: "700",
  },
  approveText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
