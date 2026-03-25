import { useState } from 'react';
import { Alert } from 'react-native';
import { YStack, XStack, Text, Input, Button, Spinner } from 'tamagui';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { uploadIdeaPhoto } from '@/lib/storage';
import { colors, spacing, radii } from '@/constants/theme';
import type { CostRange } from '@/types/database';

const VIBE_OPTIONS = ['Romantic', 'Adventurous', 'Cozy', 'Foodie', 'Active', 'Cultural', 'Spontaneous'];
const COST_OPTIONS: CostRange[] = ['€', '€€', '€€€'];

interface Props {
  userId: string;
}

export function IdeaSubmissionForm({ userId }: Props) {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState<CostRange>('€€');
  const [duration, setDuration] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleSubmit() {
    if (!title.trim() || !tagline.trim() || !location.trim() || !photoUri || !duration) {
      return Alert.alert('Please fill in all required fields and add a photo.');
    }
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      return Alert.alert('Please enter a valid duration in minutes.');
    }

    setSubmitting(true);
    try {
      const photoUrl = await uploadIdeaPhoto(photoUri, userId);
      const { error } = await supabase.from('date_ideas').insert({
        title: title.trim(),
        tagline: tagline.trim(),
        photo_url: photoUrl,
        cost_range: cost,
        duration_mins: durationNum,
        vibe_tags: selectedTags,
        location_region: location.trim(),
        booking_url: bookingUrl.trim() || null,
        submitted_by: userId,
        is_approved: false,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <YStack alignItems="center" gap={spacing.sm} padding={spacing.md}>
        <Text fontSize={32}>🎉</Text>
        <Text fontWeight="700" color={colors.textPrimary} textAlign="center">
          Thanks for your idea!
        </Text>
        <Text color={colors.textSecondary} textAlign="center" fontSize={14}>
          It's under review and will appear in the swipe stack once approved.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap={spacing.md}>
      {/* Photo picker */}
      <Button
        onPress={pickPhoto}
        backgroundColor={photoUri ? 'transparent' : colors.surface}
        borderWidth={1}
        borderColor={colors.border}
        borderRadius={radii.lg}
        height={photoUri ? undefined : 120}
        overflow="hidden"
        padding={0}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={{ width: '100%', height: 160, borderRadius: 12 }} contentFit="cover" />
        ) : (
          <Text color={colors.textSecondary}>📷 Add a photo (required)</Text>
        )}
      </Button>

      <Input value={title} onChangeText={setTitle} placeholder="Date idea title *" height={48} borderRadius={radii.md} borderColor={colors.border} />
      <Input value={tagline} onChangeText={setTagline} placeholder="Short description *" height={48} borderRadius={radii.md} borderColor={colors.border} />
      <Input value={location} onChangeText={setLocation} placeholder="City or region *" height={48} borderRadius={radii.md} borderColor={colors.border} />
      <Input value={duration} onChangeText={setDuration} placeholder="Duration in minutes *" keyboardType="numeric" height={48} borderRadius={radii.md} borderColor={colors.border} />
      <Input value={bookingUrl} onChangeText={setBookingUrl} placeholder="Booking URL (optional)" keyboardType="url" autoCapitalize="none" height={48} borderRadius={radii.md} borderColor={colors.border} />

      {/* Cost picker */}
      <YStack gap={spacing.xs}>
        <Text fontSize={13} color={colors.textSecondary} fontWeight="600">Cost range</Text>
        <XStack gap={spacing.sm}>
          {COST_OPTIONS.map((c) => (
            <YStack
              key={c}
              flex={1}
              backgroundColor={cost === c ? colors.accent : colors.surface}
              borderRadius={radii.md}
              borderWidth={1}
              borderColor={cost === c ? colors.accent : colors.border}
              paddingVertical={spacing.sm}
              alignItems="center"
              onPress={() => setCost(c)}
            >
              <Text fontWeight="600" color={cost === c ? colors.background : colors.textPrimary}>{c}</Text>
            </YStack>
          ))}
        </XStack>
      </YStack>

      {/* Vibe tags */}
      <YStack gap={spacing.xs}>
        <Text fontSize={13} color={colors.textSecondary} fontWeight="600">Vibe tags</Text>
        <XStack flexWrap="wrap" gap={spacing.xs}>
          {VIBE_OPTIONS.map((tag) => {
            const selected = selectedTags.includes(tag);
            return (
              <YStack
                key={tag}
                backgroundColor={selected ? colors.accent : colors.surface}
                borderRadius={radii.full}
                borderWidth={1}
                borderColor={selected ? colors.accent : colors.border}
                paddingHorizontal={spacing.sm}
                paddingVertical={4}
                onPress={() => toggleTag(tag)}
              >
                <Text fontSize={13} fontWeight="600" color={selected ? colors.background : colors.textPrimary}>{tag}</Text>
              </YStack>
            );
          })}
        </XStack>
      </YStack>

      <Button
        onPress={handleSubmit}
        disabled={submitting}
        backgroundColor={colors.textPrimary}
        borderRadius={radii.lg}
        height={52}
        marginTop={spacing.sm}
      >
        {submitting ? <Spinner color={colors.background} /> : (
          <Text fontWeight="600" color={colors.background}>Submit idea</Text>
        )}
      </Button>
    </YStack>
  );
}
