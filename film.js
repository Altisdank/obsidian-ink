(() => {
  const video = document.querySelector("#intro-video");
  const controls = document.querySelector(".film-controls");
  const sound = controls.querySelector(".film-sound");
  const soundLabel = controls.querySelector(".film-sound-label");
  const play = controls.querySelector(".film-play");
  const galleryVideo = document.querySelector("#gallery-video");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let heardFilm = false;
  let interaction = 0;

  function updateControls() {
    const audible = !video.muted && !video.paused;
    sound.setAttribute("aria-pressed", String(audible));
    soundLabel.textContent = audible ? "Stäng av ljud" : "Slå på ljud";
    play.setAttribute("aria-label", video.paused ? "Spela filmen" : "Pausa filmen");
    play.dataset.playing = String(!video.paused);
  }

  function muteFilm() {
    video.muted = true;
    video.loop = true;
  }

  async function playWithSound() {
    const request = ++interaction;
    video.muted = false;
    video.loop = true;
    try {
      await video.play();
      if (request === interaction) heardFilm = true;
    } catch {
      if (request !== interaction) return;
      muteFilm();
      await video.play().catch(updateControls);
    }
    updateControls();
  }

  for (const event of ["play", "pause", "ended", "volumechange"]) {
    video.addEventListener(event, updateControls);
  }
  galleryVideo.addEventListener("play", () => {
    interaction += 1;
    video.pause();
  });
  video.addEventListener("play", () => {
    if (!galleryVideo.paused) galleryVideo.pause();
  });

  sound.addEventListener("click", () => {
    if (!video.muted && !video.paused) {
      interaction += 1;
      muteFilm();
      return;
    }

    if (!heardFilm && video.currentTime > 0) video.currentTime = 0;
    void playWithSound();
  });

  play.addEventListener("click", () => {
    interaction += 1;
    if (video.paused) {
      void video.play().catch(updateControls);
    } else {
      video.pause();
    }
  });

  reducedMotion.addEventListener("change", ({ matches }) => {
    if (!matches) return;
    interaction += 1;
    video.pause();
    muteFilm();
  });

  controls.hidden = false;
  muteFilm();
  if (!reducedMotion.matches) void video.play().catch(updateControls);
})();
