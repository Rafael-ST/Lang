import { apiRequest } from "../../../services/apiClient";

export function fetchExercisesByCategory(categoryId) {
  if (!categoryId) {
    return fetchExercises();
  }

  return apiRequest(`/exercises/?categoria_id=${encodeURIComponent(categoryId)}`);
}

export function fetchExercises() {
  return apiRequest("/exercises/");
}
