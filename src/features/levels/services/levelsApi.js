import { apiRequest } from "../../../services/apiClient";

export function fetchLevels() {
  return apiRequest("/niveis/");
}
