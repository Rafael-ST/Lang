export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("Defina EXPO_PUBLIC_API_BASE_URL no arquivo .env.");
}
