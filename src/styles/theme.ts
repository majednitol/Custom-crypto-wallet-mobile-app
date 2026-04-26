export type ThemeType = {
  colors: {
    primary: string;
    primaryLight: string;
    dark: string;
    darker: string;
    lightDark: string;
    cardBackground: string;
    accent: string;
    background: string;
    highlight: string;
    white: string;
    offWhite: string;
    lightGrey: string;
    grey: string;
    muted: string;
    error: string;
    success: string;
    ethereum: string;
    solana: string;
    border: string;
    borderLight: string;
    primaryLinearGradient: string[];
    secondaryLinearGradient: string[];
    cardGradient: string[];
    gold: string;
    blue: string;
  };
  fonts: {
    families: {
      openRegular: string;
      openBold: string;
      robotoRegular: string;
      robotoBold: string;
    };
    sizes: {
      tiny: string;
      small: string;
      normal: string;
      large: string;
      header: string;
      title: string;
      huge: string;
      uberHuge: string;
    };
    weights: {
      normal: string;
      bold: string;
    };
    colors: {
      primary: string;
      dark: string;
      accent: string;
      background: string;
      highlight: string;
    };
  };
  spacing: {
    tiny: string;
    small: string;
    medium: string;
    large: string;
    huge: string;
  };
  borderRadius: {
    small: string;
    default: string;
    medium: string;
    large: string;
    extraLarge: string;
    pill: string;
  };
};

const Theme: ThemeType = {
  colors: {
    // Premium dark crypto palette
    primary: "#F0B90B",          // Binance Gold - primary accent
    primaryLight: "#FFD700",     // Lighter gold
    gold: "#F0B90B",
    blue: "#3772FF",             // Electric blue accent
    dark: "#0B0E14",             // Deep navy black background
    darker: "#080A0F",           // Even darker
    lightDark: "#151920",        // Card/surface background
    cardBackground: "#1A1F2E",   // Slightly lighter card bg
    accent: "#F97068",
    background: "#0B0E14",
    highlight: "#D1D646",
    white: "#FFFFFF",
    offWhite: "#F5F5F5",
    lightGrey: "#8A8F9E",        // Secondary text
    grey: "#5A6072",             // Muted elements
    muted: "#3A3F4E",            // Borders, dividers
    error: "#FF4D4F",
    success: "#00C087",
    ethereum: "#C8B3F4",
    solana: "#00DCFA",
    border: "#2A2F3E",
    borderLight: "#3A3F4E",
    // Gradients
    primaryLinearGradient: ["#0B0E14", "#151920"],
    secondaryLinearGradient: ["#1A1F2E", "#0B0E14"],
    cardGradient: ["#1A1F2E", "#151920"],
  },
  fonts: {
    families: {
      openRegular: "OpenSans_400Regular",
      openBold: "OpenSans_700Bold",
      robotoRegular: "Roboto_400Regular",
      robotoBold: "Roboto_700Bold",
    },
    sizes: {
      tiny: "10px",
      small: "12px",
      normal: "14px",
      large: "16px",
      header: "18px",
      title: "24px",
      huge: "32px",
      uberHuge: "48px",
    },
    weights: {
      normal: "400",
      bold: "700",
    },
    colors: {
      primary: "#FFFFFF",
      dark: "#0B0E14",
      accent: "#F0B90B",
      background: "#0B0E14",
      highlight: "#D1D646",
    },
  },
  spacing: {
    tiny: "4px",
    small: "8px",
    medium: "16px",
    large: "24px",
    huge: "32px",
  },
  borderRadius: {
    small: "4px",
    default: "8px",
    medium: "12px",
    large: "16px",
    extraLarge: "24px",
    pill: "999px",
  },
};

export default Theme;
