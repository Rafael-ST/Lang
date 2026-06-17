import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export async function fetchGoogleUser(accessToken) {
  const response = await fetch("https://www.googleapis.com/userinfo/v2/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Não foi possível buscar os dados do usuário Google.");
  }

  const profile = await response.json();

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    photo: profile.picture,
  };
}
