import { XStack, Text } from 'tamagui';
import { Pressable } from 'react-native';

interface Props {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = 28, readonly = false }: Props) {
  return (
    <XStack gap={4}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          accessibilityRole="button"
          onPress={() => !readonly && onChange?.(star)}
          disabled={readonly}
        >
          <Text fontSize={size} lineHeight={size + 4}>
            {star <= value ? '⭐' : '☆'}
          </Text>
        </Pressable>
      ))}
    </XStack>
  );
}
