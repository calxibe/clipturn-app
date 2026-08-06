(() => {
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".site-nav");

  const closeMenu = () => {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    navigation.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  };

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
      navigation.classList.toggle("is-open", !isOpen);
      document.body.classList.toggle("menu-open", !isOpen);
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1080) closeMenu();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.querySelectorAll(".video-facade").forEach((facade) => {
    facade.addEventListener("click", () => {
      const id = facade.dataset.videoId;
      if (!id) return;

      const frame = document.createElement("iframe");
      frame.src =
        "https://www.youtube-nocookie.com/embed/" +
        encodeURIComponent(id) +
        "?autoplay=1&rel=0&modestbranding=1";
      frame.title = facade.dataset.videoTitle || "ClipTurn video";
      frame.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.allowFullscreen = true;

      const host = facade.parentElement;
      host.classList.add("video-playing");
      facade.replaceWith(frame);
      frame.focus();
    });
  });

  const dialog = document.querySelector("#image-lightbox");
  const dialogImage = dialog?.querySelector("img");
  const dialogCaption = dialog?.querySelector("figcaption");
  const dialogClose = dialog?.querySelector(".lightbox-close");
  let lightboxOpener = null;

  const closeLightbox = () => {
    if (!dialog?.open) return;
    dialog.close();
    lightboxOpener?.focus();
  };

  if (dialog && dialogImage && dialogCaption) {
    document.querySelectorAll("[data-lightbox]").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const preview = trigger.querySelector("img");
        lightboxOpener = trigger;
        dialogImage.src = trigger.dataset.lightbox;
        dialogImage.alt = preview?.alt || "ClipTurn screenshot";
        dialogCaption.textContent = trigger.dataset.caption || dialogImage.alt;
        dialog.showModal();
        dialogClose?.focus();
      });
    });

    dialogClose?.addEventListener("click", closeLightbox);

    dialog.addEventListener("click", (event) => {
      const bounds = dialog.getBoundingClientRect();
      const outside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;
      if (outside) closeLightbox();
    });

    dialog.addEventListener("close", () => {
      dialogImage.removeAttribute("src");
    });
  }
})();
