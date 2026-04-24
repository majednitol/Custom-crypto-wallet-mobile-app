import { getRandomValues as expoCryptoGetRandomValues } from "expo-crypto";
import { Buffer } from "buffer";
import process from "process";

if (typeof global.process === 'undefined' || !global.process.version) {
  global.process = {
    ...process,
    version: 'v16.0.0',
    browser: true,
    env: { NODE_ENV: 'development' },
    nextTick: (fn: any, ...args: any[]) => setTimeout(() => fn(...args), 0),
  };
}

global.Buffer = Buffer;

// getRandomValues polyfill
class Crypto {
  getRandomValues = expoCryptoGetRandomValues;
}

const webCrypto = typeof crypto !== "undefined" ? crypto : new Crypto();

(() => {
  if (typeof crypto === "undefined") {
    Object.defineProperty(window, "crypto", {
      configurable: true,
      enumerable: true,
      get: () => webCrypto,
    });
  }
})();