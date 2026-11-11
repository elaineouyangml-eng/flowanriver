
(() => {
  let piUser = null;

  const backendUrl = "/api/pi/verify";

  function showStatus(message) {
    const el = document.getElementById("pi-auth-status");
    if (el) el.textContent = message;
  }

  async function signInWithPi() {
    if (!window.Pi) {
      throw new Error("Pi SDK is unavailable");
    }

    const isTestnet =
      window.location.hostname === "test.flowanriver.com" ||
      window.location.hostname === "localhost";

    showStatus("Initializing Pi SDK...");

    try {
      window.Pi.init({
        version: "2.0",
        sandbox: isTestnet
      });
    } catch (error) {
      throw new Error("Pi SDK initialization failed");
    }

    showStatus("Requesting Pi authorization...");

    let auth;

    try {
      auth = await window.Pi.authenticate(
        ["username"],
        (payment) => {
          console.info("Incomplete Pi payment detected");
        }
      );
    } catch (error) {
      throw new Error("Pi authorization failed");
    }

    if (!auth?.accessToken) {
      throw new Error("No Pi access token received");
    }

    showStatus("Verifying Pi identity...");

    let response;

    try {
      response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accessToken: auth.accessToken
        }),
        cache: "no-store"
      });
    } catch (error) {
      throw new Error("Pi verification network request failed");
    }

    if (!response.ok) {
      throw new Error(
        "Pi verification HTTP " + response.status
      );
    }

    const data = await response.json();

    if (!data.verified || !data.user?.uid) {
      throw new Error("Invalid Pi verification response");
    }

    piUser = data.user;

    showStatus("Pi identity verified successfully");

    return piUser;
  }

  window.FlowAnRiverPiAuth = {
    signIn: signInWithPi,
    getUser: () => piUser,
    getSessionToken: () => null
  };
})();
