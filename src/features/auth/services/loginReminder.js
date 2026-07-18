import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const LEGACY_LOGIN_REMINDER_STORAGE_KEY = "@lang/login-reminder-notification-id";
const LEGACY_RECURRING_REMINDER_STORAGE_KEY = "@lang/recurring-study-reminder-id";
const REMINDER_STORAGE_KEY = "@lang/login-reminder-notification-id-v2";
const REMINDER_CHANNEL_ID = "study-reminders";
const LOGIN_REMINDER_DELAY_IN_SECONDS = 12 * 60 * 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function configureAndroidChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "Lembretes de estudo",
    description: "Lembretes para continuar praticando ingles.",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
}

async function cancelStoredReminder(storageKey) {
  const notificationId = await AsyncStorage.getItem(storageKey);

  if (!notificationId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(
    () => null
  );
  await AsyncStorage.removeItem(storageKey);
}

export async function cancelLoginReminder() {
  await cancelStoredReminder(LEGACY_LOGIN_REMINDER_STORAGE_KEY);
  await cancelStoredReminder(LEGACY_RECURRING_REMINDER_STORAGE_KEY);
  await cancelStoredReminder(REMINDER_STORAGE_KEY);
}

export async function scheduleLoginReminder() {
  await cancelLoginReminder();
  await configureAndroidChannel();

  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    permissions = await Notifications.requestPermissionsAsync();
  }

  if (!permissions.granted) {
    return false;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Hora de praticar!",
      body: "Ja faz 12 horas desde seu ultimo acesso. Continue aprendendo ingles no Lang.",
      sound: "default",
      data: { type: "login-reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: LOGIN_REMINDER_DELAY_IN_SECONDS,
      repeats: false,
      channelId: REMINDER_CHANNEL_ID,
    },
  });

  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, notificationId);
  return true;
}
