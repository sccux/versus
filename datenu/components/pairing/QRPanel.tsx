import { useState } from 'react';
import { Alert } from 'react-native';
import { YStack, Text, Button, Spinner } from 'tamagui';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, radii } from '@/constants/theme';
import { getOrCreateCouple, buildInviteLink, joinCoupleByCode } from '@/lib/couples';

interface Props {
  userId: string;
  userRegion: string;
  onPaired: () => void;
}

export function QRPanel({ userId, userRegion, onPaired }: Props) {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function handleShowQR() {
    setLoading(true);
    try {
      const couple = await getOrCreateCouple(userId, userRegion);
      setMyCode(couple.invite_code);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartScan() {
    if (!permission?.granted) await requestPermission();
    setScanning(true);
  }

  function handleScan({ data }: { data: string }) {
    setScanning(false);
    const match = data.match(/code=([A-Z0-9]{6})/);
    if (!match) return Alert.alert('Invalid QR code');
    joinCoupleByCode(userId, match[1])
      .then(onPaired)
      .catch((e: any) => Alert.alert('Error', e.message));
  }

  if (scanning) {
    return (
      <YStack flex={1}>
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScan}
        />
        <Button onPress={() => setScanning(false)} marginTop={spacing.md}>
          <Text>Cancel</Text>
        </Button>
      </YStack>
    );
  }

  return (
    <YStack gap={spacing.lg} alignItems="center">
      {myCode ? (
        <YStack
          backgroundColor={colors.surface}
          borderRadius={radii.lg}
          padding={spacing.lg}
          alignItems="center"
          gap={spacing.sm}
        >
          <QRCode value={buildInviteLink(myCode)} size={200} color={colors.textPrimary} />
          <Text color={colors.textSecondary} fontSize={14}>Show this to your partner</Text>
        </YStack>
      ) : (
        <Button
          onPress={handleShowQR}
          disabled={loading}
          backgroundColor={colors.surface}
          borderWidth={1}
          borderColor={colors.border}
          borderRadius={radii.lg}
          height={52}
          width="100%"
        >
          {loading ? <Spinner /> : <Text color={colors.textPrimary}>Show my QR code</Text>}
        </Button>
      )}

      <Button
        onPress={handleStartScan}
        backgroundColor={colors.accent}
        borderRadius={radii.lg}
        height={52}
        width="100%"
      >
        <Text fontWeight="600" color={colors.background}>Scan partner's QR code</Text>
      </Button>
    </YStack>
  );
}
