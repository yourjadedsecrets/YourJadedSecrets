(() => {
  const LS_KEY = "yjs_age_verified";
  let pendingNav = null; // { href, target, minAge }
 // "18" or "21"
  const DEFAULT_MIN = 18;

  function getMinAge(){
    const meta = document.querySelector('meta[name="yjs-min-age"]');
    const v = meta ? parseInt(meta.getAttribute("content") || "", 10) : DEFAULT_MIN;
    return Number.isFinite(v) ? v : DEFAULT_MIN;
  }

  function getAge(){
    const v = parseInt(localStorage.getItem(LS_KEY) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  }

  function setAge(v){
    localStorage.setItem(LS_KEY, String(v));
  }

  function ensureGateMarkup(){
    if (document.getElementById("yjs-agegate")) return;

    const gate = document.createElement("div");
    gate.className = "yjs-agegate";
    gate.id = "yjs-agegate";
    gate.setAttribute("role","dialog");
    gate.setAttribute("aria-modal","true");

    gate.innerHTML = `
      <div class="yjs-agegate__card">
        <div class="yjs-agegate__hero"></div>
        <div class="yjs-agegate__body">
          <p class="yjs-agegate__kicker">Private wing • Your Jaded Secrets</p>
          <h2 class="yjs-agegate__title">Age check. No drama. Just compliance.</h2>
          <p class="yjs-agegate__copy" id="yjs-agegate-copy">
            You must be <strong>18+</strong> to enter. Some doors (events/products) are <strong>21+</strong>.
          </p>

          <div class="yjs-agegate__row">
            <button class="yjs-agegate__btn" data-age="18" type="button">I’m 18+</button>
            <button class="yjs-agegate__btn" data-age="21" type="button">I’m 21+</button>
            <a class="yjs-agegate__btn secondary" href="about:blank">Leave</a>
          </div>

          <div class="yjs-agegate__fine">
            This is a content gate, not legal advice and not a magical invisibility cloak. It just keeps the site from casually serving adults-only content to minors.
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(gate);

    gate.addEventListener("click", (e) => {
      // close only when clicking outside the card (optional). We keep it sticky until verified.
      if (e.target === gate) {
        // no-op on purpose
      }
    });

    gate.querySelectorAll("button[data-age]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = parseInt(btn.getAttribute("data-age") || "0", 10);
        if (!Number.isFinite(v) || v < 18) return;
        setAge(v);
        hideGate();
        // If they still don't meet the page min age, show again with the stricter message.
        enforceMinAge();

        // If this verification was triggered by a gated link, continue now.
        if (pendingNav && getAge() >= pendingNav.minAge && pendingNav.href){
          const dest = pendingNav.href;
          const tgt = pendingNav.target;
          pendingNav = null;
          if (tgt && tgt !== "_self"){
            window.open(dest, tgt, "noopener,noreferrer");
          } else {
            window.location.href = dest;
          }
        }
      });
    });
  }

  function showGate(message){
    ensureGateMarkup();
    const gate = document.getElementById("yjs-agegate");
    const copy = document.getElementById("yjs-agegate-copy");
    if (copy && message) copy.innerHTML = message;
    gate.classList.add("open");
    document.documentElement.style.overflow = "hidden";
  }

  function hideGate(){
    const gate = document.getElementById("yjs-agegate");
    if (!gate) return;
    gate.classList.remove("open");
    document.documentElement.style.overflow = "";
  }

  function enforceMinAge(){
    const minAge = getMinAge();
    const age = getAge();
    if (age >= minAge) return true;

    if (minAge >= 21){
      showGate(`This door is <strong>21+</strong>. Confirm you’re 21+ to enter.`);
    } else {
      showGate(`You must be <strong>18+</strong> to enter. Some doors are <strong>21+</strong>.`);
    }
    return false;
  }

  function interceptMinAgeLinks(){
    document.querySelectorAll("[data-min-age]").forEach(el => {
      el.addEventListener("click", (e) => {
        const req = parseInt(el.getAttribute("data-min-age") || "0", 10);
        if (!Number.isFinite(req) || req <= 0) return;

        // Determine where this click was trying to go (supports data-min-age on <a> or on a child inside <a>)
        const link = (el.tagName && el.tagName.toLowerCase() === "a") ? el : el.closest("a");
        const href = link ? link.getAttribute("href") : null;
        const target = link ? (link.getAttribute("target") || "") : "";

        const age = getAge();
        if (age >= req) return;

        e.preventDefault();
        e.stopPropagation();

        if (href){
          pendingNav = { href, target, minAge: req };
        } else {
          pendingNav = { href: null, target: "", minAge: req };
        }

        showGate(`That link is <strong>${req}+</strong>. Confirm your age to continue.`);
      });
    });
  }
