(() => {
  // You asked for this: NO device storage. Birthday required every single time.
  let sessionAge = 0;
  let pendingNav = null; // { href, target, minAge }
  const DEFAULT_MIN = 18;

  function getMinAge(){
    const meta = document.querySelector('meta[name="yjs-min-age"]');
    const v = meta ? parseInt(meta.getAttribute("content") || "", 10) : DEFAULT_MIN;
    return Number.isFinite(v) ? v : DEFAULT_MIN;
  }

  function getAge(){ return sessionAge || 0; }
  function setAge(v){ sessionAge = Number.isFinite(v) ? v : 0; }

  function calcAgeFromBirthdate(dateStr){
    // dateStr expected as YYYY-MM-DD (from <input type="date">)
    if (!dateStr || typeof dateStr !== "string") return 0;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return 0;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (![y,m,d].every(Number.isFinite)) return 0;

    const today = new Date();
    let age = today.getFullYear() - y;

    const thisMonth = today.getMonth() + 1;
    const thisDay = today.getDate();
    if (thisMonth < m || (thisMonth === m && thisDay < d)) age -= 1;
    return Math.max(0, age);
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
        <img class="yjs-agegate__seal" src="images/seal-of-brine.png" alt="Seal of Brine" />
        <div class="yjs-agegate__hero"></div>
        <div class="yjs-agegate__body">
          <p class="yjs-agegate__kicker">Private wing • Your Jaded Secrets</p>
          <h2 class="yjs-agegate__title">Enter your birthday.</h2>
          <p class="yjs-agegate__copy" id="yjs-agegate-copy">
            You must be <strong>18+</strong> to enter. Some doors (events/products) are <strong>21+</strong>.
          </p>

          <form class="yjs-agegate__row" id="yjs-agegate-form">
            <label class="yjs-agegate__label">
              <span class="sr-only">Birthday</span>
              <input class="yjs-agegate__input" id="yjs-agegate-bday" type="date" required />
            </label>
            <button class="yjs-agegate__btn" type="submit">Enter</button>
            <a class="yjs-agegate__btn secondary" href="about:blank">Leave</a>
          </form>

          <div class="yjs-agegate__fine">
            This is a content gate. Your birthday is <strong>not stored</strong>. You will be asked every visit. Because boundaries.
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(gate);

    // Keep it sticky: clicking outside does nothing on purpose
    gate.addEventListener("click", (e) => { if (e.target === gate) {} });

    const form = gate.querySelector("#yjs-agegate-form");
    const input = gate.querySelector("#yjs-agegate-bday");
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const age = calcAgeFromBirthdate(input.value);
      const required = pendingNav?.minAge ?? getMinAge();

      if (age <= 0){
        showGate("Enter a valid birthday.");
        return;
      }

      if (age < 18){
        showGate("This site is <strong>18+</strong>. Not a negotiation.");
        return;
      }

      // Verified for THIS PAGE LOAD only.
      setAge(age);

      if (age < required){
        // Keep gate open with stricter message
        if (required >= 21){
          showGate(`This door is <strong>21+</strong>. Your current age doesn't clear it.`);
        } else {
          showGate(`You must be <strong>${required}+</strong> to enter this door.`);
        }
        return;
      }

      hideGate();

      // Continue gated navigation if needed
      if (pendingNav && pendingNav.href){
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
  }

  function showGate(message){
    ensureGateMarkup();
    const gate = document.getElementById("yjs-agegate");
    if (!gate) return;

    const copy = gate.querySelector("#yjs-agegate-copy");
    if (copy && typeof message === "string") copy.innerHTML = message;

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

    // Always ask for birthday on every page load
    if (minAge >= 21){
      showGate(`This door is <strong>21+</strong>. Enter your birthday to continue.`);
    } else {
      showGate(`Enter your birthday to confirm you’re <strong>18+</strong>. Some doors are <strong>21+</strong>.`);
    }
    return false;
  }

  function interceptMinAgeLinks(){
    document.querySelectorAll("[data-min-age]").forEach(el => {
      el.addEventListener("click", (e) => {
        const req = parseInt(el.getAttribute("data-min-age") || "0", 10);
        if (!Number.isFinite(req) || req <= 0) return;

        const link = (el.tagName && el.tagName.toLowerCase() === "a") ? el : el.closest("a");
        const href = link ? link.getAttribute("href") : null;
        const target = link ? (link.getAttribute("target") || "") : "";

        const age = getAge();
        if (age >= req) return;

        e.preventDefault();
        e.stopPropagation();

        pendingNav = { href, target, minAge: req };
        showGate(`That link is <strong>${req}+</strong>. Enter your birthday to continue.`);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    interceptMinAgeLinks();
    enforceMinAge();
  });
})();
