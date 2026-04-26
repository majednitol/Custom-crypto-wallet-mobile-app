import { TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { ThemeType } from "../../styles/theme";

interface BubbleContainerProps {
  smallBubble?: boolean;
  theme: ThemeType;
}

const BubbleContainer = styled.View<BubbleContainerProps>`
  background-color: ${({ theme }) => theme.colors.cardBackground};
  padding: ${({ theme, smallBubble }) =>
    smallBubble ? "0px" : theme.spacing.small};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  margin: 5px;
  height: ${({ smallBubble }) => (smallBubble ? "40px" : "56px")};
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  width: ${({ smallBubble }) => (smallBubble ? "100px" : "148px")};
`;

const BubbleNumber = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.primary};
  min-width: 22px;
  text-align: center;
`;

const BubbleText = styled.Text<{ theme: ThemeType }>`
  font-family: ${(props) => props.theme.fonts.families.openBold};
  font-size: ${(props) => props.theme.fonts.sizes.normal};
  color: ${(props) => props.theme.colors.white};
`;

const Line = styled.View`
  background-color: ${({ theme }) => theme.colors.border};
  height: 50%;
  width: 1px;
`;

interface BubbleProps {
  word: string;
  number: number;
  smallBubble?: boolean;
  hideDetails?: boolean;
  onPress?: () => void;
}

const Bubble = ({
  word,
  number,
  smallBubble = false,
  hideDetails = false,
  onPress,
}: BubbleProps) => {
  const num = number.toString();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <BubbleContainer smallBubble={smallBubble}>
        {!hideDetails ? <BubbleNumber>{num}</BubbleNumber> : null}
        {!hideDetails ? <Line /> : null}
        <BubbleText>{word}</BubbleText>
      </BubbleContainer>
    </TouchableOpacity>
  );
};

export default Bubble;
