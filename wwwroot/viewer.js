async function getAccessToken(callback) {
  try {
    const resp = await fetch("/api/auth/token");
    if (!resp.ok) {
      throw new Error(await resp.text());
    }
    const { access_token, expires_in } = await resp.json();
    callback(access_token, expires_in);
  } catch (err) {
    alert("Could not obtain access token. See the console for more details.");
    console.error(err);
  }
}

window.initViewer = function (container) {
  return new Promise(function (resolve, reject) {
    Autodesk.Viewing.Initializer(
      { env: "AutodeskProduction", getAccessToken },
      function () {
        const config = {
          extensions: ["Autodesk.DocumentBrowser"],
        };
        const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
        viewer.start();
        viewer.setTheme("light-theme");
        resolve(viewer);
      },
    );
  });
};

window.loadModel = function (viewer, urn) {
  return new Promise(function (resolve, reject) {
    function onDocumentLoadSuccess(doc) {
      const root = doc.getRoot();
      const view3D = root.search({
        type: "geometry",
        role: "3d",
      });

      if (view3D.length > 0) {
        resolve(viewer.loadDocumentNode(doc, view3D[0]));
        return;
      }

      resolve(viewer.loadDocumentNode(doc, root.getDefaultGeometry()));
    }

    function onDocumentLoadFailure(code, message, errors) {
      reject({ code, message, errors });
    }

    viewer.setLightPreset(0);

    Autodesk.Viewing.Document.load(
      "urn:" + urn,
      onDocumentLoadSuccess,
      onDocumentLoadFailure,
    );
  });
};
