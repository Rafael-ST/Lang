import { apiRequest } from "../../../services/apiClient";

export function fetchSublevels(levelId) {
  if (!levelId) {
    return apiRequest("/subniveis");
  }

  return apiRequest(`/subniveis?nivel=${encodeURIComponent(levelId)}`);
}
