import { XStack, Text } from 'tamagui';
import { colors, spacing, radii } from '@/constants/theme';
import type { CostRange } from '@/types/database';

interface Props {
  cost: CostRange;
}

export function CostBadge({ cost }: Props) {
  return (
    <XStack
      backgroundColor="rgba(0,0,0,0.35)"
      borderRadius={radii.full}
      paddingHorizontal={spacing.sm}
      paddingVertical={4}
    >
      <Text fontSize={13} color="#FFFFFF" fontWeight="600">{cost}</Text>
    </XStack>
  );
}
