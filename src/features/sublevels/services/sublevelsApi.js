import { apiRequest } from "../../../services/apiClient";

export function fetchSublevels() {
  return apiRequest("/subniveis");
}
