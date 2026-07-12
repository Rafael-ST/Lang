import { apiRequest } from "../../../services/apiClient";

export function fetchExercisesByCategory(categoryId) {
  if (!categoryId) {
    return fetchExercises();
  }

  return apiRequest(`/exercises/?categoria_id=${encodeURIComponent(categoryId)}`);
}

export function fetchExercisesBySet(exerciseSetId, options = {}) {
  if (!exerciseSetId) {
    return fetchExercises();
  }

  const exerciseSetParam = `exercise_set=${encodeURIComponent(exerciseSetId)}`;
  const includeCompletedParam = options.includeCompleted
    ? "&include_completed=true"
    : "";

  return apiRequest(`/exercises/?${exerciseSetParam}${includeCompletedParam}`);
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
