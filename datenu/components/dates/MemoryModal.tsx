import { useState } from 'react';
import { Alert, Modal } from 'react-native';
import { YStack, Text, Button, Input, Spinner } from 'tamagui';
import { StarRating } from '@/components/ui/StarRating';
import { completeMatch } from '@/lib/matches';
import { MatchWithIdea } from '@/lib/matches';
import { colors, spacing, radii } from '@/constants/theme';

interface Props {
  match: MatchWithIdea | null;
  onClose: () => void;
  onCompleted: () => void;
}

export function MemoryModal({ match, onClose, onCompleted }: Props) {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!match) return null;

  async function handleComplete() {
    if (rating === 0) return Alert.alert('Please rate your date!');
    setLoading(true);
    try {
      await completeMatch({ matchId: match!.id, rating, note: note.trim() || undefined });
      onCompleted();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <YStack flex={1} backgroundColor={colors.background} padding={spacing.xl}>
        <Text fontSize={22} fontWeight="700" color={colors.textPrimary} marginBottom={spacing.xs}>
          How was it? 💛
        </Text>
        <Text fontSize={16} color={colors.textSecondary} marginBottom={spacing.xl}>
          {match.date_ideas.title}
        </Text>

        <YStack gap={spacing.lg}>
          <YStack gap={spacing.sm}>
            <Text fontWeight="600" color={colors.textPrimary}>Rate your date</Text>
            <StarRating value={rating} onChange={setRating} size={36} />
          </YStack>

          <YStack gap={spacing.sm}>
            <Text fontWeight="600" color={colors.textPrimary}>Add a memory (optional)</Text>
            <Input
              value={note}
              onChangeText={setNote}
              placeholder="We went on a Wednesday and the sunset was unreal..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              borderRadius={radii.lg}
              borderColor={colors.border}
              padding={spacing.md}
              height={120}
            />
          </YStack>

          {loading ? (
            <Spinner color={colors.accent} />
          ) : (
            <YStack gap={spacing.sm}>
              <Button
                onPress={handleComplete}
                backgroundColor={colors.accent}
                borderRadius={radii.lg}
                height={52}
              >
                <Text fontWeight="600" color={colors.background}>Save memory</Text>
              </Button>
              <Button unstyled onPress={onClose}>
                <Text color={colors.textSecondary} textAlign="center">Cancel</Text>
              </Button>
            </YStack>
          )}
        </YStack>
      </YStack>
    </Modal>
  );
}
