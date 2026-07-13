import { apiRequest } from "../../../services/apiClient";

export function fetchCards() {
  return apiRequest("/cards/");
}

export function fetchCardsByCategory(categoryId) {
  return apiRequest(`/cards/?categoria_id=${encodeURIComponent(categoryId)}`);
}

export function markCardsAsSeen(cardIds) {
  return apiRequest("/cards/mark-seen/", {
    method: "POST",
    body: JSON.stringify({ card_ids: cardIds }),
  });
}
