import { scheduleDateReminder, cancelDateReminder } from '@/lib/notifications';

jest.mock('@/lib/auth', () => ({
  updateUserProfile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id-1'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { MAX: 5 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

import * as Notifications from 'expo-notifications';

describe('scheduleDateReminder', () => {
  it('schedules a notification for 24 hours before the date', async () => {
    const scheduled = new Date('2026-05-01T19:00:00Z');
    const id = await scheduleDateReminder({ ideaTitle: 'Sunset Picnic', scheduledAt: scheduled });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining('Sunset Picnic'),
        }),
        trigger: expect.objectContaining({
          date: new Date(scheduled.getTime() - 24 * 60 * 60 * 1000),
        }),
      })
    );
    expect(id).toBe('notif-id-1');
  });
});

describe('cancelDateReminder', () => {
  it('cancels a scheduled notification by id', async () => {
    await cancelDateReminder('notif-id-1');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-id-1');
  });
});
