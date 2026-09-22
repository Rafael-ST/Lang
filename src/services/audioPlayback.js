export function playAudio(player) {
  const reportError = (error) => {
    console.warn("[audio] Nao foi possivel tocar o audio:", error);
  };

  try {
    // Android reports isLoaded=false after playback ends as well as while
    // loading. Use the position so completed audio is always rewound.
    if (player.currentTime === 0) {
      player.play();
      return;
    }

    player.seekTo(0).then(
      () => player.play(),
      () => player.play()
    ).catch(reportError);
  } catch (error) {
    reportError(error);
  }
}
