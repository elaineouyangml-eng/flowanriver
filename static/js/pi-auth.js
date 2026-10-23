
(() => {
  let sessionToken = null;
  let piUser = null;

  const backendUrl =
    "https://backend.appstudio-u7cm9zhmha0ruwv8.piappengine.com/pi/auth/v1/login";

  function showStatus(message) {
    const el = document.getElementById("pi-auth-status");
    if (el) el.textContent = message;
  }

  async function signInWithPi() {
    if (!window.Pi) {
      throw new Error("Pi SDK is unavailable");
    }

    showStatus("Initializing Pi SDK...");

    try {
      await window.Pi.init({ version: "2.0" });
    } catch (error) {
      throw new Error("Pi SDK initialization failed");
    }

    showStatus("Requesting Pi authorization...");

    let auth;

    try {
      auth = await Promise.race([
        window.Pi.authenticate(
          ["username"],
          (payment) => {
            console.info("Incomplete Pi payment detected");
          }
        ),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Pi authorization timed out"));
          }, 20000);
        })
      ]);
    } catch (error) {
      if (error.message?.includes("timed out")) {
        throw new Error("Pi authorization timed out");
      }
      throw new Error("Pi authorization failed");
    }

    if (!auth?.accessToken) {
      throw new Error("No Pi access token received");
    }

    showStatus("Pi authorization received. Contacting App Studio...");

    let response;

    try {
      response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accessToken: auth.accessToken
        })
      });
    } catch (error) {
      throw new Error("App Studio network request failed");
    }

    if (!response.ok) {
      throw new Error(
        "App Studio verification HTTP " + response.status
      );
    }

    showStatus("Checking App Studio response...");

    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Invalid App Studio JSON response");
    }

    if (!data.sessionToken || !data.user?.uid) {
      throw new Error("Invalid App Studio response");
    }

    sessionToken = data.sessionToken;
    piUser = data.user;

    showStatus("Pi identity verified successfully");

    return piUser;
  }

  window.FlowAnRiverPiAuth = {
    signIn: signInWithPi,
    getUser: () => piUser,
    getSessionToken: () => sessionToken
  };
})();
