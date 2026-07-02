import { apiRequest } from "../../../services/apiClient";

export function fetchExercisesByCategory(categoryId) {
  if (!categoryId) {
    return fetchExercises();
  }

  return apiRequest(`/exercises/?categoria_id=${encodeURIComponent(categoryId)}`);
}

export function fetchExercisesBySet(exerciseSetId) {
  if (!exerciseSetId) {
    return fetchExercises();
  }

  return apiRequest(`/exercises/?exercise_set=${encodeURIComponent(exerciseSetId)}`);
}

export function fetchExercises() {
  return apiRequest("/exercises/");
}

export function completeExercise(exerciseId, payload = {}) {
  return apiRequest(`/exercises/${encodeURIComponent(exerciseId)}/complete/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
