(() => {
  const searchInput = document.querySelector("#manual-search");
  const clearButton = document.querySelector("#manual-clear-search");
  const clearButtons = Array.from(document.querySelectorAll("[data-manual-clear]"));
  const searchStatus = document.querySelector("#manual-search-status");
  const noResults = document.querySelector("#manual-no-results");
  const topics = Array.from(document.querySelectorAll(".manual-topic"));
  const contentsLinks = Array.from(document.querySelectorAll(".manual-toc a[href^='#']"));
  const contentsToggle = document.querySelector("#manual-toc-toggle");
  const contents = document.querySelector("#manual-toc");
  const contentsState = contentsToggle?.querySelector(".manual-toc-toggle-state");

  if (searchInput && clearButton && searchStatus && noResults && topics.length) {
    const searchableText = new Map(
      topics.map((topic) => [topic, topic.textContent.toLocaleLowerCase()]),
    );

    const updateResults = () => {
      const query = searchInput.value.trim().toLocaleLowerCase();
      let visibleCount = 0;

      topics.forEach((topic) => {
        const isVisible = !query || searchableText.get(topic).includes(query);
        topic.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      contentsLinks.forEach((link) => {
        const topic = document.querySelector(link.getAttribute("href"));
        const isHidden = !topic || topic.hidden;
        link.hidden = isHidden;
        const item = link.closest("li");
        if (item) item.hidden = isHidden;
      });

      noResults.hidden = visibleCount !== 0;
      clearButton.hidden = !query;
      searchStatus.textContent = query
        ? `${visibleCount} ${visibleCount === 1 ? "section" : "sections"} found for “${searchInput.value.trim()}”.`
        : "Showing the complete manual.";
    };

    searchInput.addEventListener("input", updateResults);
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && searchInput.value) {
        searchInput.value = "";
        updateResults();
      }
    });

    const clearSearch = () => {
      searchInput.value = "";
      updateResults();
      searchInput.focus();
    };

    clearButton.addEventListener("click", clearSearch);
    clearButtons.forEach((button) => button.addEventListener("click", clearSearch));

    updateResults();
  }

  if (contentsToggle && contents && contentsState) {
    const compactLayout = window.matchMedia("(max-width: 1000px)");

    const setContentsOpen = (isOpen) => {
      const shouldHide = compactLayout.matches && !isOpen;
      contents.hidden = shouldHide;
      contentsToggle.setAttribute("aria-expanded", String(!shouldHide));
      contentsState.textContent = shouldHide ? "Show sections" : "Hide sections";
    };

    contentsToggle.addEventListener("click", () => {
      setContentsOpen(contentsToggle.getAttribute("aria-expanded") !== "true");
    });

    contents.addEventListener("click", (event) => {
      if (compactLayout.matches && event.target.closest("a")) setContentsOpen(false);
    });

    compactLayout.addEventListener("change", () => setContentsOpen(!compactLayout.matches));
    setContentsOpen(!compactLayout.matches);
  }

  // On desktop the sidebar is the scroll box, not the <nav> inside it. On narrow
  // screens the sidebar goes static and overflow:visible, so scrollHeight matches
  // clientHeight and the guard below turns this into a no-op.
  const scrollBox = contents?.closest(".manual-sidebar") ?? contents;

  // The contents list is taller than its scroll box on a long page. Keep the
  // current entry inside that box by scrolling the list itself — never the page,
  // which is why this sets scrollTop directly instead of using scrollIntoView.
  const keepCurrentInView = () => {
    if (!scrollBox || !contents || contents.hidden) return;
    if (scrollBox.scrollHeight <= scrollBox.clientHeight) return;

    const current = contents.querySelector("a.is-current");
    if (!current) return;

    const box = scrollBox.getBoundingClientRect();
    const item = current.getBoundingClientRect();
    const margin = 16;

    if (item.top < box.top + margin) {
      scrollBox.scrollTop -= box.top + margin - item.top;
    } else if (item.bottom > box.bottom - margin) {
      scrollBox.scrollTop += item.bottom - (box.bottom - margin);
    }
  };

  // Highlight the section currently in view in the contents list.
  const observedTopics = topics.filter((topic) => topic.id);
  if (contents && observedTopics.length && "IntersectionObserver" in window) {
    const linkById = new Map(
      contentsLinks.map((link) => [link.getAttribute("href").slice(1), link]),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = linkById.get(entry.target.id);
          if (link) link.classList.toggle("is-current", entry.isIntersecting);
        });
        keepCurrentInView();
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    observedTopics.forEach((topic) => observer.observe(topic));
  }
})();
