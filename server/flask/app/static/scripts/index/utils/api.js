// Fetches the storage from server.
// Relevant server logic:
// return jsonify({"used_size": size, "max_size": max_size}), 200
async function getStorage() {
  const url = "/storage";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = `${TRANSLATIONS.error} ${response.status} - ${response.statusText}`;
      alert(errorText);
      window.location.reload();
      return;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    alert(`${TRANSLATIONS.problem_occurred} ${error.message}`);
    window.location.reload();
  }

  return null;
}

// Requests the server to replace a path with another.
// Both for renaming and moving files/folders
async function reformatRequest(old_path, new_path) {
  const url = `/reformat?old_path=${encodeURIComponent(
    old_path
  )}&new_path=${encodeURIComponent(new_path)}`;

  try {
    const response = await fetch(url);
    return response;
  } catch (error) {
    alert(`${TRANSLATIONS.problem_occurred} ${error.message}`);
    window.location.reload();
  }

  return null;
}

// Requests the server to delete a file or folder at the given path
async function deleteElement(path) {
  const url = `/delete?target=${encodeURIComponent(path)}`;

  try {
    const response = await fetch(url, { method: "DELETE" });
    if (!response.ok) {
      const errorText = `${TRANSLATIONS.error} ${response.status} - ${response.statusText}`;
      alert(errorText);
      window.location.reload();
      return;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    alert(`${TRANSLATIONS.problem_occurred} ${error.message}`);
    window.location.reload();
  }

  return null;
}

// Requests the server to create a new folder at the given path with the given name
async function createFolder(basePath, name) {
  const url = `/new/folder?path=${encodeURIComponent(
    basePath
  )}&name=${encodeURIComponent(name)}`;

  try {
    const response = await fetch(url, { method: "POST" });
    return response;
  } catch (error) {
    alert(`${TRANSLATIONS.problem_occurred} ${error.message}`);
    window.location.reload();
  }

  return null;
}

// Requests the server to check if the files given in the query are already there, and also if the size is not overflowing the limit when uploading
// Query:
// {data: [{id: int, filepath: str}, ...]}, size: int (Total bytes)}
// Response:
// response = {
//   "message": "done",
//   "storageError": size_error (boolean),
//   "responseJSON": [{id: int, isfolder: boolean, isfile: boolean}],
// }
async function getAvailableFiles(query) {
  const url = "/upload/available-files";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    });
    return response;
  } catch (error) {
    alert(`${TRANSLATIONS.problem_occurred} ${error.message}`);
    window.location.reload();
  }

  return null;
}

// Requests the server to list all files and folders in the given path, then returns the JSON response
async function loadFileList(filePath) {
  const url = `/list?path=${encodeURIComponent(filePath)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = `Errore: ${response.status} - ${response.statusText}`;
      alert(errorText);
      window.location.reload();
      return;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    alert(`${TRANSLATIONS.problem_occurred} ${error.message}`);
    window.location.reload();
  }

  return null;
}

// Fetches text at the given path from server
async function fetchText(path) {
  const response = await fetch(path);

  if (response.status !== 200) {
    alert(TRANSLATIONS.error_during_request);
    window.location.reload();
  }

  return await response.text();
}