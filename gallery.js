(() => {
  const gallery = document.querySelector(".gallery");
  const links = Array.from(document.querySelectorAll(".gallery-link"));
  const portfolio = document.querySelector(".portfolio");
  const dialog = document.querySelector(".gallery-dialog");
  if (!gallery || !links.length || !portfolio) return;

  const previous = document.querySelector(".gallery-prev");
  const next = document.querySelector(".gallery-next");
  const count = document.querySelector(".gallery-count");
  const activeTitle = document.querySelector(".gallery-active-title");
  const thumbnailGroup = document.querySelector(".gallery-thumbnails");
  const announcement = document.querySelector(".gallery-announcement");
  const motionToggle = document.querySelector(".motion-toggle");
  const motionLabel = motionToggle.querySelector(".motion-label");
  const motionIcon = motionToggle.querySelector(".motion-icon");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canOpenDialog = dialog && typeof dialog.showModal === "function";
  const cards = links.map((link) => link.querySelector(".gallery-card"));
  const clampIndex = (index) => Math.max(0, Math.min(links.length - 1, index));
  const titleOf = (index) => links[index].dataset.title;
  const pad = (number) => String(number).padStart(2, "0");

  let activeIndex = Math.max(0, links.findIndex((link) => link.classList.contains("is-active")));
  let settledIndex = activeIndex;
  let requestedIndex = null;
  let frame = 0;
  let settleTimer = 0;
  let resizeFrame = 0;
  let pausedByUser = false;
  let drag = null;
  let suppressClickUntil = 0;
  let modalIndex = activeIndex;
  let opener = null;

  gallery.classList.add("is-enhanced");
  document.querySelector(".gallery-toolbar").hidden = false;
  links.forEach((link) => {
    link.draggable = false;
    if (canOpenDialog) {
      link.setAttribute("role", "button");
      link.setAttribute("aria-haspopup", "dialog");
    }
  });

  const thumbnails = thumbnailGroup ? links.map((link, index) => {
    const button = document.createElement("button");
    const image = document.createElement("img");
    const source = link.querySelector("img");
    button.className = "gallery-thumbnail";
    button.type = "button";
    button.setAttribute("aria-label", `Välj ${titleOf(index)}, bild ${index + 1} av ${links.length}`);
    image.alt = "";
    image.fetchPriority = "low";
    image.decoding = "async";
    image.draggable = false;
    image.src = source.dataset.thumbnail || source.src;
    button.append(image);
    button.addEventListener("click", () => centerCard(index));
    thumbnailGroup.append(button);
    return button;
  }) : [];

  function updateControls() {
    const navigationIndex = requestedIndex ?? activeIndex;
    previous.setAttribute("aria-disabled", String(navigationIndex === 0));
    next.setAttribute("aria-disabled", String(navigationIndex === links.length - 1));
    count.innerHTML = `${pad(activeIndex + 1)} <span>/</span> ${pad(links.length)}`;
    if (activeTitle) activeTitle.textContent = titleOf(activeIndex);
    links.forEach((link, index) => {
      const active = index === activeIndex;
      const selected = index === navigationIndex;
      link.classList.toggle("is-active", active);
      link.tabIndex = selected ? 0 : -1;
      if (active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
      const action = active || selected ? (canOpenDialog ? "Öppna" : "Visa på Instagram:") : "Centrera";
      link.setAttribute("aria-label", `${action} ${titleOf(index)}, bild ${index + 1} av ${links.length}`);
      if (thumbnails[index]) {
        if (active) thumbnails[index].setAttribute("aria-current", "true");
        else thumbnails[index].removeAttribute("aria-current");
      }
    });
  }

  function announceSelection() {
    const message = `${titleOf(activeIndex)}. Bild ${activeIndex + 1} av ${links.length}.`;
    if (announcement.textContent !== message) announcement.textContent = message;
  }

  // Snap positions use the untransformed links; only their inner cards move in 3D.
  function paint() {
    frame = 0;
    const center = gallery.scrollLeft + gallery.clientWidth / 2;
    const gap = parseFloat(getComputedStyle(gallery).columnGap) || 16;
    const mobile = gallery.clientWidth < 761;
    const reduce = reducedMotion.matches;
    const geometry = links.map((link) => ({
      width: link.offsetWidth,
      distance: link.offsetLeft + link.offsetWidth / 2 - center
    }));
    let nearest = 0;
    geometry.forEach((item, index) => {
      if (Math.abs(item.distance) < Math.abs(geometry[nearest].distance)) nearest = index;
      const relative = reduce ? 0 : Math.max(-2, Math.min(2, item.distance / (item.width + gap)));
      const depth = Math.min(Math.abs(relative), 1.8);
      cards[index].style.setProperty("--shift", `${(-relative * Math.min(item.width * .14, 60)).toFixed(2)}px`);
      cards[index].style.setProperty("--lift", `${(depth * (mobile ? 7 : 12)).toFixed(2)}px`);
      cards[index].style.setProperty("--depth", `${(-depth * (mobile ? 18 : 32)).toFixed(2)}px`);
      cards[index].style.setProperty("--angle", `${(-relative * (mobile ? 5 : 10)).toFixed(2)}deg`);
      cards[index].style.setProperty("--scale", (1 - Math.min(depth, 1.4) * (mobile ? .08 : .12)).toFixed(4));
      cards[index].style.setProperty("--opacity", (1 - Math.min(depth, 1.5) * .11).toFixed(4));
      links[index].style.zIndex = String(10 - Math.round(depth * 3));
    });
    if (nearest !== activeIndex) {
      activeIndex = nearest;
      updateControls();
    }
  }

  function queuePaint() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  function finishScroll() {
    if (drag?.moved) return;
    window.clearTimeout(settleTimer);
    if (frame) cancelAnimationFrame(frame);
    paint();
    requestedIndex = null;
    settledIndex = activeIndex;
    updateControls();
    announceSelection();
  }

  function centerCard(index, behavior = reducedMotion.matches ? "auto" : "smooth") {
    const target = clampIndex(index);
    const link = links[target];
    requestedIndex = target;
    updateControls();
    gallery.scrollTo({
      left: link.offsetLeft + link.offsetWidth / 2 - gallery.clientWidth / 2,
      behavior
    });
    if (behavior === "auto") {
      activeIndex = target;
      settledIndex = target;
      requestedIndex = null;
      paint();
      updateControls();
    } else {
      queuePaint();
    }
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(finishScroll, 180);
  }

  function navigate(direction, focusCard = false) {
    const origin = requestedIndex ?? activeIndex;
    const target = clampIndex(origin + direction);
    if (target === origin) return;
    centerCard(target);
    if (focusCard) links[target].focus({ preventScroll: true });
  }

  gallery.addEventListener("scroll", () => {
    queuePaint();
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(finishScroll, 150);
  }, { passive: true });
  gallery.addEventListener("scrollend", finishScroll);
  gallery.addEventListener("wheel", () => { requestedIndex = null; }, { passive: true });
  previous.addEventListener("click", () => navigate(-1));
  next.addEventListener("click", () => navigate(1));

  gallery.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const focusedCard = event.target.closest(".gallery-link");
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      navigate(event.key === "ArrowLeft" ? -1 : 1, Boolean(focusedCard));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const target = event.key === "Home" ? 0 : links.length - 1;
      centerCard(target);
      if (focusedCard) links[target].focus({ preventScroll: true });
    } else if (event.key === " " && focusedCard && canOpenDialog) {
      event.preventDefault();
      focusedCard.click();
    }
  });

  // Touch and trackpad scrolling stay native. Mouse dragging starts only after
  // a deliberate horizontal gesture, so vertical page scrolling is unaffected.
  gallery.addEventListener("pointerdown", (event) => {
    requestedIndex = null;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: gallery.scrollLeft, moved: false };
  });
  gallery.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      drag.moved = true;
      gallery.classList.add("is-dragging");
      gallery.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    gallery.scrollTo({ left: drag.left - dx, behavior: "auto" });
  });
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
    gallery.classList.remove("is-dragging");
    if (moved) {
      suppressClickUntil = performance.now() + 350;
      paint();
      centerCard(activeIndex);
    }
  }
  gallery.addEventListener("pointerup", finishDrag);
  gallery.addEventListener("pointercancel", finishDrag);
  gallery.addEventListener("dragstart", (event) => event.preventDefault());

  function updateMotion() {
    const reduced = reducedMotion.matches;
    portfolio.dataset.motion = pausedByUser || reduced || document.hidden || dialog?.open ? "paused" : "running";
    motionToggle.disabled = reduced;
    motionLabel.textContent = reduced ? "Rörelse av" : pausedByUser ? "Starta rörelse" : "Pausa rörelse";
    motionIcon.textContent = reduced ? "—" : pausedByUser ? ">" : "II";
    motionToggle.setAttribute("aria-label", reduced ? "Rörelse är av enligt din enhets inställning" : pausedByUser ? "Starta svävande rörelse" : "Pausa svävande rörelse");
  }
  motionToggle.addEventListener("click", () => { pausedByUser = !pausedByUser; updateMotion(); });
  reducedMotion.addEventListener("change", () => { updateMotion(); centerCard(activeIndex, "auto"); });
  document.addEventListener("visibilitychange", updateMotion);

  function showTattoo(index) {
    modalIndex = (index + links.length) % links.length;
    const link = links[modalIndex];
    const thumbnail = link.querySelector("img");
    const image = dialog.querySelector(".dialog-image");
    const source = dialog.querySelector(".dialog-source");
    image.src = thumbnail.src;
    image.alt = thumbnail.alt;
    dialog.querySelector("#gallery-title").textContent = titleOf(modalIndex);
    source.href = link.href;
    source.querySelector(".source-label").textContent = link.dataset.sourceLabel || "Öppna inlägget";
  }

  links.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      if (event.detail && performance.now() < suppressClickUntil) { event.preventDefault(); return; }
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (index !== activeIndex) {
        if (event.detail === 0 && index === requestedIndex) {
          centerCard(index, "auto");
        } else {
          event.preventDefault();
          centerCard(index);
          return;
        }
      }
      if (!canOpenDialog) return;
      event.preventDefault();
      opener = link;
      showTattoo(index);
      dialog.showModal();
      updateMotion();
    });
  });

  if (canOpenDialog) {
    dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
    dialog.querySelector(".dialog-prev").addEventListener("click", () => showTattoo(modalIndex - 1));
    dialog.querySelector(".dialog-next").addEventListener("click", () => showTattoo(modalIndex + 1));
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        showTattoo(modalIndex + (event.key === "ArrowLeft" ? -1 : 1));
      }
      // Escape uses the native dialog cancel/close behavior and focus trap.
    });
    dialog.addEventListener("close", () => {
      updateMotion();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    });
  }

  function handleResize() {
    const keepIndex = requestedIndex ?? settledIndex;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => centerCard(keepIndex, "auto"));
  }
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(handleResize);
    observer.observe(gallery);
    observer.observe(links[0]);
  }
  window.addEventListener("resize", handleResize);

  updateControls();
  updateMotion();
  requestAnimationFrame(() => centerCard(activeIndex, "auto"));
})();
