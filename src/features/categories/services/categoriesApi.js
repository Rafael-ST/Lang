import { apiRequest } from "../../../services/apiClient";

export function fetchCategories() {
  return apiRequest("/categorias/");
}
