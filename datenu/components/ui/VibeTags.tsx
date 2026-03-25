import { XStack, Text } from 'tamagui';
import { colors, spacing, radii } from '@/constants/theme';

interface Props {
  tags: string[];
}

export function VibeTags({ tags }: Props) {
  if (!tags.length) return null;
  return (
    <XStack flexWrap="wrap" gap={spacing.xs}>
      {tags.map((tag) => (
        <XStack
          key={tag}
          backgroundColor={colors.accentLight}
          borderRadius={radii.full}
          paddingHorizontal={spacing.sm}
          paddingVertical={4}
        >
          <Text fontSize={12} color={colors.accent} fontWeight="600">{tag}</Text>
        </XStack>
      ))}
    </XStack>
  );
}
