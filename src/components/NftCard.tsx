import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { INFT } from "../services/helper";
import { Image } from "expo-image";
interface Props {
  nft;
  onPress?: () => void;
}

const NftCard: React.FC<Props> = ({ nft, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      
      <Image
        source={
         
             { uri: nft.uri || nft.imageUrl }
        }
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {nft.name || "Unnamed NFT"}
        </Text>

        <Text style={styles.tokenId} numberOfLines={1}>
          #{nft.tokenId ||nft.mint}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default NftCard;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#121212",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    width: "48%",
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 140,
    backgroundColor: "#1f1f1f",
  },
  info: {
    padding: 10,
  },
  name: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tokenId: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 4,
  },
});
