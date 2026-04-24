import { Redirect } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "../store";

export default function Index() {
  const isUnlocked = useSelector((state: RootState) => state.biometrics.unlocked);
  const ethAddresses = useSelector((state: RootState) => state.ethereum.globalAddresses);
  
  const hasWallet = ethAddresses && ethAddresses.length > 0;

  if (!hasWallet) {
    return <Redirect href="/(wallet)/setup/wallet-setup" />;
  }

  if (!isUnlocked) {
    return <Redirect href="/(wallet)/unlock" />;
  }

  return <Redirect href="/(app)" />;
}
