import { NativeModules, Platform } from "react-native";
import Constants from "expo-constants";

const isExpoGo = Constants.appOwnership === "expo";

const Didcomm = !isExpoGo && NativeModules.Didcomm
  ? NativeModules.Didcomm
  : null;

export default {
  helloWorld: async (): Promise<string> => {
    if (!Didcomm) {
      console.warn("Didcomm native module not available in Expo Go");
      return "Hello from JS (Expo Go)";
    }
    return Didcomm.helloWorld();
  },
};
