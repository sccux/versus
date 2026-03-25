import * as Calendar from 'expo-calendar';

export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCal = calendars.find(
    (c) => c.isPrimary || c.source.name === 'iCloud' || c.source.name === 'Default'
  );
  return defaultCal?.id ?? calendars[0]?.id ?? null;
}

export async function addDateToCalendar(params: {
  title: string;
  notes?: string;
  startDate: Date;
  durationMins: number;
}): Promise<string | null> {
  const hasPermission = await requestCalendarPermission();
  if (!hasPermission) return null;

  const calendarId = await getDefaultCalendarId();
  if (!calendarId) return null;

  const endDate = new Date(params.startDate.getTime() + params.durationMins * 60 * 1000);

  const eventId = await Calendar.createEventAsync(calendarId, {
    title: `💛 ${params.title}`,
    notes: params.notes,
    startDate: params.startDate,
    endDate,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return eventId;
}
