/* M4L v37 - Auth / PIN / API module
   Load after /app.js and before the window load event fires.
   This is a classic script, not type=module, so functions remain globally available
   for the existing app while we split gradually.
*/

function setError(message) {
  setDomText("auth-error", message || "");
}

function setupPinDigitBoxes() {
  document.querySelectorAll(".pin-digit-row").forEach(row => {
    const groupId = row.dataset.pinGroup;
    const inputs = Array.from(row.querySelectorAll(".pin-digit"));
    const hiddenInput = document.getElementById(groupId);

    if (!groupId || inputs.length === 0) return;

    const syncHiddenInput = () => {
      if (hiddenInput) {
        hiddenInput.value = inputs.map(input => input.value.replace(/\D/g, "")).join("");
      }
    };

    const fillDigits = (digits, startIndex = 0) => {
      const cleanDigits = String(digits || "").replace(/\D/g, "").slice(0, inputs.length);

      if (!cleanDigits) {
        syncHiddenInput();
        return;
      }

      const fillFrom = cleanDigits.length >= inputs.length ? 0 : startIndex;

      cleanDigits.split("").forEach((digit, offset) => {
        const target = inputs[fillFrom + offset];
        if (target) {
          target.value = digit;
        }
      });

      syncHiddenInput();
      maybeAutoSubmitPin(groupId);

      const nextIndex = Math.min(fillFrom + cleanDigits.length, inputs.length - 1);
      inputs[nextIndex].focus();
    };

    inputs.forEach((input, index) => {
      input.addEventListener("input", () => {
        const digits = input.value.replace(/\D/g, "");

        if (digits.length > 1) {
          fillDigits(digits, index);
          setError("");
          return;
        }

        input.value = digits;

        if (digits && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }

        syncHiddenInput();
        setError("");
        maybeAutoSubmitPin(groupId);
      });

      input.addEventListener("keydown", event => {
        if (event.key === "Backspace" && !input.value && index > 0) {
          inputs[index - 1].value = "";
          inputs[index - 1].focus();
          syncHiddenInput();
        }

        if (event.key === "ArrowLeft" && index > 0) {
          event.preventDefault();
          inputs[index - 1].focus();
        }

        if (event.key === "ArrowRight" && index < inputs.length - 1) {
          event.preventDefault();
          inputs[index + 1].focus();
        }

        if (event.key === "Enter") {
          event.preventDefault();

          if (groupId === "setup-pin") {
            submitSetupPin();
          } else if (groupId === "login-pin") {
            submitLogin();
          }
        }
      });

      input.addEventListener("paste", event => {
        event.preventDefault();
        const pastedDigits = (event.clipboardData || window.clipboardData)
          .getData("text")
          .replace(/\D/g, "");

        fillDigits(pastedDigits, index);
        setError("");
      });
    });
  });
}

function getPinValue(groupId) {
  const row = document.querySelector(`.pin-digit-row[data-pin-group="${groupId}"]`);
  const digitInputs = row ? Array.from(row.querySelectorAll(".pin-digit")) : [];

  if (digitInputs.length) {
    return digitInputs.map(input => input.value.replace(/\D/g, "")).join("");
  }

  const fallbackInput = document.getElementById(groupId);
  return fallbackInput ? fallbackInput.value.trim() : "";
}

function clearPinValue(groupId) {
  const row = document.querySelector(`.pin-digit-row[data-pin-group="${groupId}"]`);
  const digitInputs = row ? Array.from(row.querySelectorAll(".pin-digit")) : [];
  const hiddenInput = document.getElementById(groupId);

  digitInputs.forEach(input => {
    input.value = "";
  });

  if (hiddenInput) {
    hiddenInput.value = "";
  }
}

function focusFirstPinDigit(groupId) {
  const firstInput = document.querySelector(`.pin-digit-row[data-pin-group="${groupId}"] .pin-digit`);

  if (!firstInput) return;

  const focusInput = () => {
    try {
      firstInput.focus({ preventScroll: true });
    } catch (err) {
      firstInput.focus();
    }

    if (typeof firstInput.select === "function") {
      firstInput.select();
    }
  };

  setTimeout(focusInput, 80);
  setTimeout(focusInput, 260);
}

function maybeAutoSubmitPin(groupId) {
  if (groupId !== "login-pin") return;

  const loginBox = document.getElementById("login-pin-box");
  if (loginBox && loginBox.classList.contains("hidden")) return;

  const pin = getPinValue("login-pin");
  if (/^\d{4}$/.test(pin)) {
    window.setTimeout(() => submitLogin(), 0);
  }
}


async function apiPost(path, body = {}, token = "") {
  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  return response.json();
}

/* =========================
   AUTH
========================= */

function updateAuthWelcomeBanner(username) {
  const displayName = String(username || "").trim();
  const bannerText = displayName ? `Ahlan wa Sahlan ${displayName}` : "Ahlan wa Sahlan";

  setDomText("auth-welcome-banner", bannerText);
  showDomElement("auth-welcome-banner");
}

function updateAuthLoginLabel(type) {
  const titleText = type === "admin" ? "Admin Login" : "Student Login";
  const subtitleText = "";

  setDomText("portal-title", titleText);
  setDomText("portal-subtitle", subtitleText);
}

async function checkStudent() {
  try {
    const result = await apiPost("/api/check-student", {
      uniqueid: state.uniqueid
    });

    if (!result.success) {
      setError(result.error || "Invalid student link");
      return;
    }

    state.user = result.student;

    updateAuthWelcomeBanner(result.student.username);
    updateAuthLoginLabel("student");

    if (result.student.pinsetup === true) {
      showDomElement("login-pin-box");
      hideDomElement("setup-pin-box");
      focusFirstPinDigit("login-pin");
    } else {
      hideDomElement("login-pin-box");
      showDomElement("setup-pin-box");
      focusFirstPinDigit("setup-pin");
    }
  } catch (err) {
    setError("Unable to connect. Please try again.");
  }
}

async function checkAdmin() {
  try {
    const result = await apiPost("/api/admin/check-admin", {
      uniqueid: state.uniqueid
    });

    if (!result.success) {
      setError(result.error || "Invalid admin link");
      return;
    }

    state.user = result.admin;

    updateAuthWelcomeBanner(result.admin.username);
    updateAuthLoginLabel("admin");

    document.body.classList.add("admin-body");

    if (result.admin.pinsetup === true) {
      showDomElement("login-pin-box");
      hideDomElement("setup-pin-box");
      focusFirstPinDigit("login-pin");
    } else {
      hideDomElement("login-pin-box");
      showDomElement("setup-pin-box");
      focusFirstPinDigit("setup-pin");
    }
  } catch (err) {
    setError("Unable to connect. Please try again.");
  }
}

async function submitSetupPin() {
  const pin = getPinValue("setup-pin");

  if (!/^\d{4}$/.test(pin)) {
    setError("PIN must be 4 digits.");
    return;
  }

  const path = state.portalType === "admin"
    ? "/api/admin/setup-pin"
    : "/api/setup-pin";

  const result = await apiPost(path, {
    uniqueid: state.uniqueid,
    pin
  });

  if (!result.success) {
    setError(result.error || "Could not set PIN.");
    return;
  }

  clearPinValue("setup-pin");
  clearPinValue("login-pin");
  hideDomElement("setup-pin-box");
  showDomElement("login-pin-box");
  focusFirstPinDigit("login-pin");
  setError("");
}

async function submitLogin() {
  if (state.loginSubmitting) return;

  const pin = getPinValue("login-pin");

  if (!/^\d{4}$/.test(pin)) {
    setError("PIN must be 4 digits.");
    return;
  }

  const path = state.portalType === "admin"
    ? "/api/admin/login"
    : "/api/login";

  state.loginSubmitting = true;

  try {
    const result = await apiPost(path, {
      uniqueid: state.uniqueid,
      pin
    });

    if (!result.success) {
      setError("Incorrect PIN. Re-enter PIN or contact web admin to reset PIN.");
      clearPinValue("login-pin");
      focusFirstPinDigit("login-pin");
      return;
    }

    state.token = result.token;
    state.userType = state.portalType;
    state.user = state.portalType === "admin" ? result.admin : result.student;

    localStorage.setItem("maktab_token", state.token);
    localStorage.setItem("maktab_user_type", state.userType);

    clearPinValue("login-pin");
    setError("");

    if (state.portalType === "admin") {
      const adminWelcome = document.getElementById("admin-welcome");
      if (adminWelcome) {
        adminWelcome.innerText = "";
      }
      showScreen("admin-home");
    } else {
      const studentHomeTitle = document.getElementById("student-home-title");
      if (studentHomeTitle) {
        studentHomeTitle.innerText = "Home";
      }

      const studentWelcome = document.getElementById("student-welcome");
      if (studentWelcome) {
        studentWelcome.innerText = "";
      }

      showScreen("student-home");
    }
  } catch (err) {
    setError("Unable to connect. Please try again.");
  } finally {
    state.loginSubmitting = false;
  }
}

function logout() {
  localStorage.removeItem("maktab_token");
  localStorage.removeItem("maktab_user_type");
  location.reload();
}

function goHome() {
  if (state.userType === "admin" || state.portalType === "admin") {
    showScreen("admin-home");
  } else {
    showScreen("student-home");
  }
}

window.M4LAuth = {
  apiPost,
  setError,
  setupPinDigitBoxes,
  getPinValue,
  clearPinValue,
  focusFirstPinDigit,
  maybeAutoSubmitPin,
  updateAuthWelcomeBanner,
  updateAuthLoginLabel,
  checkStudent,
  checkAdmin,
  submitSetupPin,
  submitLogin,
  logout,
  goHome
};
