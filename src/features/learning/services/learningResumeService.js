import { fetchExerciseSetsBySublevel } from "../../exerciseSets/services/exerciseSetsApi";
import { fetchLevels } from "../../levels/services/levelsApi";
import { fetchSublevels } from "../../sublevels/services/sublevelsApi";

export async function findNextLearningExerciseSet() {
  const levels = normalizeList(await fetchLevels());
  const level = findFirstAvailableIncomplete(levels, isCompleted);

  if (!level) {
    return null;
  }

  const sublevels = normalizeList(await fetchSublevels(level.id));
  const sublevel = findFirstAvailableIncomplete(sublevels, isCompleted);

  if (!sublevel) {
    return null;
  }

  const exerciseSets = sortByOrder(
    normalizeList(await fetchExerciseSetsBySublevel(sublevel.id))
  );
  const exerciseSet = findFirstAvailableIncomplete(
    exerciseSets,
    isExerciseSetCompleted
  );

  if (!exerciseSet) {
    return null;
  }

  return { exerciseSet, level, sublevel };
}

function findFirstAvailableIncomplete(items, completedCheck) {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const previousItem = items[index - 1];
    const isUnlocked =
      index === 0 || (previousItem && completedCheck(previousItem));

    if (
      item?.is_active !== false &&
      isUnlocked &&
      !completedCheck(item)
    ) {
      return item;
    }
  }

  return null;
}

function isCompleted(item) {
  return Boolean(item?.is_completed);
}

function isExerciseSetCompleted(exerciseSet) {
  return Boolean(
    exerciseSet?.is_completed ||
      exerciseSet?.progress?.status === "completed"
  );
}

function sortByOrder(items) {
  return [...items].sort((firstItem, secondItem) => {
    const firstOrder = Number(firstItem?.order ?? 0);
    const secondOrder = Number(secondItem?.order ?? 0);

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    return String(firstItem?.id ?? "").localeCompare(
      String(secondItem?.id ?? "")
    );
  });
}

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}
