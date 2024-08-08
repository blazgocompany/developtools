module.exports = {
  parseCustomSyntax: (input) => {
    const result = {
      tag: null,
      class: null,
      id: null,
      params: {},
      text: null,
      customCode: null,
      rawHTML: null, // Added to store raw HTML content
    };

    // Regex to match raw HTML delimiters and other components
    const rawHtmlRegex = /<!([\s\S]*?)!>/;
    const rawHtmlMatch = input.match(rawHtmlRegex);

    if (rawHtmlMatch) {
      result.rawHTML = rawHtmlMatch[1].trim();
      input = input.replace(rawHtmlRegex, "").trim();
    }

    const regex =
      /^([a-zA-Z0-9]+)(?:\.([a-zA-Z0-9]+))?(?:#([a-zA-Z0-9]+))?(?: \(([^)]+)\))? ?([^$!]*)? ?(\$\!\{.*?\})?$/;
    const match = input.match(regex);

    if (match) {
      result.tag = match[1];
      result.class = match[2] || null;
      result.id = match[3] || null;
      result.customCode = match[6] || null;

      if (match[4]) {
        const paramsString = match[4];
        const paramsArray = paramsString
          .split(",")
          .map((param) => param.split("="));
        paramsArray.forEach(([key, value]) => {
          result.params[key.trim()] = value.replace(/^"(.*)"$/, "$1");
        });
      }

      result.text = match[5] || "";
    }

    return result;
  },

  evaluateExpression: (expression, context) => {
    try {
      return new Function(
        ...Object.keys(context),
        `return ${expression}`
      ).apply(context, Object.values(context));
    } catch (e) {
      console.error(`Error evaluating expression: ${expression}`, e);
      return "";
    }
  },

  processTextWithExpressions: (text, context) => {
    return text.replace(/\$\{([^}]+)\}/g, (match, expr) => {
      return evaluateExpression(expr, context);
    });
  },

  createDOMElement: (parsedObject, context) => {
    if (!parsedObject.tag) {
      if (parsedObject.rawHTML) {
        // Create a temporary container to hold the raw HTML
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = parsedObject.rawHTML;
        return tempDiv.firstChild; // Return the first child of the container
      }
      return null;
    }

    const element = document.createElement(parsedObject.tag);
    if (parsedObject.class) {
      element.className = parsedObject.class;
    }

    if (parsedObject.id) {
      element.id = parsedObject.id;
    }

    for (const [key, value] of Object.entries(parsedObject.params)) {
      element.setAttribute(key, value);
    }

    const processedText = processTextWithExpressions(
      parsedObject.text,
      context
    );
    if (processedText) {
      element.appendChild(document.createTextNode(processedText));
    }

    if (parsedObject.customCode) {
      try {
        new Function(parsedObject.customCode).call(element);
      } catch (e) {
        console.error(
          `Error executing custom code: ${parsedObject.customCode}`,
          e
        );
      }
    }

    return element;
  },

  processMultipleLines: (input, context = {}, rootElement) => {
    const lines = input.split("\n").filter((line) => line.trim() !== "");
    const stack = [];
    let currentParent = rootElement;

    lines.forEach((line) => {
      const indentation = line.match(/^\s*/)[0].length;
      const parsedResult = parseCustomSyntax(line.trim());
      const domElement = createDOMElement(parsedResult, context);

      while (
        stack.length > 0 &&
        stack[stack.length - 1].indentation >= indentation
      ) {
        stack.pop();
        currentParent =
          stack.length > 0 ? stack[stack.length - 1].element : rootElement;
      }

      if (domElement) {
        currentParent.appendChild(domElement);
        stack.push({ element: domElement, indentation });
        currentParent = domElement;
      }
    });
  },

  cookie: (name) => {
    // Construct the name of the cookie to search for
    const nameEQ = name + "=";
    // Split cookies string into individual cookies
    const cookies = document.cookie.split(";");

    // Loop through each cookie
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i];
      // Remove leading whitespace
      while (cookie.charAt(0) === " ") {
        cookie = cookie.substring(1);
      }
      // Check if the cookie starts with the desired name
      if (cookie.indexOf(nameEQ) === 0) {
        // Return the cookie value (after the '=')
        return cookie.substring(nameEQ.length);
      }
    }
    // Return null if the cookie is not found
    return null;
  },
};
