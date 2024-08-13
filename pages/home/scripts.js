function timeAgo(timestamp) {
  const now = new Date();
  const pastDate = new Date(timestamp);
  const seconds = Math.floor((now - pastDate) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const oneWeek = 7;
  const oneYear = 365;

  // Check time difference
  if (seconds < 60) {
    return "Just Now";
  } else if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else if (days < oneWeek) {
    return `${days} days ago`;
  } else if (days < oneWeek * 2) {
    const dayOfWeek = pastDate.toLocaleDateString("en-US", { weekday: "long" });
    return `last ${dayOfWeek}`;
  } else if (days < oneYear) {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return pastDate.toLocaleDateString("en-US", options);
  } else {
    const options = { year: "numeric", month: "numeric", day: "numeric" };
    return pastDate.toLocaleDateString("en-US", options);
  }
}

function deleteFile(fileId) {
  fetch("/internal/deletefile.blazgo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: fileId }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to delete file");
      }
      return response.json();
    })
    .then((result) => {
      if (result.success) {
        // Remove the file element from the DOM
        document.getElementById(`file-${fileId}`).style.height = "0px";
        document.getElementById(`file-${fileId}`).style.transform = "scaleX(0)";
      } else {
        alert("Failed to delete file");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

fetch("/internal/getfiles.blazgo")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  })
  .then((data) => {
    const fileContainer = document.querySelector(".filecontainer");
    data.rows.forEach((file) => {
      const fileElement = document.createElement("div");
      fileElement.className = "file";
      fileElement.id = `file-${file.id}`; // Unique ID for each file element

      // Escaping file names for safety
      const escapedName = file.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");

      fileElement.innerHTML = `
              <div class="filename">${escapedName}</div>
              <div class="filedate">${timeAgo(file.modifieddate)}</div>
              <div class="openbtn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                      class="bi bi-box-arrow-up-right" viewBox="0 0 16 16">
                      <path fill-rule="evenodd"
                          d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5" />
                      <path fill-rule="evenodd"
                          d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z" />
                  </svg>
              </div>
              <div class="deletebtn" onclick="deleteFile(${file.id})">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
                      <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
                  </svg>
              </div>
          `;
      fileContainer.appendChild(fileElement);
    });
  })
  .catch((error) => {
    console.error("There was a problem with the fetch operation:", error);
  });
