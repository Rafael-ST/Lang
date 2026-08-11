import { apiRequest } from "../../../services/apiClient";

export async function fetchProfileByUsername(username) {
  const profiles = await apiRequest("/perfis/");
  const normalizedUsername = username.toLowerCase();

  if (!Array.isArray(profiles)) {
    return null;
  }

  return (
    profiles.find(
      (profile) => profile.username?.toLowerCase() === normalizedUsername
    ) || null
  );
}

export function spendProfilePoint(profileId) {
  return apiRequest(`/perfis/${encodeURIComponent(profileId)}/spend-point/`, {
    method: "POST",
  });
}
