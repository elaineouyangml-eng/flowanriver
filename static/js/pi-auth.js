
(() => {
  let sessionToken = null;
  let piUser = null;

  async function signInWithPi() {
    if (!window.Pi) {
      throw new Error("Pi SDK is unavailable");
    }

    await window.Pi.init({ version: "2.0" });

    const auth = await window.Pi.authenticate(
      ["username"],
      (payment) => {
        console.info("Incomplete Pi payment detected");
      }
    );

    if (!auth?.accessToken) {
      throw new Error("No Pi access token received");
    }

    const response = await fetch(
      "https://backend.appstudio-u7cm9zhmha0ruwv8.piappengine.com/pi/auth/v1/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accessToken: auth.accessToken
        })
      }
    );

    if (!response.ok) {
      throw new Error("Pi authentication verification failed");
    }

    const data = await response.json();

    if (!data.sessionToken || !data.user?.uid) {
      throw new Error("Invalid App Studio response");
    }

    sessionToken = data.sessionToken;
    piUser = data.user;

    return piUser;
  }

  window.FlowAnRiverPiAuth = {
    signIn: signInWithPi,
    getUser: () => piUser,
    getSessionToken: () => sessionToken
  };
})();
