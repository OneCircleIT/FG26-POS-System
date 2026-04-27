import { API } from "../constant";

const APP_SCRIPT_TIMEOUT_MS = 12000;

const parseResponseText = (text) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Invalid server response.");
  }
};

const fetchViaPost = async (payload) => {
  const response = await fetch(API, {
    redirect: "follow",
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
  });

  const text = await response.text();
  return parseResponseText(text);
};

const fetchViaJsonp = (passcode) => {
  return new Promise((resolve, reject) => {
    const callbackName = `__appScriptCb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const cleanup = () => {
      delete window[callbackName];
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };

    let timeoutId = null;
    let script = document.createElement("script");

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to reach server."));
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Server timeout."));
    }, APP_SCRIPT_TIMEOUT_MS);

    const url = new URL(API);
    url.searchParams.set("passcode", passcode);
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("_", Date.now().toString());
    script.src = url.toString();

    document.body.appendChild(script);
  });
};

export const requestCatalog = async (passcode) => {
  try {
    return await fetchViaPost({ passcode });
  } catch (postError) {
    return fetchViaJsonp(passcode);
  }
};

export const deductStock = async (passcode, items) => {
  return fetchViaPost({
    action: "deductStock",
    passcode,
    items,
  });
};
