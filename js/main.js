(function () {
  var header = document.querySelector(".site-header");
  var menu = document.querySelector(".menu");
  var year = document.getElementById("year");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (year) year.textContent = String(new Date().getFullYear());

  var navTick = false;
  var navCompact = false;
  var COMPACT_ON = 88;
  var COMPACT_OFF = 20;

  function viewportHeight() {
    if (window.visualViewport && window.visualViewport.height) {
      return window.visualViewport.height;
    }
    return window.innerHeight || document.documentElement.clientHeight;
  }

  function remTokenToPx(token) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    var value = parseFloat(raw);
    if (!isFinite(value)) return 0;
    if (/px$/i.test(raw)) return value;
    var root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return value * root;
  }

  function headerOffset() {
    if (!header) return 0;
    // Layout/scroll always uses the compact height so the tall↔short
    // visual transition does not resize sections and jump the page.
    return Math.round(remTokenToPx("--header-short"));
  }

  function syncHeaderVar() {
    if (!header) return;
    var h = headerOffset();
    var screen = Math.max(0, Math.round(viewportHeight() - h));
    document.documentElement.style.setProperty("--header", h + "px");
    document.documentElement.style.setProperty("--screen-h", screen + "px");
  }

  function updateNav(force) {
    if (!header) return;
    var y = window.scrollY || window.pageYOffset || 0;
    var next = navCompact;

    if (menu && menu.open) {
      next = true;
    } else if (navCompact) {
      if (y <= COMPACT_OFF) next = false;
    } else if (y >= COMPACT_ON) {
      next = true;
    }

    if (force || next !== navCompact) {
      navCompact = next;
      header.classList.toggle("is-compact", navCompact);
      header.classList.toggle("is-solid", navCompact);
      if (force) syncHeaderVar();
    }
  }

  function onScrollNav() {
    if (navTick) return;
    navTick = true;
    window.requestAnimationFrame(function () {
      updateNav(false);
      navTick = false;
    });
  }

  updateNav(true);
  window.addEventListener("scroll", onScrollNav, { passive: true });
  window.addEventListener("resize", function () {
    updateNav(true);
    syncContentWidth();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () {
      syncHeaderVar();
      syncContentWidth();
    });
  }
  if (menu) menu.addEventListener("toggle", function () { updateNav(true); });

  var navLeft = document.querySelector(".nav__group--left");
  var navRight = document.querySelector(".nav__group--right");
  var desktopNav = window.matchMedia("(min-width: 981px)");

  function syncContentWidth() {
    if (!navLeft || !navRight || !desktopNav.matches) {
      document.documentElement.style.removeProperty("--wrap-width");
      document.documentElement.style.removeProperty("--wrap-inset");
      return;
    }
    var left = navLeft.getBoundingClientRect();
    var right = navRight.getBoundingClientRect();
    var width = Math.round(right.right - left.left);
    var inset = Math.round(left.left);
    if (width < 320) return;
    document.documentElement.style.setProperty("--wrap-width", width + "px");
    document.documentElement.style.setProperty("--wrap-inset", inset + "px");
  }

  function sectionScrollTop(el) {
    if (!el) return 0;
    if (el.id === "hero") return 0;
    return Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerOffset());
  }

  var snapLockUntil = 0;

  function goToSection(el, behavior) {
    if (!el) return;
    snapLockUntil = Date.now() + 1200;
    window.scrollTo({
      top: sectionScrollTop(el),
      behavior: behavior || (reduced ? "auto" : "smooth")
    });
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href || href === "#") return;
    var id = href.slice(1);
    var target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    goToSection(target);
    if (history.pushState) history.pushState(null, "", href);
    else location.hash = href;
  });

  syncHeaderVar();
  syncContentWidth();
  if (desktopNav.addEventListener) desktopNav.addEventListener("change", syncContentWidth);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncContentWidth);
  }
  if (location.hash.length > 1) {
    var initial = document.getElementById(location.hash.slice(1));
    if (initial) {
      window.setTimeout(function () {
        goToSection(initial, "auto");
      }, 0);
    }
  }

  if (!reduced) {
    var sections = document.querySelectorAll("main > section:not(.band):not(.contact-bar):not(#hero):not(.faq)");
    var snapTimer = 0;
    var snapping = false;
    var snapRaf = 0;
    var snapGen = 0;
    var snapLastSet = 0;

    function cancelSnap() {
      if (snapRaf) {
        window.cancelAnimationFrame(snapRaf);
        snapRaf = 0;
      }
      if (snapping) {
        snapping = false;
        snapGen += 1;
      }
    }

    function scheduleSnap() {
      window.clearTimeout(snapTimer);
      var y = window.scrollY || 0;
      var heroEl = document.getElementById("hero");
      var topZone = heroEl ? Math.max(220, heroEl.offsetHeight * 0.55) : 320;
      if (y < topZone) return;
      snapTimer = window.setTimeout(softSnap, 2000);
    }

    function onUserScrollIntent() {
      cancelSnap();
      scheduleSnap();
    }

    function animateScroll(to, duration) {
      cancelSnap();
      var from = window.scrollY;
      var delta = to - from;
      if (Math.abs(delta) < 1) return;
      snapping = true;
      var start = performance.now();
      var gen = snapGen;
      snapLastSet = from;

      function frame(now) {
        if (gen !== snapGen) return;
        if (Math.abs(window.scrollY - snapLastSet) > 6) {
          cancelSnap();
          scheduleSnap();
          return;
        }
        var t = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        snapLastSet = from + delta * eased;
        window.scrollTo(0, snapLastSet);
        if (t < 1) snapRaf = window.requestAnimationFrame(frame);
        else {
          snapping = false;
          snapRaf = 0;
        }
      }

      snapRaf = window.requestAnimationFrame(frame);
    }

    function softSnap() {
      if (snapping || Date.now() < snapLockUntil) return;
      var offset = headerOffset();
      var viewH = window.innerHeight;
      var threshold = Math.min(80, viewH * 0.08);
      var y = window.scrollY;
      var heroEl = document.getElementById("hero");
      var topZone = heroEl ? Math.max(220, heroEl.offsetHeight * 0.55) : 320;
      if (y < topZone) return;
      var maxY = Math.max(0, document.documentElement.scrollHeight - viewH);
      var bestTop = y;
      var bestDist = Infinity;

      Array.prototype.forEach.call(sections, function (section) {
        var rect = section.getBoundingClientRect();
        var topTarget = y + rect.top - offset;
        var bottomTarget = y + rect.bottom - viewH;
        var topDist = Math.abs(rect.top - offset);
        var bottomDist = Math.abs(rect.bottom - viewH);

        if (topTarget < topZone) return;

        if (topDist < bestDist) {
          bestDist = topDist;
          bestTop = topTarget;
        }
        if (bottomDist < bestDist && bottomTarget >= topZone) {
          bestDist = bottomDist;
          bestTop = bottomTarget;
        }
      });

      if (bestDist < 3 || bestDist > threshold) return;
      bestTop = Math.min(maxY, Math.max(0, bestTop));
      if (bestTop < topZone) return;
      if (Math.abs(bestTop - y) < 3) return;
      animateScroll(bestTop, 900);
    }

    window.addEventListener("wheel", onUserScrollIntent, { passive: true });
    window.addEventListener("touchstart", onUserScrollIntent, { passive: true });
    window.addEventListener("touchmove", onUserScrollIntent, { passive: true });
    window.addEventListener("keydown", function (event) {
      var keys = {
        ArrowUp: 1,
        ArrowDown: 1,
        PageUp: 1,
        PageDown: 1,
        Home: 1,
        End: 1,
        " ": 1
      };
      if (keys[event.key]) onUserScrollIntent();
    });

    window.addEventListener("scroll", function () {
      if (snapping) return;
      scheduleSnap();
    }, { passive: true });
  }

  if (menu) {
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        menu.open = false;
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu.open) {
        menu.open = false;
        var summary = menu.querySelector("summary");
        if (summary) summary.focus();
      }
    });
  }

  var quotes = document.querySelector(".quotes");
  if (quotes) {
    var quotesTrack = quotes.querySelector(".quotes__track");
    var quotesViewport = quotes.querySelector(".quotes__viewport");
    var quotesPages = quotesTrack ? quotesTrack.children : [];
    var quotesDots = quotes.querySelectorAll(".quotes__dots .quotes__dot");
    var prevQuote = quotes.querySelector(".quotes__arrow--prev");
    var nextQuote = quotes.querySelector(".quotes__arrow--next");

    if (quotesTrack && quotesPages.length) {
      var quotesIndex = 0;

      function syncQuoteDots() {
        Array.prototype.forEach.call(quotesDots, function (dot, n) {
          var on = n === quotesIndex;
          dot.classList.toggle("is-active", on);
          if (on) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      }

      function paintQuotes() {
        var pageWidth = quotesViewport ? quotesViewport.clientWidth : quotesTrack.clientWidth;
        quotesTrack.style.transform = "translate3d(" + (-quotesIndex * pageWidth) + "px,0,0)";
      }

      function goQuotes(nextIndex) {
        quotesIndex = (nextIndex + quotesPages.length) % quotesPages.length;
        paintQuotes();
        syncQuoteDots();
      }

      if (prevQuote) {
        prevQuote.addEventListener("click", function () {
          goQuotes(quotesIndex - 1);
        });
      }
      if (nextQuote) {
        nextQuote.addEventListener("click", function () {
          goQuotes(quotesIndex + 1);
        });
      }
      Array.prototype.forEach.call(quotesDots, function (dot, n) {
        dot.addEventListener("click", function () {
          goQuotes(n);
        });
      });

      window.addEventListener("resize", paintQuotes);
      paintQuotes();
      syncQuoteDots();
    }
  }

  var faq = document.querySelector(".faq");
  if (faq) {
    var faqItems = faq.querySelectorAll(".faq__item");
    var faqMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var faqMs = 420;

    function faqSetOpen(item, open) {
      item.open = open;
      item.classList.toggle("is-open", open);
      item.classList.remove("is-closing", "is-animating");
    }

    Array.prototype.forEach.call(faqItems, function (item) {
      var summary = item.querySelector("summary");
      var answer = item.querySelector(".faq__answer");
      if (!summary || !answer) return;

      faqSetOpen(item, item.open);

      summary.addEventListener("click", function (event) {
        event.preventDefault();
        if (item.classList.contains("is-animating")) return;

        var nextOpen = !item.classList.contains("is-open");
        snapLockUntil = Date.now() + faqMs + 200;

        if (faqMotion) {
          faqSetOpen(item, nextOpen);
          return;
        }

        item.classList.add("is-animating");
        item.classList.toggle("is-closing", !nextOpen);

        if (nextOpen) {
          // Open details first while still visually collapsed, so the
          // 0fr → 1fr transition has a real starting frame.
          item.open = true;
          item.classList.remove("is-open");
          void answer.offsetHeight;
          window.requestAnimationFrame(function () {
            item.classList.add("is-open");
          });
        } else {
          item.classList.remove("is-open");
        }

        window.setTimeout(function () {
          item.classList.remove("is-animating", "is-closing");
          item.open = nextOpen;
          item.classList.toggle("is-open", nextOpen);
        }, faqMs);
      });
    });
  }

  var form = document.querySelector(".form");
  if (form) {
    var status = document.getElementById("form-status");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var honeypot = form.querySelector("[name='company']");
      if (honeypot && honeypot.value) return;

      var invalid = false;
      Array.prototype.forEach.call(form.querySelectorAll("[required]"), function (field) {
        var ok;
        if (field.type === "checkbox") {
          ok = field.checked;
          field.setCustomValidity(ok ? "" : "Kötelező mező.");
        } else if (field.type === "file") {
          ok = true;
          field.setCustomValidity("");
        } else {
          var empty = !field.value.trim();
          field.setCustomValidity(empty ? "Kötelező mező." : "");
          ok = !empty && field.checkValidity();
        }
        field.setAttribute("aria-invalid", ok ? "false" : "true");
        var wrap = field.closest(".field, .form__consent");
        if (wrap) wrap.classList.toggle("is-invalid", !ok);
        if (!ok) invalid = true;
      });

      status.classList.toggle("is-error", invalid);
      if (invalid) {
        status.textContent = "Ellenőrizze a megjelölt mezőket.";
        var first = form.querySelector(".is-invalid input, .is-invalid textarea");
        if (first) first.focus();
        return;
      }

      var email = form.getAttribute("data-email") || "hello@mukanoo.hu";
      var lines = [];
      new FormData(form).forEach(function (value, key) {
        if (key === "company" || key === "photos" || key === "privacy") return;
        if (!String(value).trim()) return;
        lines.push(key + ": " + value);
      });

      var href = "mailto:" + email
        + "?subject=" + encodeURIComponent("Megkeresés a Mukanoo oldalról")
        + "&body=" + encodeURIComponent(lines.join("\n"));

      status.classList.remove("is-error");
      status.textContent = "Megnyitjuk a levelezőt a kitöltött üzenettel.";
      window.location.href = href;
    });

    form.addEventListener("input", function (event) {
      var target = event.target;
      if (!target.required) return;
      var wrap = target.closest(".field, .form__consent");
      if (!wrap) return;
      var ok = target.type === "checkbox" ? target.checked : (!!target.value.trim() && target.checkValidity());
      target.setCustomValidity(ok ? "" : "Kötelező mező.");
      target.setAttribute("aria-invalid", ok ? "false" : "true");
      wrap.classList.toggle("is-invalid", !ok);
    });

    var fileInput = form.querySelector("input[type='file']");
    var fileText = form.querySelector(".field__file-text");
    if (fileInput && fileText) {
      fileInput.addEventListener("change", function () {
        var names = Array.prototype.map.call(fileInput.files || [], function (file) {
          return file.name;
        });
        fileText.textContent = names.length ? names.join(", ") : "Fotók csatolása";
      });
    }
  }

  var palette = document.querySelector(".palette");
  if (palette && !reduced) {
    var pin = palette.querySelector(".palette__pin");
    var track = palette.querySelector(".palette__track");
    var copy = palette.querySelector(".palette__copy");
    var narrow = window.matchMedia("(max-width: 800px)");

    function clearPanel(panel) {
      panel.style.flexBasis = "";
      panel.style.width = "";
      panel.style.minWidth = "";
      panel.style.maxWidth = "";
    }

    function clearPanels() {
      Array.prototype.forEach.call(track.children, clearPanel);
      if (copy) clearPanel(copy);
    }

    function sizePanel(panel, size) {
      panel.style.flexBasis = size + "px";
      panel.style.width = size + "px";
      panel.style.minWidth = size + "px";
      panel.style.maxWidth = size + "px";
    }

    function placeCopy() {
      if (!copy || !pin || !track) return;
      if (narrow.matches) {
        if (copy.parentElement !== palette) palette.insertBefore(copy, pin);
      } else if (copy.parentElement !== track) {
        track.insertBefore(copy, track.firstChild);
      }
    }

    var pace = 1.45;
    var frame = 0;

    function horizontalDistance() {
      return Math.max(0, track.scrollWidth - pin.clientWidth);
    }

    function travelLength() {
      return horizontalDistance() * pace;
    }

    function holdLength() {
      return pin.clientHeight * (narrow.matches ? 0.35 : 0.55);
    }

    function scrollSpan() {
      return holdLength() + travelLength() + holdLength();
    }

    function leadHeight() {
      return narrow.matches && copy ? copy.offsetHeight : 0;
    }

    function goalOffset() {
      var distance = horizontalDistance();
      var travel = travelLength();
      var hold = holdLength();
      var span = scrollSpan();
      var scrolled = Math.min(
        Math.max(-palette.getBoundingClientRect().top - leadHeight(), 0),
        span
      );
      if (distance === 0 || travel === 0) return 0;
      if (scrolled <= hold) return 0;
      if (scrolled >= hold + travel) return distance;
      return (scrolled - hold) / pace;
    }

    function paint(offset) {
      track.style.transform = "translate3d(" + (-offset) + "px,0,0)";
    }

    function step() {
      frame = 0;
      paint(goalOffset());
    }

    function layoutPalette() {
      placeCopy();
      clearPanels();

      var width = pin.clientWidth;
      if (narrow.matches) {
        Array.prototype.forEach.call(track.children, function (item) {
          sizePanel(item, width);
        });
        palette.style.height = (leadHeight() + pin.clientHeight + scrollSpan()) + "px";
      } else {
        var swatchWidth = Math.round(width / 3);
        var copyWidth = width - swatchWidth;
        Array.prototype.forEach.call(track.children, function (item, index) {
          sizePanel(item, index === 0 ? copyWidth : swatchWidth);
        });
        palette.style.height = (pin.clientHeight + scrollSpan()) + "px";
      }
      paint(goalOffset());
    }

    layoutPalette();
    window.addEventListener("scroll", function () {
      if (!frame) frame = window.requestAnimationFrame(step);
    }, { passive: true });
    window.addEventListener("resize", layoutPalette);
    if (narrow.addEventListener) narrow.addEventListener("change", layoutPalette);
  }

  document.querySelectorAll(".work").forEach(function (card) {
      var track = card.querySelector(".work__track");
      var slides = track ? track.children : [];
      var chips = card.querySelectorAll(".work__chips button");
      var prev = card.querySelector(".work__arrow--prev");
      var next = card.querySelector(".work__arrow--next");
      if (!track || !slides.length) return;
      var index = 0;
      var lock = false;

      function mark() {
        Array.prototype.forEach.call(chips, function (chip, n) {
          if (n === index) chip.setAttribute("aria-current", "true");
          else chip.removeAttribute("aria-current");
        });
      }

      function go(nextIndex) {
        index = (nextIndex + slides.length) % slides.length;
        lock = true;
        track.scrollTo({
          left: slides[index].offsetLeft,
          behavior: reduced ? "auto" : "smooth"
        });
        mark();
      }

      if (prev) prev.addEventListener("click", function () { go(index - 1); });
      if (next) next.addEventListener("click", function () { go(index + 1); });
      Array.prototype.forEach.call(chips, function (chip, n) {
        chip.addEventListener("click", function () { go(n); });
      });

      track.addEventListener("scrollend", function () { lock = false; });

      track.addEventListener("scroll", function () {
        if (lock) return;
        window.requestAnimationFrame(function () {
          if (lock) return;
          var best = 0;
          var dist = Infinity;
          for (var i = 0; i < slides.length; i++) {
            var delta = Math.abs(track.scrollLeft - slides[i].offsetLeft);
            if (delta < dist) {
              dist = delta;
              best = i;
            }
          }
          if (best !== index) {
            index = best;
            mark();
          }
        });
      }, { passive: true });
    });

  var gallery = document.querySelector(".gallery");
  if (gallery) {
    var galleryTrack = gallery.querySelector(".gallery__track");
    var galleryPages = galleryTrack ? galleryTrack.children : [];
    var galleryDots = gallery.querySelectorAll(".gallery__dots button");
    var galleryPrev = gallery.querySelector(".gallery__arrow--prev");
    var galleryNext = gallery.querySelector(".gallery__arrow--next");
    if (galleryTrack && galleryPages.length) {
      var galleryIndex = 0;

      function markGallery() {
        Array.prototype.forEach.call(galleryDots, function (dot, n) {
          if (n === galleryIndex) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      }

      function paintGallery() {
        galleryTrack.style.transform = "translate3d(" + (-galleryIndex * 100) + "%,0,0)";
        markGallery();
      }

      function goGallery(nextIndex) {
        galleryIndex = (nextIndex + galleryPages.length) % galleryPages.length;
        paintGallery();
      }

      if (galleryPrev) galleryPrev.addEventListener("click", function () { goGallery(galleryIndex - 1); });
      if (galleryNext) galleryNext.addEventListener("click", function () { goGallery(galleryIndex + 1); });
      Array.prototype.forEach.call(galleryDots, function (dot, n) {
        dot.addEventListener("click", function () { goGallery(n); });
      });

      paintGallery();
    }

    var lightbox = document.getElementById("lightbox");
    var lightboxImg = lightbox ? lightbox.querySelector(".lightbox__img") : null;
    var lightboxPrev = lightbox ? lightbox.querySelector(".lightbox__nav--prev") : null;
    var lightboxNext = lightbox ? lightbox.querySelector(".lightbox__nav--next") : null;
    var galleryThumbs = gallery.querySelectorAll(".gallery__page .media--square img");
    var lightboxItems = [];
    var lightboxIndex = 0;
    var lightboxLastFocus = null;

    Array.prototype.forEach.call(galleryThumbs, function (img) {
      lightboxItems.push({
        src: img.currentSrc || img.src,
        alt: img.getAttribute("alt") || ""
      });
      var media = img.closest(".media");
      if (!media) return;
      media.setAttribute("role", "button");
      media.setAttribute("tabindex", "0");
      media.setAttribute("aria-label", (img.getAttribute("alt") || "Galéria kép") + " megnyitása");
    });

    function paintLightbox() {
      if (!lightboxImg || !lightboxItems.length) return;
      var item = lightboxItems[lightboxIndex];
      lightboxImg.src = item.src;
      lightboxImg.alt = item.alt;
    }

    function openLightbox(index) {
      if (!lightbox || !lightboxItems.length) return;
      lightboxIndex = (index + lightboxItems.length) % lightboxItems.length;
      lightboxLastFocus = document.activeElement;
      paintLightbox();
      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
      if (lightbox.querySelector(".lightbox__close")) {
        lightbox.querySelector(".lightbox__close").focus();
      }
    }

    function closeLightbox() {
      if (!lightbox || lightbox.hidden) return;
      lightbox.hidden = true;
      document.body.classList.remove("lightbox-open");
      if (lightboxImg) {
        lightboxImg.removeAttribute("src");
        lightboxImg.alt = "";
      }
      if (lightboxLastFocus && lightboxLastFocus.focus) lightboxLastFocus.focus();
    }

    function stepLightbox(delta) {
      if (!lightboxItems.length) return;
      lightboxIndex = (lightboxIndex + delta + lightboxItems.length) % lightboxItems.length;
      paintLightbox();
    }

    gallery.addEventListener("click", function (event) {
      var media = event.target.closest(".gallery__page .media--square");
      if (!media || event.target.closest(".gallery__arrow")) return;
      var img = media.querySelector("img");
      if (!img) return;
      var index = Array.prototype.indexOf.call(galleryThumbs, img);
      if (index < 0) return;
      openLightbox(index);
    });

    gallery.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      var media = event.target.closest(".gallery__page .media--square");
      if (!media) return;
      event.preventDefault();
      var img = media.querySelector("img");
      var index = Array.prototype.indexOf.call(galleryThumbs, img);
      if (index < 0) return;
      openLightbox(index);
    });

    if (lightbox) {
      lightbox.addEventListener("click", function (event) {
        if (event.target.closest("[data-lightbox-close]")) closeLightbox();
      });
      if (lightboxPrev) lightboxPrev.addEventListener("click", function () { stepLightbox(-1); });
      if (lightboxNext) lightboxNext.addEventListener("click", function () { stepLightbox(1); });
      document.addEventListener("keydown", function (event) {
        if (lightbox.hidden) return;
        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowLeft") stepLightbox(-1);
        if (event.key === "ArrowRight") stepLightbox(1);
      });
    }
  }

  var works = document.querySelector(".works");
  if (works) {
    var worksTrack = works.querySelector(".works__track");
    var worksPages = worksTrack ? worksTrack.children : [];
    var worksPrev = works.querySelector(".works__arrow--prev");
    var worksNext = works.querySelector(".works__arrow--next");
    if (worksTrack && worksPages.length) {
      var worksIndex = 0;

      function paintWorks() {
        worksTrack.style.transform = "translate3d(" + (-worksIndex * 100) + "%,0,0)";
      }

      function goWorks(nextIndex) {
        worksIndex = (nextIndex + worksPages.length) % worksPages.length;
        paintWorks();
      }

      if (worksPrev) worksPrev.addEventListener("click", function () { goWorks(worksIndex - 1); });
      if (worksNext) worksNext.addEventListener("click", function () { goWorks(worksIndex + 1); });

      paintWorks();
    }
  }
})();
