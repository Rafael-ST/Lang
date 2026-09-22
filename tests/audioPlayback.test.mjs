import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/services/audioPlayback.js", import.meta.url),
  "utf8"
);
const { playAudio } = await import(
  `data:text/javascript,${encodeURIComponent(source)}`
);

test("replays completed Android audio even when isLoaded is false", async () => {
  const calls = [];
  const player = {
    isLoaded: false,
    currentTime: 2,
    async seekTo(time) {
      calls.push(["seek", time]);
      this.currentTime = time;
    },
    play() {
      assert.equal(this.currentTime, 0);
      calls.push(["play"]);
    },
  };

  for (let replay = 0; replay < 3; replay++) {
    player.currentTime = 2;
    playAudio(player);
    await setImmediate();
  }

  assert.deepEqual(calls, Array.from({ length: 3 }, () => [
    ["seek", 0], ["play"],
  ]).flat());
});

test("starts newly loaded audio without waiting for a seek", () => {
  let plays = 0;
  playAudio({
    isLoaded: false,
    currentTime: 0,
    seekTo() { assert.fail("New audio should not seek"); },
    play() { plays++; },
  });
  assert.equal(plays, 1);
});

test("waits for rewind before replaying audio already in progress", async () => {
  let finishSeek;
  let plays = 0;
  playAudio({
    isLoaded: true,
    currentTime: 1,
    seekTo(time) {
      assert.equal(time, 0);
      return new Promise((resolve) => { finishSeek = resolve; });
    },
    play() { plays++; },
  });
  assert.equal(plays, 0);
  finishSeek();
  await setImmediate();
  assert.equal(plays, 1);
});
