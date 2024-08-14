// Function to format timestamps into a readable "time ago" format
function timeAgo(timestamp) {
  const now = new Date();
  const pastDate = new Date(timestamp);
  const seconds = Math.floor((now - pastDate) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const oneWeek = 7;
  const oneYear = 365;

  if (seconds < 60) return "Just Now";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < oneWeek) return `${days} days ago`;
  if (days < oneWeek * 2) {
    const dayOfWeek = pastDate.toLocaleDateString("en-US", { weekday: "long" });
    return `last ${dayOfWeek}`;
  }
  if (days < oneYear) {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    return pastDate.toLocaleDateString("en-US", options);
  }
  const options = { year: "numeric", month: "numeric", day: "numeric" };
  return pastDate.toLocaleDateString("en-US", options);
}

// Function to delete a file
function deleteFile(fileId) {
  fetch("/internal/deletefile.blazgo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: fileId }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to delete file");
      return response.json();
    })
    .then((result) => {
      if (result.success) {
        const fileElement = document.getElementById(`file-${fileId}`);
        if (fileElement) {
          fileElement.style.height = "0px";
          fileElement.style.transform = "scaleX(0)";
          setTimeout(() => fileElement.remove(), 300); // Remove after animation
        }
      } else {
        alert("Failed to delete file");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

// Function to rename a file
function renameFile(fileId, newName) {
  fetch('/internal/renamefile.blazgo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: fileId, newName: newName }),
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to rename file');
      return response.json();
    })
    .then(result => {
      if (result.success) {
        const fileElement = document.getElementById(`file-${fileId}`);
        if (fileElement) {
          const filenameElement = fileElement.querySelector('.filename');
          if (filenameElement) {
            filenameElement.textContent = result.file.Name;
          }
        }
        alert('File renamed successfully');
      } else {
        alert('Failed to rename file: ' + result.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

// Function to hash and truncate a string (using Web Crypto API)
async function hashStringAndTruncate(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexString = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  return hexString.slice(0, 64);
}

// Event listener for creating a new file
document.addEventListener('DOMContentLoaded', () => {
  const createButton = document.querySelector('.createbtn');
  if (createButton) {
    createButton.addEventListener('click', async () => {
      try {
        const response = await fetch('/internal/createfile.blazgo', { method: 'GET' });
        const data = await response.json();
        if (response.ok) {
          alert(`File created successfully with ID: ${data.id}`);
          // Optionally update the file list here
        } else {
          alert(`Error: ${data.message}`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('An unexpected error occurred.');
      }
    });
  }
});

// Function to make a file element editable
function makeFileEditable(fileElement) {
  const filenameElement = fileElement.querySelector('.filename');
  const fileId = fileElement.id.replace('file-', '');

  if (filenameElement) {
    filenameElement.addEventListener('dblclick', function() {
      const currentName = filenameElement.textContent.trim();
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName;
      filenameElement.innerHTML = '';
      filenameElement.appendChild(input);
      input.focus();

      function saveName() {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
          renameFile(fileId, newName);
        } else {
          filenameElement.textContent = currentName;
        }
        document.removeEventListener('click', outsideClickListener);
        input.removeEventListener('keydown', enterKeyListener);
      }

      function enterKeyListener(e) {
        if (e.key === 'Enter') {
          saveName();
        }
      }

      function outsideClickListener(e) {
        if (!fileElement.contains(e.target)) {
          saveName();
        }
      }

      document.addEventListener('click', outsideClickListener);
      input.addEventListener('keydown', enterKeyListener);
    });
  }
}

// Fetch and display files
fetch("/internal/getfiles.blazgo")
  .then((response) => {
    if (!response.ok) throw new Error("Network response was not ok");
    return response.json();
  })
  .then((data) => {
    const fileContainer = document.querySelector(".filecontainer");
    data.forEach((file) => {
      const fileElement = document.createElement("div");
      fileElement.className = "file";
      fileElement.id = `file-${file.id}`;

      const escapedName = file.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");

      fileElement.innerHTML = `
        <div class="filename">${escapedName}</div>
        <div class="filedate">${timeAgo(file.modifieddate)}</div>
        <div class="openbtn" onclick="openFile('${file.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-up-right" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5" />
            <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z" />
          </svg>
        </div>
        <div class="deletebtn" onclick="deleteFile(${file.id})">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
          </svg>
        </div>
      `;
      fileContainer.appendChild(fileElement);
      makeFileEditable(fileElement);
    });
  })
  .catch((error) => {
    console.error("There was a problem with the fetch operation:", error);
  });

// Function to handle opening a file in a new window
function openFile(fileId) {
  window.location.href = `/animations/${fileId}`;
}
