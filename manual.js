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
})();
