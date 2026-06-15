import { apiRequest } from "../../../services/apiClient";

export function fetchCardsByCategory(categoryId) {
  return apiRequest(`/cards/?categoria_id=${encodeURIComponent(categoryId)}`);
}
