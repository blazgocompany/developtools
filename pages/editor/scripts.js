// import w3CodeColor from "./w3color";

const $ = (e) => document.querySelector(e);
let editingTween = '';
let tweenStack = [];
let notDone = [];
// Initialize the timeline variable
let tl = gsap.timeline({ repeat: -1 });


async function updateFileData() {
  // Get the current URL
  const currentUrl = window.location.href;

  // Extract the unique_id from the last part of the URL
  const urlParts = currentUrl.split('/');
  const uniqueId = urlParts[urlParts.length - 1]; // Assuming the unique_id is the last part of the URL

  const apiUrl = `../internal/updatefiledata.blazgo`; // Endpoint without the unique_id

  // Prepare the data to be sent in the request body
  const requestBody = {
    unique_id: uniqueId,
    newData: btoa(JSON.stringify(tweenStack))
  };

  try {
    // Send a POST request to the server
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Handle the response
    const result = await response.json();

    if (response.ok) {
      console.log('Success:', result);
      $(".save-btn").innerHTML = "Saved!"
      setTimeout(() => {
        $(".save-btn").innerHTML = "Save"
      }, 1000);
    } else {
      console.error('Error:', result.message);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}




function getElementsInRange(rangeString) {
  // Helper function to parse ranges and individual numbers
  const parseRange = (str) => {
    const result = new Set();
    str.split(',').forEach((part) => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = start; i <= end; i++) result.add(i);
      } else {
        result.add(Number(part));
      }
    });
    return Array.from(result);
  };

  // Convert the input range string into a list of numbers
  const numbers = parseRange(rangeString);

  // Select all .preview-box elements
  const allBoxes = document.querySelectorAll('.preview-box');

  // Filter and return elements whose IDs match the numbers in the parsed range
  return Array.from(allBoxes).filter((box) => {
    const num = parseInt(box.id.replace('preview-box-', ''), 10);
    return numbers.includes(num);
  });
}

$('#elemRange').onchange = () => {
  console.log(getElementsInRange($('#elemRange').value));
  if (getElementsInRange($('#elemRange').value).length > 1) {
    $('.stagger-container').style.display = 'block';
  }
  else {
    $('.stagger-container').style.display = 'none';
    $('#stagger').value = 0
  }
};

Draggable.create('.sidebar', {
  bounds: $('#container'),
  inertia: true,
  dragClickables: false
});

const recalculate = () => {
  tl.pause(0);
  tl.clear();
  tl.kill();
  tl.set('.preview-box', {});
  // Add new tweens to the timeline
  tweenStack.forEach((tween) => {
    if (tween.position == "+=0") {
      const fromData = tween.fromVars.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      const toData = tween.toVars.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      toData.duration = tween.duration;
      toData.stagger = tween.stagger;
      toData.ease = tween.easing || 'linear';

      if (tween.fromVars.length === 0) {
        tl.to(getElementsInRange(tween.elements), toData);
      } else {
        tl.fromTo(getElementsInRange(tween.elements), fromData, toData);
      }
    }
    else {
      notDone.push(tween)
    }
  });
  notDone.forEach((tween) => {
    const fromData = tween.fromVars.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    const toData = tween.toVars.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    toData.duration = tween.duration;
    toData.stagger = tween.stagger;
    toData.ease = tween.easing || 'linear';

    if (tween.fromVars.length === 0) {
      tl.to(getElementsInRange(tween.elements), toData, tween.position);
    } else {
      tl.fromTo(getElementsInRange(tween.elements), fromData, toData, tween.position);
    }
  })
  // Play the new timeline
  tl.play();
};

document.querySelectorAll('.param').forEach((div) => {
  div.addEventListener('click', (event) => {
    // Check if CTRL key is pressed
    const ctrlKey = event.ctrlKey;
    console.log('fefuefh');
    // Toggle the checkbox
    const checkbox = event.target.querySelector('.param-checkbox');
    if (checkbox) {
      if (ctrlKey) {
        // If CTRL is pressed, toggle the checkbox state
        checkbox.checked = !checkbox.checked;
      } else {
        // If CTRL is not pressed, uncheck all other checkboxes
        document.querySelectorAll('.param-checkbox').forEach((cb) => {
          if (cb !== checkbox) {
            cb.checked = false;
          }
        });
        // Toggle the checkbox for the clicked div
        checkbox.checked = !checkbox.checked;
        document.querySelectorAll('.param').forEach((tdiv) => {
          const tcheckbox = tdiv.querySelector('.param-checkbox');
          if (tcheckbox && tcheckbox.checked) {
            tdiv.classList.add('selected');
          } else {
            tdiv.classList.remove('selected');
          }
        });
      }
    }
  });
});

$('.add-tween').onclick = () => {
  const tween = document.createElement('div');
  tween.className = 'tween';
  tween.innerHTML = 'Tween Name';
  tween.draggable = true;
  tween.id = 'tween' + Math.round(Math.random() * 100);

  tween.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', event.target.id);
    // Save initial position
    event.dataTransfer.setData('initialX', event.clientX);
    event.dataTransfer.setData('initialY', event.clientY);
  });

  tween.addEventListener('dragend', (event) => {
    // Handle the element's new position after drop
    tween.classList.remove('connected-both');
    tween.classList.remove('connected-left');
    tween.classList.remove('connected-right');

    const container = $('.timeline'); // Assuming $ works like querySelector
    const containerRect = container.getBoundingClientRect();
    const element = event.target;
    const elementRect = element.getBoundingClientRect();
    const dropX = event.clientX;
    const dropY = event.clientY;

    // Calculate the element's new position
    const newLeft = dropX - containerRect.left - (elementRect.width / 2);
    const newTop = dropY - containerRect.top - (elementRect.height / 2);

    // Ensure the element stays within the container bounds
    const clampedLeft = Math.max(
      0,
      Math.min(newLeft, containerRect.width - elementRect.width)
    );
    const clampedTop = Math.max(
      0,
      Math.min(newTop, containerRect.height - elementRect.height)
    );

    // Apply new position
    element.style.position = 'absolute';
    element.style.left = `${clampedLeft}px`;
    element.style.top = `${clampedTop}px`;

    // Trigger additional events or functions if needed
    element.click();
    updateParams();
    recalculate();
  });


  tween.addEventListener('dblclick', (event) => {
    const tween = event.target;
    tween.contentEditable = true;
    tween.focus();
  });

  tween.addEventListener('blur', (event) => {
    const tween = event.target;
    tween.contentEditable = false;

    tween.contentEditable = false;

    item = tweenStack.find((t) => t.element == tween)
    item.name = tween.innerHTML
  });

  tween.addEventListener('click', (event) => {
    handleClick(event)
  });

  tweenStack.push({
    element: $('.timeline').appendChild(tween),
    fromVars: [],
    toVars: [],
  });

  const allTweens = document.querySelectorAll('.tween');
  allTweens.forEach((tween, index) => {
    if (tween.style.position === 'absolute') {
      // Do nothing if the tween is already positioned
    } else {
      if (index === 0 && index !== allTweens.length - 1) {
        tween.classList.add('connected-right');
      } else if (index !== 0 && index === allTweens.length - 1) {
        tween.classList.add('connected-left');
      } else if (index > 0) {
        tween.classList.add('connected-both');
      } else {
        // No action needed
      }
    }
  });
};

$('#save').addEventListener('click', function () {
  updateParams();
  recalculate();
});

$('#addFromParam').addEventListener('click', function () {
  const fromParamsDiv = document.querySelector('.from-params');
  let newParam = document.createElement('div');
  newParam.classList.add('from-param', 'param');
  newParam.innerHTML = `
        <input type="checkbox" class="param-checkbox">
        <input type="text" class="from-key" placeholder="Key">
        <input type="text" class="from-val" placeholder="Value">
    `;
  newParam = fromParamsDiv.appendChild(newParam);
  let currTween = tweenStack.filter((t) => t.element == editingTween);
  currTween[0].fromVars.push({ key: '', value: '' });
  console.log(tweenStack);
});

$('#addToParam').addEventListener('click', function () {
  const toParamsDiv = document.querySelector('.to-params');
  let newParam = document.createElement('div');
  newParam.classList.add('to-param', 'param');
  newParam.innerHTML = `
        <input type="checkbox" class="param-checkbox">
        <input type="text" class="to-key" placeholder="Key">
        <input type="text" class="to-val" placeholder="Value">
    `;
  newParam = toParamsDiv.appendChild(newParam);
  let currTween = tweenStack.find((t) => t.element == editingTween);
  currTween.toVars.push({ key: '', value: '' });
  console.log(tweenStack);
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Delete') {
    const selectedCheckboxes = document.querySelectorAll(
      '.param-checkbox:checked'
    );
    selectedCheckboxes.forEach((checkbox) => {
      checkbox.parentElement.remove();
    });
  }
});

document.querySelectorAll('input').forEach((item) => {
  item.addEventListener('click', (event) => {
    event.target.focus();
  });
});

function updateParams() {
  // Arrays to hold the parameters
  const fromVars = [];
  const toVars = [];

  // Extracting from-params
  document.querySelectorAll('.from-param').forEach((param) => {
    const key = param.querySelector('.from-key').value.trim();
    const value = param.querySelector('.from-val').value.trim();
    if (key && value) {
      fromVars.push({ key, value });
    }
  });

  // Extracting to-params
  document.querySelectorAll('.to-param').forEach((param) => {
    const key = param.querySelector('.to-key').value.trim();
    const value = param.querySelector('.to-val').value.trim();
    if (key && value) {
      toVars.push({ key, value });
    }
  });

  let currTween = tweenStack.find((t) => t.element == editingTween);
  currTween.fromVars = fromVars;
  currTween.toVars = toVars;
  currTween.duration = $('#duration').value;
  let area = editingTween.getBoundingClientRect()
  if (editingTween.style.position == "absolute") {
    currTween.position = area.x / 32;
    console.log('came eerer')
  }
  else {
    currTween.position = "+=0"
  }
  currTween.elements = $('#elemRange').value;
  currTween.stagger = $('#stagger').value;
  currTween.easing = $('#easingFunction').value;

  editingTween.style.width = (Number(currTween.duration)
    + getElementsInRange(currTween.elements).length - 1
    * currTween.stagger) * 32 + "px"
  // Return the structured object
  // recalculate();
  return currTween;
}

function generate() {
  $(".sidebar").style.zIndex = 100
  const genCode = btoa(JSON.stringify(tweenStack));
  $('.code-box').style.display = 'block';
  const fullCode = `/*Using ZoCode (easiest option)*/
    var anim = animix.fromZoCode("${genCode}");
    anim.setup({/*Setup Variables*/});
    
    anim.start(); /* .pause() */
    
    /*Using JSON (complicated, more flexible)*/
    var anim = animix.fromJSON(\`${JSON.stringify(tweenStack)}\`)
    anim.setup({/*Setup Variables*/});
    
    anim.start()`;
  $('.gen-code').innerText = fullCode;
  w3CodeColor($('.gen-code'), 'js');
}



$('#elementPickerDoneButton').onclick = () => {
  $('#elementPickerDialog').style.display = 'none';
  const itemCount = parseInt($('#elementNumber').value, 10); // Get the number of items
  $('.preview').innerHTML = Array.from(
    { length: itemCount },
    (_, i) =>
      `<div class="preview-box" id="preview-box-${i + 1}">${i + 1}</div>`
  ).join('');
};

$('#addElements').onclick = () => {
  $('#elementPickerDialog').style.display = 'flex';
};




// Function to import tweens from JSON string
function importTweensFromJSON(jsonString) {
  try {
    // Parse the JSON string
    const data = JSON.parse(atob(jsonString));

    // Clear existing tweens and timeline
    tweenStack = [];
    tl.clear();
    tl.kill();

    // Create and add tweens based on the JSON data
    data.forEach(tweenData => {
      // Create new tween element
      const tween = document.createElement('div');
      tween.className = 'tween';
      tween.draggable = true;
      tween.innerHTML = tweenData.name || "Tween Name";

      // Set position
      tween.style.position = 'relative';

      tween.addEventListener('dblclick', handleDoubleClick);
      tween.addEventListener('blur', handleBlur);
      tween.addEventListener('click', handleClick);

      // Append the tween to the timeline container
      $('.timeline').appendChild(tween);

      // Restore tween parameters
      tweenStack.push({
        element: tween,
        fromVars: tweenData.fromVars,
        toVars: tweenData.toVars,
        duration: tweenData.duration,
        elements: tweenData.elements,
        stagger: tweenData.stagger,
        easing: tweenData.easing
      });

      // Create tweens on the timeline
      const fromData = tweenData.fromVars.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      const toData = tweenData.toVars.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      toData.duration = tweenData.duration;
      toData.stagger = tweenData.stagger;
      toData.ease = tweenData.easing || 'linear';

      if (tweenData.fromVars.length === 0) {
        tl.to(getElementsInRange(tweenData.elements), toData);
      } else {
        tl.fromTo(getElementsInRange(tweenData.elements), fromData, toData);
      }
    });

    // Play the timeline after importing tweens
    tl.play();
  } catch (error) {
    console.error('Failed to import tweens from JSON:', error);
  }
}

// Helper functions


function handleDoubleClick(event) {
  const tween = event.target;
  tween.contentEditable = true;
  tween.focus();
}

function handleBlur(event) {
  const tween = event.target;
  tween.contentEditable = false;

  item = tweenStack.find((t) => t.element == tween)
  item.name = tween.innerHTML
}

function handleClick(event) {
  $('.param-box').style.display = 'block';
  editingTween = event.target;
  $('.tween-name').innerHTML = event.target.innerHTML;

  // Find the tween object that corresponds to the clicked element
  const tween = tweenStack.find((x) => x.element === editingTween);
  $("#elemRange").value = tween.elements || 1
  $("#duration").value = tween.duration || 1
  $("#easingFunction").value = tween.easing || "power2.out"
  // Clear existing parameters
  const fromParamsContainer = document.querySelector('.from-params');
  const toParamsContainer = document.querySelector('.to-params');
  fromParamsContainer.innerHTML = '';
  toParamsContainer.innerHTML = '';

  // Populate fromParams
  if (tween && tween.fromVars) {
    tween.fromVars.forEach((param) => {
      const { key, value } = param;
      const paramDiv = document.createElement('div');
      paramDiv.className = 'from-param param';
      paramDiv.innerHTML = `
                    <input type="checkbox" class="param-checkbox">
                    <input type="text" class="from-key" value="${key}" placeholder="Key">
                    <input type="text" class="from-val" value="${value}" placeholder="Value">
                `;
      fromParamsContainer.appendChild(paramDiv);
    });
  }

  // Populate toParams
  if (tween && tween.toVars) {
    tween.toVars.forEach((param) => {
      const { key, value } = param;
      const paramDiv = document.createElement('div');
      paramDiv.className = 'to-param param';
      paramDiv.innerHTML = `
                    <input type="checkbox" class="param-checkbox">
                    <input type="text" class="to-key" value="${key}" placeholder="Key">
                    <input type="text" class="to-val" value="${value}" placeholder="Value">
                `;
      toParamsContainer.appendChild(paramDiv);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const contextMenu = document.getElementById('contextMenu');
  let selectedTween = null;

  // Show the context menu on right-click
  document.querySelector('.timeline').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (e.target.classList.contains('tween')) {
      selectedTween = e.target;
      contextMenu.style.display = 'block';
      contextMenu.style.left = `${e.pageX}px`;
      contextMenu.style.top = `${e.pageY}px`;
    }
  });

  // Hide the context menu on left click or click outside
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.style.display = 'none';
    }
  });

  // Handle context menu item clicks
  document.getElementById('delete-tween').addEventListener('click', () => {
    if (selectedTween) {
      const tweenIndex = tweenStack.findIndex(tween => tween.element == selectedTween);

      // Remove the tween from the timeline
      selectedTween.remove();

      // Find and remove the tween from the tweenstack
      const tweenId = selectedTween.getAttribute('data-id');
      if (tweenIndex !== -1) {
        tweenStack.splice(tweenIndex, 1); // Remove the tween from the tweenstack
      }

      // Optionally, recalculate or refresh the timeline
      recalculate(); // Adjust as needed

      contextMenu.style.display = 'none';
    }
  });
});







function w3CodeColor(elmnt, mode) {
  var lang = mode || 'html';
  var elmntObj = document.getElementById(elmnt) || elmnt;
  var elmntTxt = elmntObj.innerHTML;
  var tagcolor = '#1E90FF'; // Dodger Blue
  var tagnamecolor = '#D4A5A5'; // Light Coral
  var attributecolor = '#FF6347'; // Tomato
  var attributevaluecolor = '#1E90FF'; // Dodger Blue
  var commentcolor = '#9ACD32'; // Yellow Green
  var cssselectorcolor = '#D4A5A5'; // Light Coral
  var csspropertycolor = '#FF6347'; // Tomato
  var csspropertyvaluecolor = '#1E90FF'; // Dodger Blue
  var cssdelimitercolor = '#B0B0B0'; // Light Gray
  var cssimportantcolor = '#FF6347'; // Tomato
  var jscolor = '#B0B0B0'; // Light Gray
  var jskeywordcolor = '#1E90FF'; // Dodger Blue
  var jsstringcolor = '#D4A5A5'; // Light Coral
  var jsnumbercolor = '#FF6347'; // Tomato
  var jspropertycolor = '#B0B0B0'; // Light Gray

  elmntObj.style.fontFamily = "Consolas,'Courier New', monospace";
  if (!lang) {
    lang = 'html';
  }
  if (lang == 'html') {
    elmntTxt = htmlMode(elmntTxt);
  }
  if (lang == 'css') {
    elmntTxt = cssMode(elmntTxt);
  }
  if (lang == 'js') {
    elmntTxt = jsMode(elmntTxt);
  }
  elmntObj.innerHTML = elmntTxt;

  function extract(str, start, end, func, repl) {
    var s,
      e,
      d = '',
      a = [];
    while (str.search(start) > -1) {
      s = str.search(start);
      e = str.indexOf(end, s);
      if (e == -1) {
        e = str.length;
      }
      if (repl) {
        a.push(func(str.substring(s, e + end.length)));
        str = str.substring(0, s) + repl + str.substr(e + end.length);
      } else {
        d += str.substring(0, s);
        d += func(str.substring(s, e + end.length));
        str = str.substr(e + end.length);
      }
    }
    this.rest = d + str;
    this.arr = a;
  }
  function htmlMode(txt) {
    var rest = txt,
      done = '',
      php,
      comment,
      angular,
      startpos,
      endpos,
      note,
      i;
    comment = new extract(
      rest,
      '&lt;!--',
      '--&gt;',
      commentMode,
      'W3HTMLCOMMENTPOS'
    );
    rest = comment.rest;
    while (rest.indexOf('&lt;') > -1) {
      note = '';
      startpos = rest.indexOf('&lt;');
      if (rest.substr(startpos, 9).toUpperCase() == '&LT;STYLE') {
        note = 'css';
      }
      if (rest.substr(startpos, 10).toUpperCase() == '&LT;SCRIPT') {
        note = 'javascript';
      }
      endpos = rest.indexOf('&gt;', startpos);
      if (endpos == -1) {
        endpos = rest.length;
      }
      done += rest.substring(0, startpos);
      done += tagMode(rest.substring(startpos, endpos + 4));
      rest = rest.substr(endpos + 4);
      if (note == 'css') {
        endpos = rest.indexOf('&lt;/style&gt;');
        if (endpos > -1) {
          done += cssMode(rest.substring(0, endpos));
          rest = rest.substr(endpos);
        }
      }
      if (note == 'javascript') {
        endpos = rest.indexOf('&lt;/script&gt;');
        if (endpos > -1) {
          done += jsMode(rest.substring(0, endpos));
          rest = rest.substr(endpos);
        }
      }
    }
    rest = done + rest;
    for (i = 0; i < comment.arr.length; i++) {
      rest = rest.replace('W3HTMLCOMMENTPOS', comment.arr[i]);
    }
    return rest;
  }
  function tagMode(txt) {
    var rest = txt,
      done = '',
      startpos,
      endpos,
      result;
    while (rest.search(/(\s|<br>)/) > -1) {
      startpos = rest.search(/(\s|<br>)/);
      endpos = rest.indexOf('&gt;');
      if (endpos == -1) {
        endpos = rest.length;
      }
      done += rest.substring(0, startpos);
      done += attributeMode(rest.substring(startpos, endpos));
      rest = rest.substr(endpos);
    }
    result = done + rest;
    result =
      '<span style=color:' + tagcolor + '>&lt;</span>' + result.substring(4);
    if (result.substr(result.length - 4, 4) == '&gt;') {
      result =
        result.substring(0, result.length - 4) +
        '<span style=color:' +
        tagcolor +
        '>&gt;</span>';
    }
    return '<span style=color:' + tagnamecolor + '>' + result + '</span>';
  }
  function attributeMode(txt) {
    var rest = txt,
      done = '',
      startpos,
      endpos,
      singlefnuttpos,
      doublefnuttpos,
      spacepos;
    while (rest.indexOf('=') > -1) {
      endpos = -1;
      startpos = rest.indexOf('=');
      singlefnuttpos = rest.indexOf("'", startpos);
      doublefnuttpos = rest.indexOf('"', startpos);
      spacepos = rest.indexOf(' ', startpos + 2);
      if (
        spacepos > -1 &&
        (spacepos < singlefnuttpos || singlefnuttpos == -1) &&
        (spacepos < doublefnuttpos || doublefnuttpos == -1)
      ) {
        endpos = rest.indexOf(' ', startpos);
      } else if (
        doublefnuttpos > -1 &&
        (doublefnuttpos < singlefnuttpos || singlefnuttpos == -1) &&
        (doublefnuttpos < spacepos || spacepos == -1)
      ) {
        endpos = rest.indexOf('"', rest.indexOf('"', startpos) + 1);
      } else if (
        singlefnuttpos > -1 &&
        (singlefnuttpos < doublefnuttpos || doublefnuttpos == -1) &&
        (singlefnuttpos < spacepos || spacepos == -1)
      ) {
        endpos = rest.indexOf("'", rest.indexOf("'", startpos) + 1);
      }
      if (!endpos || endpos == -1 || endpos < startpos) {
        endpos = rest.length;
      }
      done += rest.substring(0, startpos);
      done += attributeValueMode(rest.substring(startpos, endpos + 1));
      rest = rest.substr(endpos + 1);
    }
    return (
      '<span style=color:' + attributecolor + '>' + done + rest + '</span>'
    );
  }
  function attributeValueMode(txt) {
    return '<span style=color:' + attributevaluecolor + '>' + txt + '</span>';
  }
  function commentMode(txt) {
    return '<span style=color:' + commentcolor + '>' + txt + '</span>';
  }
  function cssMode(txt) {
    var rest = txt,
      done = '',
      s,
      e,
      comment,
      i,
      midz,
      c,
      cc;
    comment = new extract(rest, /\/\*/, '*/', commentMode, 'W3CSSCOMMENTPOS');
    rest = comment.rest;
    while (rest.search('{') > -1) {
      s = rest.search('{');
      midz = rest.substr(s + 1);
      cc = 1;
      c = 0;
      for (i = 0; i < midz.length; i++) {
        if (midz.substr(i, 1) == '{') {
          cc++;
          c++;
        }
        if (midz.substr(i, 1) == '}') {
          cc--;
        }
        if (cc == 0) {
          break;
        }
      }
      if (cc != 0) {
        c = 0;
      }
      e = s;
      for (i = 0; i <= c; i++) {
        e = rest.indexOf('}', e + 1);
      }
      if (e == -1) {
        e = rest.length;
      }
      done += rest.substring(0, s + 1);
      done += cssPropertyMode(rest.substring(s + 1, e));
      rest = rest.substr(e);
    }
    rest = done + rest;
    rest = rest.replace(
      /{/g,
      '<span style=color:' + cssdelimitercolor + '>{</span>'
    );
    rest = rest.replace(
      /}/g,
      '<span style=color:' + cssdelimitercolor + '>}</span>'
    );
    for (i = 0; i < comment.arr.length; i++) {
      rest = rest.replace('W3CSSCOMMENTPOS', comment.arr[i]);
    }
    return '<span style=color:' + cssselectorcolor + '>' + rest + '</span>';
  }
  function cssPropertyMode(txt) {
    var rest = txt,
      done = '',
      s,
      e,
      n,
      loop;
    if (rest.indexOf('{') > -1) {
      return cssMode(rest);
    }
    while (rest.search(':') > -1) {
      s = rest.search(':');
      loop = true;
      n = s;
      while (loop == true) {
        loop = false;
        e = rest.indexOf(';', n);
        if (rest.substring(e - 5, e + 1) == '&nbsp;') {
          loop = true;
          n = e + 1;
        }
      }
      if (e == -1) {
        e = rest.length;
      }
      done += rest.substring(0, s);
      done += cssPropertyValueMode(rest.substring(s, e + 1));
      rest = rest.substr(e + 1);
    }
    return (
      '<span style=color:' + csspropertycolor + '>' + done + rest + '</span>'
    );
  }
  function cssPropertyValueMode(txt) {
    var rest = txt,
      done = '',
      s;
    rest =
      '<span style=color:' +
      cssdelimitercolor +
      '>:</span>' +
      rest.substring(1);
    while (rest.search(/!important/i) > -1) {
      s = rest.search(/!important/i);
      done += rest.substring(0, s);
      done += cssImportantMode(rest.substring(s, s + 10));
      rest = rest.substr(s + 10);
    }
    result = done + rest;
    if (
      result.substr(result.length - 1, 1) == ';' &&
      result.substr(result.length - 6, 6) != '&nbsp;' &&
      result.substr(result.length - 4, 4) != '&lt;' &&
      result.substr(result.length - 4, 4) != '&gt;' &&
      result.substr(result.length - 5, 5) != '&amp;'
    ) {
      result =
        result.substring(0, result.length - 1) +
        '<span style=color:' +
        cssdelimitercolor +
        '>;</span>';
    }
    return (
      '<span style=color:' + csspropertyvaluecolor + '>' + result + '</span>'
    );
  }
  function cssImportantMode(txt) {
    return (
      '<span style=color:' +
      cssimportantcolor +
      ';font-weight:bold;>' +
      txt +
      '</span>'
    );
  }
  function jsMode(txt) {
    var rest = txt,
      done = '',
      esc = [],
      i,
      cc,
      tt = '',
      sfnuttpos,
      dfnuttpos,
      compos,
      comlinepos,
      keywordpos,
      numpos,
      mypos,
      dotpos,
      y;
    for (i = 0; i < rest.length; i++) {
      cc = rest.substr(i, 1);
      if (cc == '\\') {
        esc.push(rest.substr(i, 2));
        cc = 'W3JSESCAPE';
        i++;
      }
      tt += cc;
    }
    rest = tt;
    y = 1;
    while (y == 1) {
      sfnuttpos = getPos(rest, "'", "'", jsStringMode);
      dfnuttpos = getPos(rest, '"', '"', jsStringMode);
      compos = getPos(rest, /\/\*/, '*/', commentMode);
      comlinepos = getPos(rest, /\/\//, '<br>', commentMode);
      numpos = getNumPos(rest, jsNumberMode);
      keywordpos = getKeywordPos('js', rest, jsKeywordMode);
      dotpos = getDotPos(rest, jsPropertyMode);
      if (
        Math.max(
          numpos[0],
          sfnuttpos[0],
          dfnuttpos[0],
          compos[0],
          comlinepos[0],
          keywordpos[0],
          dotpos[0]
        ) == -1
      ) {
        break;
      }
      mypos = getMinPos(
        numpos,
        sfnuttpos,
        dfnuttpos,
        compos,
        comlinepos,
        keywordpos,
        dotpos
      );
      if (mypos[0] == -1) {
        break;
      }
      if (mypos[0] > -1) {
        done += rest.substring(0, mypos[0]);
        done += mypos[2](rest.substring(mypos[0], mypos[1]));
        rest = rest.substr(mypos[1]);
      }
    }
    rest = done + rest;
    for (i = 0; i < esc.length; i++) {
      rest = rest.replace('W3JSESCAPE', esc[i]);
    }
    return '<span style=color:' + jscolor + '>' + rest + '</span>';
  }
  function jsStringMode(txt) {
    return '<span style=color:' + jsstringcolor + '>' + txt + '</span>';
  }
  function jsKeywordMode(txt) {
    return '<span style=color:' + jskeywordcolor + '>' + txt + '</span>';
  }
  function jsNumberMode(txt) {
    return '<span style=color:' + jsnumbercolor + '>' + txt + '</span>';
  }
  function jsPropertyMode(txt) {
    return '<span style=color:' + jspropertycolor + '>' + txt + '</span>';
  }
  function getDotPos(txt, func) {
    var x,
      i,
      j,
      s,
      e,
      arr = [
        '.',
        '<',
        ' ',
        ';',
        '(',
        '+',
        ')',
        '[',
        ']',
        ',',
        '&',
        ':',
        '{',
        '}',
        '/',
        '-',
        '*',
        '|',
        '%',
      ];
    s = txt.indexOf('.');
    if (s > -1) {
      x = txt.substr(s + 1);
      for (j = 0; j < x.length; j++) {
        cc = x[j];
        for (i = 0; i < arr.length; i++) {
          if (cc.indexOf(arr[i]) > -1) {
            e = j;
            return [s + 1, e + s + 1, func];
          }
        }
      }
    }
    return [-1, -1, func];
  }
  function getMinPos() {
    var i,
      arr = [];
    for (i = 0; i < arguments.length; i++) {
      if (arguments[i][0] > -1) {
        if (arr.length == 0 || arguments[i][0] < arr[0]) {
          arr = arguments[i];
        }
      }
    }
    if (arr.length == 0) {
      arr = arguments[i];
    }
    return arr;
  }
  function getKeywordPos(typ, txt, func) {
    var words,
      i,
      pos,
      rpos = -1,
      rpos2 = -1,
      patt;
    if (typ == 'js') {
      words = [
        'abstract',
        'arguments',
        'boolean',
        'break',
        'byte',
        'case',
        'catch',
        'char',
        'class',
        'const',
        'continue',
        'debugger',
        'default',
        'delete',
        'do',
        'double',
        'else',
        'enum',
        'eval',
        'export',
        'extends',
        'false',
        'final',
        'finally',
        'float',
        'for',
        'function',
        'goto',
        'if',
        'implements',
        'import',
        'in',
        'instanceof',
        'int',
        'interface',
        'let',
        'long',
        'NaN',
        'native',
        'new',
        'null',
        'package',
        'private',
        'protected',
        'public',
        'return',
        'short',
        'static',
        'super',
        'switch',
        'synchronized',
        'this',
        'throw',
        'throws',
        'transient',
        'true',
        'try',
        'typeof',
        'var',
        'void',
        'volatile',
        'while',
        'with',
        'yield',
      ];
    }
    for (i = 0; i < words.length; i++) {
      pos = txt.indexOf(words[i]);
      if (pos > -1) {
        patt = /\W/g;
        if (
          txt.substr(pos + words[i].length, 1).match(patt) &&
          txt.substr(pos - 1, 1).match(patt)
        ) {
          if (pos > -1 && (rpos == -1 || pos < rpos)) {
            rpos = pos;
            rpos2 = rpos + words[i].length;
          }
        }
      }
    }
    return [rpos, rpos2, func];
  }
  function getPos(txt, start, end, func) {
    var s, e;
    s = txt.search(start);
    e = txt.indexOf(end, s + end.length);
    if (e == -1) {
      e = txt.length;
    }
    return [s, e + end.length, func];
  }
  function getNumPos(txt, func) {
    var arr = [
      '<br>',
      ' ',
      ';',
      '(',
      '+',
      ')',
      '[',
      ']',
      ',',
      '&',
      ':',
      '{',
      '}',
      '/',
      '-',
      '*',
      '|',
      '%',
      '=',
    ],
      i,
      j,
      c,
      startpos = 0,
      endpos,
      word;
    for (i = 0; i < txt.length; i++) {
      for (j = 0; j < arr.length; j++) {
        c = txt.substr(i, arr[j].length);
        if (c == arr[j]) {
          if (
            c == '-' &&
            (txt.substr(i - 1, 1) == 'e' || txt.substr(i - 1, 1) == 'E')
          ) {
            continue;
          }
          endpos = i;
          if (startpos < endpos) {
            word = txt.substring(startpos, endpos);
            if (!isNaN(word)) {
              return [startpos, endpos, func];
            }
          }
          i += arr[j].length;
          startpos = i;
          i -= 1;
          break;
        }
      }
    }
    return [-1, -1, func];
  }
}
