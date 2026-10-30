"use strict";

const currentYear = document.getElementById("current-year");

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

const root = document.documentElement;
const navigationLinks = document.querySelectorAll(
  '.site-navigation a[href^="#"]',
);
const navigationSections = document.querySelectorAll("main > section[id]");
let scrollUpdatePending = false;

const updateScrollProgress = () => {
  const scrollableHeight = root.scrollHeight - window.innerHeight;
  const progress =
    scrollableHeight > 0 ? Math.min(window.scrollY / scrollableHeight, 1) : 0;
  const activationPoint = Math.min(window.innerHeight * 0.38, 260);
  let currentSection = null;

  root.style.setProperty("--scroll-progress", `${progress * 100}%`);

  navigationSections.forEach((section) => {
    if (section.getBoundingClientRect().top <= activationPoint) {
      currentSection = section;
    }
  });

  navigationLinks.forEach((link) => {
    if (currentSection && link.hash === `#${currentSection.id}`) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  scrollUpdatePending = false;
};

const scheduleScrollUpdate = () => {
  if (!scrollUpdatePending) {
    scrollUpdatePending = true;
    window.requestAnimationFrame(updateScrollProgress);
  }
};

window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
window.addEventListener("resize", scheduleScrollUpdate, { passive: true });

const menuToggle = document.querySelector(".menu-toggle");
const siteNavigation = document.getElementById("site-navigation");
const mobileNavigation = window.matchMedia("(max-width: 760px)");

if (menuToggle && siteNavigation) {
  const setMenuOpen = (isOpen) => {
    const shouldOpen = !mobileNavigation.matches || isOpen;

    siteNavigation.classList.toggle("is-collapsed", !shouldOpen);
    menuToggle.setAttribute("aria-expanded", String(shouldOpen));
    menuToggle.setAttribute(
      "aria-label",
      shouldOpen ? "Close navigation menu" : "Open navigation menu",
    );
  };

  menuToggle.hidden = false;
  setMenuOpen(!mobileNavigation.matches);

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setMenuOpen(!isOpen);
  });

  siteNavigation.addEventListener("click", (event) => {
    const target = event.target;
    const link = target instanceof Element ? target.closest("a") : null;

    if (mobileNavigation.matches && link) {
      setMenuOpen(false);
      menuToggle.focus({ preventScroll: true });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      mobileNavigation.matches &&
      menuToggle.getAttribute("aria-expanded") === "true" &&
      event.target instanceof Node &&
      !event.target.parentElement?.closest(".header-inner")
    ) {
      setMenuOpen(false);
    }
  });

  mobileNavigation.addEventListener("change", (event) => {
    setMenuOpen(!event.matches);
  });
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const revealTargets = document.querySelectorAll(
  ".section-heading, .about-copy, .profile-card, .skill-card, .project-card, " +
    ".certificate-card, .journey-list li, .contact-copy, .contact-card",
);
const revealDelays = new Map();
let revealObserver;

const showAllReveals = () => {
  revealObserver?.disconnect();
  revealTargets.forEach((target) => {
    target.classList.remove("reveal", "is-visible");
    target.style.removeProperty("--reveal-delay");
  });
};

const observeReveals = () => {
  showAllReveals();

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
  );

  revealTargets.forEach((target) => {
    const group = target.parentElement;
    const index = group ? (revealDelays.get(group) ?? 0) : 0;

    if (group) {
      revealDelays.set(group, (index + 1) % 5);
    }

    target.style.setProperty("--reveal-delay", `${index * 65}ms`);
    target.classList.add("reveal");
    revealObserver.observe(target);
  });
};

observeReveals();
prefersReducedMotion.addEventListener("change", observeReveals);

updateScrollProgress();

const projectFilters = document.querySelectorAll("[data-project-filter]");
const projectCards = [...document.querySelectorAll(".project-card[data-categories]")];
const projectFilterStatus = document.querySelector(".project-filter-status");

if (projectFilters.length > 0 && projectCards.length > 0 && projectFilterStatus) {
  projectCards.forEach((card) => {
    card.addEventListener("toggle", scheduleScrollUpdate);
    card.addEventListener("animationend", (event) => {
      if (event.animationName === "filter-card-enter") {
        card.classList.remove("is-filtered-in");
      }
    });
  });

  const setProjectFilter = (selectedFilter, selectedButton) => {
    let visibleCount = 0;

    projectFilters.forEach((filterButton) => {
      const isSelected = filterButton === selectedButton;
      filterButton.classList.toggle("is-active", isSelected);
      filterButton.setAttribute("aria-pressed", String(isSelected));
    });

    projectCards.forEach((card) => {
      const categories = card.dataset.categories?.split(/\s+/) ?? [];
      const isVisible =
        selectedFilter === "all" || categories.includes(selectedFilter);

      if (isVisible) {
        visibleCount += 1;
        card.hidden = false;
        card.classList.remove("is-filtered-in");
        requestAnimationFrame(() => {
          if (!card.hidden && !prefersReducedMotion.matches) {
            card.classList.add("is-filtered-in");
          }
        });
      } else {
        card.open = false;
        card.hidden = true;
        card.classList.remove("is-filtered-in");
      }
    });

    const filterLabel =
      selectedFilter === "all"
        ? "project ideas in total"
        : `${selectedButton.textContent.trim()} ${visibleCount === 1 ? "idea" : "ideas"}`;
    projectFilterStatus.textContent = `Showing ${visibleCount} ${filterLabel}.`;
    scheduleScrollUpdate();
  };

  projectFilters.forEach((filterButton) => {
    filterButton.addEventListener("click", () => {
      const selectedFilter = filterButton.dataset.projectFilter;

      if (selectedFilter) {
        setProjectFilter(selectedFilter, filterButton);
      }
    });
  });

  const initiallySelectedFilter = [...projectFilters].find(
    (filterButton) => filterButton.getAttribute("aria-pressed") === "true",
  );

  if (initiallySelectedFilter?.dataset.projectFilter) {
    setProjectFilter(initiallySelectedFilter.dataset.projectFilter, initiallySelectedFilter);
  }
}

const certificateDialog = document.querySelector(".certificate-dialog");
const certificateDialogImage = certificateDialog?.querySelector(".certificate-dialog-image");
const certificateDialogCaption = certificateDialog?.querySelector(
  ".certificate-dialog-caption",
);

if (
  certificateDialog instanceof HTMLDialogElement &&
  certificateDialogImage instanceof HTMLImageElement &&
  certificateDialogCaption
) {
  document.querySelectorAll(".certificate-preview-button").forEach((button) => {
    button.addEventListener("click", () => {
      const { imageSrc, imageAlt, certificateTitle } = button.dataset;

      if (!imageSrc || !imageAlt || !certificateTitle) {
        console.error("Certificate preview is missing required image metadata.", button);
        return;
      }

      certificateDialogImage.src = imageSrc;
      certificateDialogImage.alt = imageAlt;
      certificateDialogCaption.textContent = certificateTitle;
      certificateDialog.showModal();
      certificateDialog.querySelector(".certificate-dialog-close")?.focus();
    });
  });

  certificateDialog.addEventListener("click", (event) => {
    if (event.target === certificateDialog) {
      certificateDialog.close();
    }
  });

  certificateDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    certificateDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && certificateDialog.open) {
      event.preventDefault();
      certificateDialog.close();
    }
  });
}
