import { initViewer, loadModel } from "./viewer.js";

initViewer(document.getElementById("preview")).then((viewer) => {
  monitorAndLoadModel(viewer);
});

async function monitorAndLoadModel(viewer) {
  if (window.statusCheckTimeout) {
    clearTimeout(window.statusCheckTimeout);
  }

  try {
    const resp = await fetch("/api/models/bo5/status");
    if (!resp.ok) {
      throw new Error(await resp.text());
    }

    const data = await resp.json();

    switch (data.status) {
      case "not_found":
        showNotification(
          "Model configuration pending. Please run the admin upload script.",
        );
        break;
      case "inprogress":
        showNotification(
          `Processing architectural assets (${data.progress || "0%"}) ... Please wait.`,
        );
        // Poll status every 5 seconds until complete
        window.statusCheckTimeout = setTimeout(
          () => monitorAndLoadModel(viewer),
          5000,
        );
        break;
      case "failed":
        showNotification(
          "Model processing sequence encountered an error on processing pipeline.",
        );
        break;
      case "success":
      default:
        clearNotification();
        loadModel(viewer, data.urn);
        break;
    }
  } catch (err) {
    showNotification("Error establishing handshake with asset connection.");
    console.error(err);
  }
}

function showNotification(message) {
  const overlay = document.getElementById("overlay");
  overlay.innerHTML = `<div class="notification">${message}</div>`;
  overlay.style.display = "flex";
}

function clearNotification() {
  const overlay = document.getElementById("overlay");
  overlay.innerHTML = "";
  overlay.style.display = "none";
}
