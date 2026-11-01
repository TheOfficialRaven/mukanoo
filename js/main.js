(function () {
  var header = document.querySelector(".site-header");
  var menu = document.querySelector(".menu");
  var year = document.getElementById("year");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (year) year.textContent = String(new Date().getFullYear());

  var hero = document.getElementById("hero");
  var navTick = false;

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function updateNav() {
    if (!header) return;
    var range = hero
      ? Math.max(140, Math.min(320, hero.offsetHeight * 0.4))
      : 200;
    var raw = Math.min(1, Math.max(0, window.scrollY / range));
    var progress = reduced ? (raw > 0.5 ? 1 : 0) : smoothstep(raw);
    var ink = reduced
      ? progress
      : Math.min(1, Math.max(0, (progress - 0.42) / 0.38));

    if (menu && menu.open) {
      progress = 1;
      ink = 1;
    }

    header.style.setProperty("--nav-progress", progress.toFixed(4));
    header.style.setProperty("--nav-ink", ink.toFixed(4));
    header.classList.toggle("is-solid", progress > 0.88);
  }

  function onScrollNav() {
    if (navTick) return;
    navTick = true;
    window.requestAnimationFrame(function () {
      updateNav();
      navTick = false;
    });
  }

  updateNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });
  window.addEventListener("resize", updateNav);
  if (menu) menu.addEventListener("toggle", updateNav);

  function headerOffset() {
    return header ? header.offsetHeight : 0;
  }

  function syncHeaderVar() {
    if (!header) return;
    document.documentElement.style.setProperty("--header", headerOffset() + "px");
  }

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
  window.addEventListener("resize", function () {
    syncHeaderVar();
    syncContentWidth();
  });
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
    var sections = document.querySelectorAll("main > section:not(.band):not(.contact-bar)");
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
      var maxY = Math.max(0, document.documentElement.scrollHeight - viewH);
      var bestTop = y;
      var bestDist = Infinity;

      Array.prototype.forEach.call(sections, function (section) {
        var rect = section.getBoundingClientRect();
        var topTarget = y + rect.top - offset;
        var bottomTarget = y + rect.bottom - viewH;
        var topDist = Math.abs(rect.top - offset);
        var bottomDist = Math.abs(rect.bottom - viewH);

        if (topDist < bestDist) {
          bestDist = topDist;
          bestTop = topTarget;
        }
        if (bottomDist < bestDist) {
          bestDist = bottomDist;
          bestTop = bottomTarget;
        }
      });

      if (bestDist < 3 || bestDist > threshold) return;
      bestTop = Math.min(maxY, Math.max(0, bestTop));
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
    var faqGrid = faq.querySelector(".faq__grid");
    var faqItems = faq.querySelectorAll(".faq__item");

    function lockFaqHeight() {
      if (!faqGrid || !faqItems.length) return;
      var states = [];
      Array.prototype.forEach.call(faqItems, function (item, index) {
        states[index] = item.open;
        item.open = true;
      });
      faqGrid.style.minHeight = "";
      var height = Math.ceil(faqGrid.getBoundingClientRect().height);
      faqGrid.style.minHeight = height + "px";
      Array.prototype.forEach.call(faqItems, function (item, index) {
        item.open = states[index];
      });
    }

    lockFaqHeight();
    window.addEventListener("resize", lockFaqHeight);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(lockFaqHeight);
    }
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
  }
})();
