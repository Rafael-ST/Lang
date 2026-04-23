import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_STORAGE_KEY = "@lang:google-user";

export async function loadStoredUser() {
  const rawUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  return JSON.parse(rawUser);
}

export async function storeUser(user) {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export async function clearStoredUser() {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}
