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
    const disclosures = topics.flatMap((topic) => Array.from(topic.querySelectorAll("details")));
    let disclosureSearchState = null;
    let printDisclosureState = null;

    const restoreDisclosures = (state) => {
      state?.forEach((wasOpen, disclosure) => { disclosure.open = wasOpen; });
    };

    const clearHighlights = (topic) => {
      const parents = new Set();
      topic.querySelectorAll("mark.manual-search-match").forEach((mark) => {
        parents.add(mark.parentNode);
        mark.replaceWith(document.createTextNode(mark.textContent));
      });
      parents.forEach((parent) => parent.normalize());
    };

    const highlightMatches = (topic, query) => {
      const walker = document.createTreeWalker(topic, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => node.parentElement.closest("script, style")
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      const textNodes = [];
      let offset = 0;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        textNodes.push({ node, start: offset, end: offset + node.data.length });
        offset += node.data.length;
      }

      // Match across inline elements, but wrap only their text nodes. This keeps
      // links, emphasis, IDs and event listeners in place and treats input as text.
      const text = textNodes.map(({ node }) => node.data).join("");
      const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
      const matches = Array.from(text.matchAll(pattern), (match) => ({
        start: match.index, end: match.index + match[0].length,
      }));
      let matchIndex = 0;
      textNodes.forEach(({ node, start, end }) => {
        while (matches[matchIndex]?.end <= start) matchIndex += 1;
        const portions = [];
        for (let index = matchIndex; index < matches.length && matches[index].start < end; index += 1) {
          portions.push(matches[index]);
        }
        if (!portions.length) return;
        const fragment = document.createDocumentFragment();
        let cursor = 0;
        portions.forEach((match) => {
          const from = Math.max(0, match.start - start);
          const to = Math.min(node.data.length, match.end - start);
          fragment.append(document.createTextNode(node.data.slice(cursor, from)));
          const mark = document.createElement("mark");
          mark.className = "manual-search-match";
          mark.textContent = node.data.slice(from, to);
          fragment.append(mark);
          cursor = to;
        });
        fragment.append(document.createTextNode(node.data.slice(cursor)));
        node.replaceWith(fragment);
      });
    };

    const updateResults = () => {
      const query = searchInput.value.trim().toLocaleLowerCase();
      let visibleCount = 0;

      if (query && !disclosureSearchState) {
        disclosureSearchState = new Map(disclosures.map((disclosure) => [disclosure, disclosure.open]));
      }
      restoreDisclosures(disclosureSearchState);
      if (query) {
        disclosures.forEach((disclosure) => {
          if (disclosure.textContent.toLocaleLowerCase().includes(query)) disclosure.open = true;
        });
      } else {
        disclosureSearchState = null;
      }

      topics.forEach((topic) => {
        clearHighlights(topic);
        const isVisible = !query || searchableText.get(topic).includes(query);
        topic.hidden = !isVisible;
        if (isVisible) {
          visibleCount += 1;
          if (query) highlightMatches(topic, query);
        }
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

    const resetSearch = () => {
      searchInput.value = "";
      updateResults();
    };

    const clearSearch = () => {
      resetSearch();
      searchInput.focus();
    };

    clearButton.addEventListener("click", clearSearch);
    clearButtons.forEach((button) => button.addEventListener("click", clearSearch));

    updateResults();

    window.addEventListener("beforeprint", () => {
      if (printDisclosureState) return;
      printDisclosureState = new Map(disclosures.map((disclosure) => [disclosure, disclosure.open]));
      disclosures.forEach((disclosure) => { disclosure.open = true; });
    });
    window.addEventListener("afterprint", () => {
      restoreDisclosures(printDisclosureState);
      printDisclosureState = null;
    });

    const revealAnchor = (hash) => {
      let target;
      try {
        target = document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch {
        return null;
      }
      if (!target?.closest(".manual-topic")?.hidden) return null;
      resetSearch();
      return target;
    };

    // Reveal before the browser follows the link so its normal anchor scrolling
    // and keyboard focus behavior still work. Clearing a search explicitly keeps
    // focus in the input; following a guide link must not move focus back there.
    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
          event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest("a[href]");
      if (!link || link.hasAttribute("download") ||
          (link.target && link.target !== "_self")) return;
      const destination = new URL(link.href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.origin === current.origin && destination.pathname === current.pathname &&
          destination.search === current.search) revealAnchor(destination.hash);
    });

    const revealCurrentAnchor = () => {
      const target = revealAnchor(window.location.hash);
      // Hash changes and restored history entries may have attempted to scroll
      // while the destination was hidden, so finish that navigation after reveal.
      target?.scrollIntoView({ block: "start" });
    };
    window.addEventListener("hashchange", revealCurrentAnchor);
    window.addEventListener("pageshow", revealCurrentAnchor);
    revealCurrentAnchor();
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
