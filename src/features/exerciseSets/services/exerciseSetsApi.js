import { apiRequest } from "../../../services/apiClient";

export function fetchExerciseSetsBySublevel(sublevelId) {
  if (!sublevelId) {
    return apiRequest("/exercise-sets/");
  }

  return apiRequest(`/exercise-sets/?sublevel=${encodeURIComponent(sublevelId)}`);
}

export function resetExerciseSet(exerciseSetId) {
  return apiRequest(`/exercise-sets/${encodeURIComponent(exerciseSetId)}/reset/`, {
    method: "POST",
  });
}
