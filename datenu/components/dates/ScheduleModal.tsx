import { useState } from 'react';
import { Alert, Platform, Modal } from 'react-native';
import { YStack, Text, Button, Spinner } from 'tamagui';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleMatch } from '@/lib/matches';
import { addDateToCalendar } from '@/lib/calendar';
import { MatchWithIdea } from '@/lib/matches';
import { colors, spacing, radii } from '@/constants/theme';

interface Props {
  match: MatchWithIdea | null;
  onClose: () => void;
  onScheduled: () => void;
}

export function ScheduleModal({ match, onClose, onScheduled }: Props) {
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  if (!match) return null;

  async function handleConfirm(addToCalendar: boolean) {
    setLoading(true);
    try {
      let calendarEventId: string | undefined;
      if (addToCalendar) {
        const eventId = await addDateToCalendar({
          title: match!.date_ideas.title,
          notes: match!.date_ideas.tagline,
          startDate: date,
          durationMins: match!.date_ideas.duration_mins,
        });
        calendarEventId = eventId ?? undefined;
      }
      await scheduleMatch({
        matchId: match!.id,
        scheduledAt: date,
        calendarEventId,
      });
      onScheduled();
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
        <Text fontSize={22} fontWeight="700" color={colors.textPrimary} marginBottom={spacing.md}>
          Schedule your date
        </Text>
        <Text fontSize={16} color={colors.textSecondary} marginBottom={spacing.xl}>
          {match.date_ideas.title}
        </Text>

        <DateTimePicker
          value={date}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date()}
          onChange={(_, selected) => { if (selected) setDate(selected); }}
          style={{ alignSelf: 'stretch' }}
          themeVariant="light"
          accentColor={colors.accent}
        />

        <YStack gap={spacing.sm} marginTop={spacing.xl}>
          {loading ? (
            <Spinner color={colors.accent} />
          ) : (
            <>
              <Button
                onPress={() => handleConfirm(true)}
                backgroundColor={colors.accent}
                borderRadius={radii.lg}
                height={52}
              >
                <Text fontWeight="600" color={colors.background}>Confirm + Add to Calendar</Text>
              </Button>
              <Button
                onPress={() => handleConfirm(false)}
                backgroundColor={colors.surface}
                borderWidth={1}
                borderColor={colors.border}
                borderRadius={radii.lg}
                height={52}
              >
                <Text fontWeight="600" color={colors.textPrimary}>Confirm without Calendar</Text>
              </Button>
              <Button unstyled onPress={onClose} marginTop={spacing.xs}>
                <Text color={colors.textSecondary} textAlign="center">Cancel</Text>
              </Button>
            </>
          )}
        </YStack>
      </YStack>
    </Modal>
  );
}
