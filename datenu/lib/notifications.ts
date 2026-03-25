import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { updateUserProfile } from '@/lib/auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken(userId: string): Promise<void> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await updateUserProfile(userId, { expo_push_token: token });
}

export async function scheduleDateReminder(params: {
  ideaTitle: string;
  scheduledAt: Date;
}): Promise<string> {
  const triggerDate = new Date(params.scheduledAt.getTime() - 24 * 60 * 60 * 1000);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `📅 ${params.ideaTitle}`,
      body: 'Your date is coming up tomorrow!',
      data: {},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

export async function cancelDateReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
