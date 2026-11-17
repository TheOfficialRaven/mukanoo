(function () {
  var header = document.querySelector(".site-header");
  var menu = document.querySelector(".menu");
  var year = document.getElementById("year");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /*
   * Resize strategy (common pattern):
   * - while dragging/zooming: freeze transitions, skip heavy JS
   * - after settle (~150ms): run layout painters once
   */
  var resizeEndListeners = [];
  var resizeEndTimer = 0;
  var resizeSettling = false;
  var RESIZE_SETTLE_MS = 150;

  function onResizeEnd(fn) {
    if (typeof fn === "function") resizeEndListeners.push(fn);
  }

  function runResizeEnd() {
    resizeEndTimer = 0;
    resizeSettling = false;
    document.documentElement.classList.remove("is-resizing");
    for (var i = 0; i < resizeEndListeners.length; i++) resizeEndListeners[i]();
  }

  function scheduleResizeEnd() {
    if (!resizeSettling) {
      resizeSettling = true;
      document.documentElement.classList.add("is-resizing");
    }
    if (resizeEndTimer) window.clearTimeout(resizeEndTimer);
    resizeEndTimer = window.setTimeout(runResizeEnd, RESIZE_SETTLE_MS);
  }

  /* Csak layout-szélesség / orientáció — NE a visualViewport (chrome show/hide) */
  var lastLayoutWidth = window.innerWidth || 0;
  window.addEventListener("resize", function () {
    var w = window.innerWidth || 0;
    if (Math.abs(w - lastLayoutWidth) < 2) return;
    lastLayoutWidth = w;
    scheduleResizeEnd();
  }, { passive: true });

  function bindSwipe(el, onPrev, onNext) {
    if (!el) return;
    var x0 = null;
    var y0 = null;
    var axis = null;
    var fired = false;
    var THRESH = 28;

    function reset() {
      x0 = null;
      y0 = null;
      axis = null;
      fired = false;
    }

    function maybeSwipe(clientX) {
      if (x0 == null || axis !== "x" || fired) return;
      var dx = clientX - x0;
      if (Math.abs(dx) < THRESH) return;
      fired = true;
      if (dx < 0) onNext();
      else onPrev();
    }

    el.addEventListener("touchstart", function (event) {
      if (!event.touches || !event.touches[0]) return;
      x0 = event.touches[0].clientX;
      y0 = event.touches[0].clientY;
      axis = null;
      fired = false;
    }, { passive: true });

    el.addEventListener("touchmove", function (event) {
      if (x0 == null || fired || !event.touches || !event.touches[0]) return;
      var x = event.touches[0].clientX;
      var y = event.touches[0].clientY;
      var dx = x - x0;
      var dy = y - y0;
      if (axis == null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (axis === "x") maybeSwipe(x);
    }, { passive: true });

    el.addEventListener("touchend", function (event) {
      if (!fired && axis === "x" && event.changedTouches && event.changedTouches[0]) {
        maybeSwipe(event.changedTouches[0].clientX);
      }
      reset();
    }, { passive: true });

    el.addEventListener("touchcancel", reset, { passive: true });
  }

  if (year) year.textContent = String(new Date().getFullYear());

  var navTick = false;
  var navCompact = false;
  var COMPACT_ON = 88;
  var COMPACT_OFF = 20;

  function remTokenToPx(token) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    var value = parseFloat(raw);
    if (!isFinite(value)) return 0;
    if (/px$/i.test(raw)) return value;
    var root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return value * root;
  }

  function measureCompactHeaderPx() {
    var cssShort = remTokenToPx("--header-short");
    return Math.round(cssShort) || 50;
  }

  function headerOffset() {
    return measureCompactHeaderPx();
  }

  var lastHeaderPx = "";
  var lockedAppH = 0;
  var lockedAppWidth = 0;

  function measureVhUnit(unit) {
    var el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText =
      "position:fixed;left:0;top:0;width:0;height:" + unit + ";" +
      "overflow:hidden;visibility:hidden;pointer-events:none;";
    document.documentElement.appendChild(el);
    var h = Math.round(el.getBoundingClientRect().height || 0);
    document.documentElement.removeChild(el);
    return h;
  }

  /*
   * Megbízható minta: --vh-small (sávval) + --vh-large (sáv nélkül), pixelre zárolva.
   * Csak load / orientáció / szélességváltás — chrome show/hide SOHA.
   */
  function lockAppHeight(force) {
    var w = window.innerWidth || 0;
    var widthChanged = Math.abs(w - lockedAppWidth) > 2;
    if (!force && lockedAppH && !widthChanged) return;

    if (typeof window.__mukanooLockVh === "function") {
      window.__mukanooLockVh();
    }

    var small = measureVhUnit("100svh") || window.innerHeight || 0;
    var large = measureVhUnit("100lvh") || 0;
    if (large < small) large = small;
    var avail = (window.screen && screen.availHeight) || 0;
    var coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse && large <= small + 2 && avail > small + 24 && avail < small * 1.45) {
      large = avail;
    }

    lockedAppWidth = w;
    lockedAppH = large;

    var root = document.documentElement.style;
    root.setProperty("--vh-small", small + "px");
    root.setProperty("--vh-large", large + "px");
    root.setProperty("--app-height", large + "px");
  }

  function syncHeaderVar() {
    if (!header) return;
    var h = remTokenToPx("--header-short");
    var headerPx = Math.round(h) + "px";
    if (headerPx !== lastHeaderPx) {
      lastHeaderPx = headerPx;
      document.documentElement.style.setProperty("--header", headerPx);
    }
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
      syncHeaderVar();
    }
  }

  var faqPinActive = false;

  function onScrollNav() {
    if (faqPinActive || navTick) return;
    navTick = true;
    window.requestAnimationFrame(function () {
      updateNav(false);
      navTick = false;
    });
  }

  lockAppHeight(true);
  updateNav(true);
  syncHeaderVar();
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onResizeEnd(function () {
    lockAppHeight(false);
    updateNav(true);
    syncHeaderVar();
  });
  window.addEventListener("orientationchange", function () {
    window.setTimeout(function () {
      lockAppHeight(true);
      syncHeaderVar();
      updateNav(true);
    }, 300);
  });
  if (menu) {
    function setMenuScrollLock(locked) {
      document.body.classList.toggle("is-menu-open", locked);
    }

    menu.addEventListener("toggle", function () {
      setMenuScrollLock(menu.open);
      updateNav(true);
    });
  }

  function sectionScrollTop(el) {
    if (!el) return 0;
    if (el.id === "hero") return 0;

    var top = el.getBoundingClientRect().top + window.scrollY - headerOffset();
    return Math.max(0, Math.round(top));
  }

  var spyPausedUntil = 0;
  var spyActiveId = "";
  var spySections = document.querySelectorAll(
    "#hero, #elvek, #bemutatkozas, #munkak, #szemlelet, #galeria, #velemenyek, #gyik, #kapcsolat, #elerhetoseg"
  );

  function sectionIdForHash(el) {
    if (!el) return "";
    if (el.id === "contact-title") return "kapcsolat";
    if (el.closest) {
      var section = el.closest("main > section[id], #elerhetoseg");
      if (section && section.id) return section.id;
    }
    return el.id || "";
  }

  function setLocationHash(id, push) {
    if (!id) return;
    var hash = "#" + id;
    if (location.hash === hash) {
      spyActiveId = id;
      return;
    }
    spyActiveId = id;
    if (push && history.pushState) history.pushState(null, "", hash);
    else if (history.replaceState) history.replaceState(null, "", hash);
    else location.hash = hash;
  }

  function updateHashFromScroll() {
    if (Date.now() < spyPausedUntil) return;
    var offset = headerOffset() + 12;
    var current = "hero";
    var y = window.scrollY || window.pageYOffset || 0;
    if (y < 40) {
      current = "hero";
    } else {
      Array.prototype.forEach.call(spySections, function (section) {
        if (!section.id) return;
        if (section.getBoundingClientRect().top <= offset) current = section.id;
      });
    }
    if (current === spyActiveId) return;
    setLocationHash(current, false);
  }

  function goToSection(el, behavior) {
    if (!el) return;
    spyPausedUntil = Date.now() + 1100;
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
    var hashId = sectionIdForHash(target) || id;
    goToSection(target);
    setLocationHash(hashId, true);
  });

  syncHeaderVar();
  if (location.hash.length > 1) {
    var initial = document.getElementById(location.hash.slice(1));
    if (initial) {
      spyActiveId = sectionIdForHash(initial) || location.hash.slice(1);
      window.setTimeout(function () {
        goToSection(initial, "auto");
      }, 0);
    }
  } else {
    spyActiveId = "hero";
  }

  var spyRaf = 0;
  window.addEventListener("scroll", function () {
    if (spyRaf) return;
    spyRaf = window.requestAnimationFrame(function () {
      spyRaf = 0;
      updateHashFromScroll();
    });
  }, { passive: true });

  if (menu) {
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        menu.open = false;
      });
    });

    menu.addEventListener("click", function (event) {
      if (!menu.open) return;
      if (event.target === menu) menu.open = false;
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
    var quotesPages = quotesTrack ? Array.prototype.slice.call(quotesTrack.children) : [];
    var quotesDotsWrap = quotes.querySelector(".quotes__dots");
    var prevQuote = quotes.querySelector(".quotes__arrow--prev");
    var nextQuote = quotes.querySelector(".quotes__arrow--next");
    var mobileQuotes = window.matchMedia("(max-width: 860px)");

    if (quotesTrack && quotesPages.length) {
      var quotesIndex = 0;
      var quotesTimer = null;
      var quotesAutoMs = 20000;
      var quotesDots = [];

      function getQuoteSlides() {
        if (mobileQuotes.matches) {
          return Array.prototype.slice.call(quotesTrack.querySelectorAll(".quote"));
        }
        return quotesPages;
      }

      function rebuildQuoteDots() {
        if (!quotesDotsWrap) return;
        var slides = getQuoteSlides();
        var count = slides.length;
        quotesDotsWrap.innerHTML = "";
        quotesDots = [];
        for (var i = 0; i < count; i += 1) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "quotes__dot";
          btn.setAttribute("aria-label", (i + 1) + ". oldal");
          (function (index) {
            btn.addEventListener("click", function () {
              userGoQuotes(index);
            });
          })(i);
          quotesDotsWrap.appendChild(btn);
          quotesDots.push(btn);
        }
        if (quotesIndex >= count) quotesIndex = 0;
        syncQuoteDots();
      }

      function syncQuoteDots() {
        Array.prototype.forEach.call(quotesDots, function (dot, n) {
          var on = n === quotesIndex;
          dot.classList.toggle("is-active", on);
          if (on) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      }

      function paintQuotes() {
        var slides = getQuoteSlides();
        if (!slides.length) return;
        if (quotesIndex >= slides.length) quotesIndex = 0;
        var slide = slides[quotesIndex];
        var offset = slide ? slide.offsetLeft : 0;
        quotesTrack.style.transform = "translate3d(" + (-offset) + "px,0,0)";
      }

      function stopQuotesAuto() {
        if (quotesTimer) {
          window.clearInterval(quotesTimer);
          quotesTimer = null;
        }
      }

      function startQuotesAuto() {
        stopQuotesAuto();
        var slides = getQuoteSlides();
        if (reduced || slides.length < 2) return;
        quotesTimer = window.setInterval(function () {
          goQuotes(quotesIndex + 1);
        }, quotesAutoMs);
      }

      function goQuotes(nextIndex) {
        var slides = getQuoteSlides();
        if (!slides.length) return;
        quotesIndex = (nextIndex + slides.length) % slides.length;
        paintQuotes();
        syncQuoteDots();
      }

      function userGoQuotes(nextIndex) {
        goQuotes(nextIndex);
        startQuotesAuto();
      }

      if (prevQuote) {
        prevQuote.addEventListener("click", function () {
          userGoQuotes(quotesIndex - 1);
        });
      }
      if (nextQuote) {
        nextQuote.addEventListener("click", function () {
          userGoQuotes(quotesIndex + 1);
        });
      }

      quotes.addEventListener("mouseenter", stopQuotesAuto);
      quotes.addEventListener("mouseleave", startQuotesAuto);
      quotes.addEventListener("focusin", stopQuotesAuto);
      quotes.addEventListener("focusout", function (event) {
        if (!quotes.contains(event.relatedTarget)) startQuotesAuto();
      });

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stopQuotesAuto();
        else startQuotesAuto();
      });

      function refreshQuotesLayout() {
        rebuildQuoteDots();
        paintQuotes();
        startQuotesAuto();
      }

      if (mobileQuotes.addEventListener) {
        mobileQuotes.addEventListener("change", refreshQuotesLayout);
      } else if (mobileQuotes.addListener) {
        mobileQuotes.addListener(refreshQuotesLayout);
      }

      bindSwipe(quotesViewport || quotesTrack, function () {
        userGoQuotes(quotesIndex - 1);
      }, function () {
        userGoQuotes(quotesIndex + 1);
      });

      onResizeEnd(function () {
        paintQuotes();
      });
      refreshQuotesLayout();
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

    function faqAnimateClose(item) {
      if (!item || (!item.classList.contains("is-open") && !item.open)) return;
      if (item.classList.contains("is-closing")) return;

      if (faqMotion) {
        faqSetOpen(item, false);
        return;
      }

      item.classList.add("is-animating", "is-closing");
      item.classList.remove("is-open");
      window.setTimeout(function () {
        item.classList.remove("is-animating", "is-closing");
        item.open = false;
        item.classList.remove("is-open");
      }, faqMs);
    }

    function faqCloseOthers(except) {
      Array.prototype.forEach.call(faqItems, function (other) {
        if (other === except) return;
        faqAnimateClose(other);
      });
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

        if (faqMotion) {
          if (nextOpen) faqCloseOthers(item);
          faqSetOpen(item, nextOpen);
          return;
        }

        if (nextOpen) {
          faqCloseOthers(item);
          item.classList.add("is-animating");
          item.classList.remove("is-closing");
          // Open details first while still visually collapsed, so the
          // 0fr → 1fr transition has a real starting frame.
          item.open = true;
          item.classList.remove("is-open");
          void answer.offsetHeight;
          window.requestAnimationFrame(function () {
            item.classList.add("is-open");
          });
          window.setTimeout(function () {
            item.classList.remove("is-animating", "is-closing");
            item.open = true;
            item.classList.add("is-open");
          }, faqMs);
          return;
        }

        item.classList.add("is-animating", "is-closing");
        item.classList.remove("is-open");
        window.setTimeout(function () {
          item.classList.remove("is-animating", "is-closing");
          item.open = false;
          item.classList.remove("is-open");
        }, faqMs);
      });
    });
  }

  var form = document.querySelector(".form");
  if (form) {
    var status = document.getElementById("form-status");
    var submitBtn = form.querySelector('button[type="submit"]');

    var fileInput = form.querySelector("input[type='file'][name='Fotok']");
    var fileText = form.querySelector(".field__file-text");
    var filePreviews = form.querySelector(".field__file-previews");
    var selectedPhotos = [];
    var previewUrls = [];
    var MAX_PHOTOS = 5;
    // Tömörített képek összesen max 6 MB; a Netlify body limit is ~6 MB
    var MAX_TOTAL_COMPRESSED_BYTES = 6 * 1024 * 1024;
    var MAX_PAYLOAD_CHARS = 6 * 1024 * 1024;
    var PHOTO_MAX_EDGE = 1600;
    var PHOTO_JPEG_QUALITY = 0.72;
    var successNotice = document.getElementById("form-success");
    var successLastFocus = null;

    function openSuccessNotice() {
      if (!successNotice) return;
      successLastFocus = document.activeElement;
      successNotice.hidden = false;
      successNotice.classList.add("is-open");
      document.body.classList.add("notice-open");
      var action = successNotice.querySelector(".notice__action");
      if (action) action.focus();
    }

    function closeSuccessNotice() {
      if (!successNotice || successNotice.hidden) return;
      successNotice.hidden = true;
      successNotice.classList.remove("is-open");
      document.body.classList.remove("notice-open");
      if (successLastFocus && successLastFocus.focus) successLastFocus.focus();
    }

    if (successNotice) {
      successNotice.addEventListener("click", function (event) {
        if (event.target.closest("[data-notice-close]")) closeSuccessNotice();
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeSuccessNotice();
      });
    }

    function samePhoto(a, b) {
      return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
    }

    function syncPhotoInput() {
      if (!fileInput || typeof DataTransfer === "undefined") return;
      var transfer = new DataTransfer();
      selectedPhotos.forEach(function (file) {
        transfer.items.add(file);
      });
      fileInput.files = transfer.files;
    }

    function updatePhotoTriggerLabel() {
      var count = selectedPhotos.length;
      if (!fileText) return;
      if (count === 0) {
        fileText.textContent = "Fotók csatolása (max. " + MAX_PHOTOS + ", összesen 6 MB)";
      } else if (count >= MAX_PHOTOS) {
        fileText.textContent = MAX_PHOTOS + " / " + MAX_PHOTOS + " fotó — elérted a maximumot";
      } else {
        fileText.textContent = count + " / " + MAX_PHOTOS + " fotó — további csatolása";
      }
      if (fileInput) {
        fileInput.disabled = count >= MAX_PHOTOS;
      }
    }

    function fileToBase64(file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
          resolve(String(reader.result || ""));
        };
        reader.onerror = function () {
          reject(reader.error || new Error("Fájl olvasási hiba"));
        };
        reader.readAsDataURL(file);
      });
    }

    function jpegName(name) {
      var base = String(name || "foto").replace(/\.[^.]+$/, "");
      return (base || "foto") + ".jpg";
    }

    function dataUrlBytes(dataUrl) {
      var raw = String(dataUrl || "");
      var comma = raw.indexOf(",");
      var base64 = comma >= 0 ? raw.slice(comma + 1) : raw;
      return Math.floor((base64.length * 3) / 4);
    }

    function totalPhotoBytes(photos) {
      return photos.reduce(function (sum, photo) {
        return sum + dataUrlBytes(photo && photo.data);
      }, 0);
    }

    function loadImage(file) {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          reject(new Error("Kép betöltési hiba"));
        };
        img.src = url;
      });
    }

    /** Egy kép tömörítése a megadott méretre / minőségre */
    function compressPhotoWith(file, img, maxEdge, quality) {
      var w = (img && (img.naturalWidth || img.width)) || 0;
      var h = (img && (img.naturalHeight || img.height)) || 0;
      if (!w || !h) {
        return fileToBase64(file).then(function (dataUrl) {
          return {
            name: file.name,
            type: file.type || "application/octet-stream",
            data: dataUrl
          };
        });
      }

      var scale = Math.min(1, maxEdge / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      var ctx = canvas.getContext("2d");
      if (!ctx || typeof canvas.toDataURL !== "function") {
        return fileToBase64(file).then(function (dataUrl) {
          return {
            name: file.name,
            type: file.type || "application/octet-stream",
            data: dataUrl
          };
        });
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      var dataUrl;
      try {
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      } catch (err) {
        return fileToBase64(file).then(function (raw) {
          return {
            name: file.name,
            type: file.type || "application/octet-stream",
            data: raw
          };
        });
      }
      return Promise.resolve({
        name: jpegName(file.name),
        type: "image/jpeg",
        data: dataUrl
      });
    }

    function compressPhotosToLimit(files) {
      var list = files.slice(0, MAX_PHOTOS);
      var attempts = [
        { edge: PHOTO_MAX_EDGE, quality: PHOTO_JPEG_QUALITY },
        { edge: 1280, quality: 0.62 },
        { edge: 1024, quality: 0.55 },
        { edge: 900, quality: 0.45 }
      ];

      return Promise.all(
        list.map(function (file) {
          if (!file || (file.type && file.type.indexOf("image/") !== 0)) {
            return Promise.resolve({ file: file, img: null });
          }
          return loadImage(file).then(
            function (img) {
              return { file: file, img: img };
            },
            function () {
              return { file: file, img: null };
            }
          );
        })
      ).then(function (loaded) {
        function runAttempt(index) {
          var settings = attempts[index] || attempts[attempts.length - 1];
          return Promise.all(
            loaded.map(function (item) {
              if (!item.img) {
                return fileToBase64(item.file).then(function (dataUrl) {
                  return {
                    name: item.file.name,
                    type: item.file.type || "application/octet-stream",
                    data: dataUrl
                  };
                });
              }
              return compressPhotoWith(item.file, item.img, settings.edge, settings.quality);
            })
          ).then(function (photos) {
            var compressedBytes = totalPhotoBytes(photos);
            var underCompressed = compressedBytes <= MAX_TOTAL_COMPRESSED_BYTES;
            if (!underCompressed && index < attempts.length - 1) {
              return runAttempt(index + 1);
            }
            if (!underCompressed) {
              throw new Error(
                "A csatolt képek együtt túl nagyok (max. 6 MB tömörítve). Próbálj kevesebb fotót küldeni."
              );
            }
            return photos;
          });
        }
        return runAttempt(0);
      });
    }

    function buildContactPayload(formEl) {
      syncPhotoInput();
      var honeypot = formEl.querySelector("[name='_honey']");
      var privacy = formEl.querySelector("[name='privacy']");
      var fields = {
        Vezeteknev: (formEl.querySelector("[name='Vezeteknev']") || {}).value || "",
        Keresztnev: (formEl.querySelector("[name='Keresztnev']") || {}).value || "",
        email: (formEl.querySelector("[name='email']") || {}).value || "",
        Telefonszam: (formEl.querySelector("[name='Telefonszam']") || {}).value || "",
        Uzenet: (formEl.querySelector("[name='Uzenet']") || {}).value || "",
        privacy: !!(privacy && privacy.checked),
        honey: honeypot ? honeypot.value : ""
      };

      return compressPhotosToLimit(selectedPhotos).then(function (photos) {
        var payload = Object.assign({}, fields, { photos: photos });
        var body = JSON.stringify(payload);
        // base64 miatt a body nagyobb a nyers képméretnél — ha kell, erősebb tömörítés
        if (body.length <= MAX_PAYLOAD_CHARS) {
          return { payload: payload, body: body };
        }

        var list = selectedPhotos.slice(0, MAX_PHOTOS);
        var harder = [
          { edge: 1024, quality: 0.5 },
          { edge: 900, quality: 0.4 },
          { edge: 800, quality: 0.35 }
        ];

        return Promise.all(
          list.map(function (file) {
            if (!file || (file.type && file.type.indexOf("image/") !== 0)) {
              return Promise.resolve({ file: file, img: null });
            }
            return loadImage(file).then(
              function (img) {
                return { file: file, img: img };
              },
              function () {
                return { file: file, img: null };
              }
            );
          })
        ).then(function (loaded) {
          function tryHarder(index) {
            var settings = harder[index];
            if (!settings) {
              throw new Error(
                "A csatolt képek együtt túl nagyok (max. 6 MB tömörítve). Próbálj kevesebb fotót küldeni."
              );
            }
            return Promise.all(
              loaded.map(function (item) {
                if (!item.img) {
                  return fileToBase64(item.file).then(function (dataUrl) {
                    return {
                      name: item.file.name,
                      type: item.file.type || "application/octet-stream",
                      data: dataUrl
                    };
                  });
                }
                return compressPhotoWith(item.file, item.img, settings.edge, settings.quality);
              })
            ).then(function (nextPhotos) {
              if (totalPhotoBytes(nextPhotos) > MAX_TOTAL_COMPRESSED_BYTES) {
                return tryHarder(index + 1);
              }
              var nextPayload = Object.assign({}, fields, { photos: nextPhotos });
              var nextBody = JSON.stringify(nextPayload);
              if (nextBody.length > MAX_PAYLOAD_CHARS) {
                return tryHarder(index + 1);
              }
              return { payload: nextPayload, body: nextBody };
            });
          }
          return tryHarder(0);
        });
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var honeypot = form.querySelector("[name='_honey']");
      // Autofill gyakran kitölti a honeypotot — küldés előtt ürítjük
      if (honeypot) honeypot.value = "";

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

      if (submitBtn) submitBtn.disabled = true;
      status.classList.remove("is-error");
      status.textContent = "Küldés folyamatban…";

      buildContactPayload(form)
        .then(function (built) {
          return fetch("/api/contact", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json"
            },
            body: built.body
          });
        })
        .then(function (response) {
          return response.json().catch(function () {
            return {};
          }).then(function (data) {
            return { response: response, data: data || {} };
          });
        })
        .then(function (result) {
          if (!result.response.ok || !result.data.ok) {
            if (result.response.status === 413) {
              throw new Error(
                "A csatolt képek együtt túl nagyok (max. 6 MB tömörítve). Próbálj kevesebb fotót küldeni."
              );
            }
            throw new Error(result.data.error || ("Küldési hiba: " + result.response.status));
          }

          status.classList.remove("is-error");
          status.textContent = "";
          form.reset();
          selectedPhotos = [];
          syncPhotoInput();
          renderPhotoPreviews();
          openSuccessNotice();
        })
        .catch(function (err) {
          status.classList.add("is-error");
          var msg = err && err.message ? String(err.message) : "";
          status.textContent =
            msg && msg.indexOf("túl nagy") !== -1
              ? msg
              : "Az üzenet elküldése nem sikerült. Kérjük, próbáld újra később.";
        })
        .then(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
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

    function revokePreviewUrls() {
      previewUrls.forEach(function (url) {
        URL.revokeObjectURL(url);
      });
      previewUrls = [];
    }

    function renderPhotoPreviews() {
      if (!filePreviews) return;
      revokePreviewUrls();
      filePreviews.textContent = "";
      selectedPhotos.forEach(function (file, index) {
        var item = document.createElement("li");
        item.className = "field__file-preview";

        var image = document.createElement("img");
        var url = URL.createObjectURL(file);
        previewUrls.push(url);
        image.src = url;
        image.alt = file.name;
        image.loading = "lazy";
        image.decoding = "async";

        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "field__file-remove";
        remove.setAttribute("aria-label", "Fotó eltávolítása: " + file.name);
        remove.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7m0-7l-7 7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
        remove.addEventListener("click", function () {
          selectedPhotos.splice(index, 1);
          syncPhotoInput();
          renderPhotoPreviews();
        });

        item.appendChild(image);
        item.appendChild(remove);
        filePreviews.appendChild(item);
      });

      filePreviews.hidden = selectedPhotos.length === 0;
      updatePhotoTriggerLabel();
    }

    if (fileInput && filePreviews) {
      updatePhotoTriggerLabel();
      fileInput.addEventListener("change", function () {
        var skipped = 0;
        Array.prototype.forEach.call(fileInput.files || [], function (file) {
          if (!file || (file.type && file.type.indexOf("image/") !== 0)) return;
          if (selectedPhotos.length >= MAX_PHOTOS) {
            skipped += 1;
            return;
          }
          var exists = selectedPhotos.some(function (current) {
            return samePhoto(current, file);
          });
          if (!exists) selectedPhotos.push(file);
        });
        syncPhotoInput();
        renderPhotoPreviews();
        if (skipped > 0 && status) {
          status.classList.add("is-error");
          status.textContent =
            "Maximum " + MAX_PHOTOS + " fotót lehet csatolni (összesen max. 6 MB). A többlet képeket nem vettük fel.";
        }
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
        var swatchWidth = Math.round(width * 0.37);
        var copyWidth = width - swatchWidth;
        Array.prototype.forEach.call(track.children, function (item, index) {
          sizePanel(item, index === 0 ? copyWidth : swatchWidth);
        });
        palette.style.height = (pin.clientHeight + scrollSpan()) + "px";
      }
      paint(goalOffset());
    }

    function syncPaletteRunway() {
      if (!pin || !palette) return;
      if (narrow.matches) {
        palette.style.height = (leadHeight() + pin.clientHeight + scrollSpan()) + "px";
      } else {
        palette.style.height = (pin.clientHeight + scrollSpan()) + "px";
      }
    }

    layoutPalette();
    window.addEventListener("scroll", function () {
      if (!frame) frame = window.requestAnimationFrame(step);
    }, { passive: true });
    onResizeEnd(layoutPalette);
    if (narrow.addEventListener) narrow.addEventListener("change", layoutPalette);
    /* Chrome eltűnésekor a pin (dvh) nő — csak a runway magasságot igazítjuk */
    if (window.visualViewport) {
      var paletteVvTimer = 0;
      window.visualViewport.addEventListener("resize", function () {
        window.clearTimeout(paletteVvTimer);
        paletteVvTimer = window.setTimeout(syncPaletteRunway, 120);
      }, { passive: true });
    }
  }

  document.querySelectorAll(".work").forEach(function (card) {
      var media = card.querySelector(".media--portrait");
      var track = card.querySelector(".work__track");
      var slides = track ? track.children : [];
      var chips = card.querySelectorAll(".work__chips button");
      var prev = card.querySelector(".work__arrow--prev");
      var next = card.querySelector(".work__arrow--next");
      if (!track || !slides.length) return;
      var index = 0;

      function mark() {
        Array.prototype.forEach.call(chips, function (chip, n) {
          if (n === index) chip.setAttribute("aria-current", "true");
          else chip.removeAttribute("aria-current");
        });
      }

      function paintWork() {
        var width = media ? media.clientWidth : track.clientWidth;
        track.style.transform = "translate3d(" + (-index * width) + "px,0,0)";
        mark();
      }

      function go(nextIndex) {
        index = (nextIndex + slides.length) % slides.length;
        paintWork();
      }

      if (prev) prev.addEventListener("click", function () { go(index - 1); });
      if (next) next.addEventListener("click", function () { go(index + 1); });
      Array.prototype.forEach.call(chips, function (chip, n) {
        chip.addEventListener("click", function () { go(n); });
      });
      onResizeEnd(paintWork);
      paintWork();
  });

  var gallery = document.querySelector(".gallery");
  if (gallery) {
    var galleryTrack = gallery.querySelector(".gallery__track");
    var galleryViewport = gallery.querySelector(".gallery__viewport");
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
        var pageWidth = galleryViewport ? galleryViewport.clientWidth : galleryTrack.clientWidth;
        galleryTrack.style.transform = "translate3d(" + (-galleryIndex * pageWidth) + "px,0,0)";
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
      bindSwipe(galleryViewport || galleryTrack, function () {
        goGallery(galleryIndex - 1);
      }, function () {
        goGallery(galleryIndex + 1);
      });
      onResizeEnd(paintGallery);

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
      var n = lightboxItems.length;
      if (n < 2) return;
      [1, -1].forEach(function (step) {
        var near = lightboxItems[(lightboxIndex + step + n) % n];
        if (!near || !near.src) return;
        var preload = new Image();
        preload.src = near.src;
      });
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
      bindSwipe(lightbox.querySelector(".lightbox__dialog") || lightbox, function () {
        if (lightbox.hidden) return;
        stepLightbox(-1);
      }, function () {
        if (lightbox.hidden) return;
        stepLightbox(1);
      });
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
    var worksViewport = works.querySelector(".works__viewport");
    var worksDotsWrap = works.querySelector(".works__dots");
    var worksMqPair = window.matchMedia("(max-width: 1100px)");
    var worksMqSingle = window.matchMedia("(max-width: 700px)");
    if (worksTrack && worksTrack.children.length) {
      var worksIndex = 0;
      var worksPages = [];
      var desktopGroups = Array.prototype.map.call(worksTrack.children, function (page) {
        return Array.prototype.slice.call(page.querySelectorAll(".work"));
      });
      var allWorks = desktopGroups.reduce(function (list, group) {
        return list.concat(group);
      }, []);

      function chunkWorks(items, size) {
        var pages = [];
        for (var i = 0; i < items.length; i += size) {
          pages.push(items.slice(i, i + size));
        }
        return pages;
      }

      function makeWorksPage(cards, label) {
        var page = document.createElement("div");
        page.className = "works__page";
        page.setAttribute("aria-label", label);
        var grid = document.createElement("div");
        grid.className = "works__grid";
        cards.forEach(function (card) {
          grid.appendChild(card);
        });
        page.appendChild(grid);
        return page;
      }

      function syncWorksDots() {
        if (!worksDotsWrap) return;
        worksDotsWrap.innerHTML = "";
        Array.prototype.forEach.call(worksPages, function (_, n) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "works__dot";
          btn.setAttribute("aria-label", n + 1 + ". oldal");
          if (n === worksIndex) {
            btn.classList.add("is-active");
            btn.setAttribute("aria-current", "true");
          }
          btn.addEventListener("click", function () {
            goWorks(n);
          });
          worksDotsWrap.appendChild(btn);
        });
      }

      function paintWorks() {
        var pageWidth = worksViewport ? worksViewport.clientWidth : worksTrack.clientWidth;
        worksTrack.style.transform = "translate3d(" + (-worksIndex * pageWidth) + "px,0,0)";
        if (worksDotsWrap) {
          Array.prototype.forEach.call(worksDotsWrap.children, function (dot, n) {
            var on = n === worksIndex;
            dot.classList.toggle("is-active", on);
            if (on) dot.setAttribute("aria-current", "true");
            else dot.removeAttribute("aria-current");
          });
        }
      }

      function goWorks(nextIndex) {
        if (!worksPages.length) return;
        worksIndex = (nextIndex + worksPages.length) % worksPages.length;
        paintWorks();
      }

      function layoutWorks() {
        worksTrack.innerHTML = "";
        if (worksMqSingle.matches) {
          allWorks.forEach(function (card, i) {
            worksTrack.appendChild(makeWorksPage([card], i + 1 + ". darab"));
          });
        } else if (worksMqPair.matches) {
          chunkWorks(allWorks, 2).forEach(function (group, i) {
            worksTrack.appendChild(makeWorksPage(group, i + 1 + ". kollekció oldal"));
          });
        } else {
          desktopGroups.forEach(function (group, i) {
            worksTrack.appendChild(makeWorksPage(group, i + 1 + ". kollekció oldal"));
          });
        }
        worksPages = Array.prototype.slice.call(worksTrack.children);
        worksIndex = Math.min(worksIndex, Math.max(0, worksPages.length - 1));
        syncWorksDots();
        paintWorks();
      }

      Array.prototype.forEach.call(works.querySelectorAll(".works__arrow--prev"), function (btn) {
        btn.addEventListener("click", function () {
          goWorks(worksIndex - 1);
        });
      });
      Array.prototype.forEach.call(works.querySelectorAll(".works__arrow--next"), function (btn) {
        btn.addEventListener("click", function () {
          goWorks(worksIndex + 1);
        });
      });
      bindSwipe(worksViewport || worksTrack, function () {
        goWorks(worksIndex - 1);
      }, function () {
        goWorks(worksIndex + 1);
      });
      [worksMqPair, worksMqSingle].forEach(function (mq) {
        if (mq.addEventListener) mq.addEventListener("change", layoutWorks);
        else if (mq.addListener) mq.addListener(layoutWorks);
      });
      onResizeEnd(paintWorks);
      layoutWorks();
    }
  }
})();
