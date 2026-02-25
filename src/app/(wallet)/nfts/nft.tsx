import React, { useEffect } from "react";
import { View, FlatList, StyleSheet, Text } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { fetchNfts } from "../../../store/tokenSlice";
import NftCard from "../../../components/NftCard";
import { fetchSolNfts } from "../../../store/solTokenSlice";


export default function Nfts({ wallet, chainId,isEvm }: { wallet: string; chainId: number,isEvm: boolean }) {
    console.log("nft wallet",wallet,chainId,isEvm)
  const dispatch = useDispatch();
  const allNfts = useSelector((state: any) => state.erc20.allNfts);
  const solNfts = useSelector((state: any) => state.solToken.allNfts);

  useEffect(() => {
if(isEvm){
    dispatch(fetchNfts({ chainId, wallet }));
} else {
  dispatch(fetchSolNfts( {wallet} ))
}
    
  }, [ wallet, chainId,isEvm ]);

  if (!allNfts?.length && !solNfts?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No NFTs found</Text>
      </View>
    );
  }

  return (
    <FlatList
      scrollEnabled={false}
      data={allNfts ? [...allNfts,...solNfts] : []}
      keyExtractor={(item, index) => `${item.chainId}-${item.tokenId}-${index}`}
      numColumns={2}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => <NftCard nft={item} />}
      contentContainerStyle={styles.list}
    />
  );
}



const styles = StyleSheet.create({
  list: {
    padding: 12,
  },
  row: {
    justifyContent: "space-between",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
  },
});
