const EOF = Symbol("EOF");

const RegExpASCIIAlpha = /^[a-zA-Z]$/;
/**
 * U+0009 CHARACTER TABULATION (tab)
 * U+000A LINE FEED (LF)
 * U+000C FORM FEED (FF)
 * U+0020 SPACE
 */
const RegExpBlankChar = /^[\t\n\f ]$/;

let currentToken = null;
let currentAttribute = null;
let currentTextNode = null;

const stack = [{ type: "document", children: [] }];

function emit(token) {
  let top = stack[stack.length - 1];

  if (token.type === "startTag") {
    const element = {
      type: "element",
      tagName: token.tagName,
      children: [],
      attributes: []
    };

    for (let p in token) {
      if (p !== "type" && p !== "tagName") {
        element.attributes.push({
          name: p,
          value: token[p]
        });
      }
    }

    top.children.push(element);
    element.parent = top;

    if (!token.isSelfClosing) stack.push(element);

    currentTextNode = null;
  } else if (token.type === "endTag") {
    if (top.tagName !== token.tagName) {
      throw new Error("Tag start end doesn't matched!");
    } else {
      stack.pop();
    }
    currentTextNode = null;
  } else if (token.type === "text") {
    if (currentTextNode === null) {
      currentTextNode = {
        type: "text",
        content: ""
      };

      top.children.push(currentTextNode);
    }
    currentTextNode.content += token.content;
  }
}

/** 13.2.5.1 Data state */
function data(c) {
  if (c === "<") {
    return tagOpen;
  } else if (c === EOF) {
    // Emit an end-of-file token.
    emit({
      type: "EOF"
    });
    return;
  } else {
    // Emit the current input character as a character token.
    emit({
      type: "text",
      content: c
    });
    return data;
  }
}

/** 13.2.5.6 Tag open state */
function tagOpen(c) {
  if (c === "/") {
    return endTagOpen;
  } else if (RegExpASCIIAlpha.test(c)) {
    // Create a new start tag token, set its tag name to the empty string.
    currentToken = {
      type: "startTag",
      tagName: ""
    };
    return tagName(c);
  } else if (c === EOF) {
    return;
  } else {
    return data(c);
  }
}

/** 13.2.5.7 End tag open state */
function endTagOpen(c) {
  if (RegExpASCIIAlpha.test(c)) {
    // Create a new end tag token, set its tag name to the empty string.
    currentToken = {
      type: "endTag",
      tagName: ""
    };
    return tagName(c);
  } else if (c === ">") {
    // error: missing-end-tag-name
  } else if (c === EOF) {
    // error:  eof-before-tag-name
  } else {
    // error: invalid-first-character-of-tag-name
  }
}

/** 13.2.5.8 Tag name state */
function tagName(c) {
  if (RegExpBlankChar.test(c)) {
    return beforeAttributeName;
  } else if (c === "/") {
    return selfClosingStartTag;
  } else if (c === ">") {
    // Emit the current tag token.
    emit(currentToken);
    return data;
  } else {
    // Append the current input character to the current tag token's tag name.
    currentToken.tagName += c.toLowerCase();
    return tagName;
  }
}

/** 13.2.5.32 Before attribute name state */
function beforeAttributeName(c) {
  if (RegExpBlankChar.test(c)) {
    return beforeAttributeName;
  } else if (c === "/" || c === ">" || c === EOF) {
    return afterAttributeName(c);
  } else if (c === "=") {
    // error: unexpected-equals-sign-before-attribute-name
    // Start a new attribute in the current tag token.
    // todo: Set that attribute's name to the current input character, and its value to the empty string.
    currentAttribute = {
      name: "",
      value: ""
    };
    // Switch to the attribute name state.
    return attributeName;
  } else {
    currentAttribute = {
      name: "",
      value: ""
    };
    return attributeName(c);
  }
}

/** 13.2.5.34 After attribute name state */
function afterAttributeName(c) {
  if (RegExpBlankChar.test(c)) {
    return afterAttributeName;
  } else if (c === "/") {
    return selfClosingStartTag;
  } else if (c === "=") {
    return beforeAttributeValue;
  } else if (c === ">") {
    // Emit the current tag token.
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c === EOF) {
    // error: eof-in-tag
  } else {
    currentToken[currentAttribute.name] = currentAttribute.value;
    currentAttribute = {
      name: "",
      value: ""
    };
    return attributeName(c);
  }
}

/** 13.2.5.33 Attribute name state */
function attributeName(c) {
  if (RegExpBlankChar.test(c) || c === "/" || c === ">" || c === EOF) {
    return afterAttributeName(c);
  } else if (c === "=") {
    return beforeAttributeValue;
  } else if (c === "\u0000") {
    // error: unexpected-null-character
  } else if (c === '"' || c === "'" || c === "<") {
    // error: unexpected-character-in-attribute-name
  } else {
    // append to the current attribute's name.
    currentAttribute.name += c;
    return attributeName;
  }
}

/** 13.2.5.35 Before attribute value state */
function beforeAttributeValue(c) {
  if (RegExpBlankChar.test(c)) {
    return beforeAttributeValue;
  } else if (c === '"') {
    return attributeValueDoubleQuoted;
  } else if (c === "'") {
    return attributeValueSingleQuoted;
  } else if (c === ">") {
    // error: missing-attribute-value
    // todo: Emit the current tag token.
    emit();
    return data;
  } else {
    return attributeValueUnquoted(c);
  }
}

/** 13.2.5.36 Attribute value (double-quoted) state */
function attributeValueDoubleQuoted(c) {
  if (c === '"') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterAttributeValueQuoted;
  } else if (c === "&") {
    // todo: Switch to the character reference state.
    return attributeValueDoubleQuoted;
  } else if (c === "\u0000") {
    // error: unexpected-null-character
  } else if (c === EOF) {
    // error: eof-in-tag
  } else {
    currentAttribute.value += c;
    return attributeValueDoubleQuoted;
  }
}

/** 13.2.5.37 Attribute value (single-quoted) state */
function attributeValueSingleQuoted(c) {
  if (c === '"') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterAttributeValueQuoted;
  } else if (c === "&") {
    // todo: Switch to the character reference state.
    return attributeValueSingleQuoted;
  } else if (c === "\u0000") {
    // error: unexpected-null-character
  } else if (c === EOF) {
    // error: eof-in-tag
  } else {
    currentAttribute.value += c;
    return attributeValueSingleQuoted;
  }
}

/** 13.2.5.38 Attribute value (unquoted) state */
function attributeValueUnquoted(c) {
  if (RegExpBlankChar.test(c)) {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return beforeAttributeName;
  } else if (c === ">") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    // Emit the current tag token.
    emit(currentToken);
    return data;
  } else if (c === "\u0000") {
    // error: unexpected-null-character
  } else if (/^["'<=`]$/.test(c)) {
    // error: unexpected-character-in-unquoted-attribute-value
  } else if (c === EOF) {
    // error: eof-in-tag parse error.
    // Emit an end-of-file token.
  } else {
    currentAttribute.value += c;
    return attributeValueUnquoted;
  }
}

/** 13.2.5.39 After attribute value (quoted) state */
function afterAttributeValueQuoted(c) {
  if (RegExpBlankChar.test(c)) {
    return beforeAttributeName;
  } else if (c === "/") {
    return selfClosingStartTag;
  } else if (c === ">") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c === EOF) {
    // error: eof-in-tag
  } else {
    // error: missing-whitespace-between-attributes
    return beforeAttributeName(c);
  }
}

/** 13.2.5.40 Self-closing start tag state */
function selfClosingStartTag(c) {
  if (c === ">") {
    // Emit the current tag token.
    currentToken.isSelfClosing = true;
    emit(currentToken);
    return data;
  } else if (c === EOF) {
    // error: eof-in-tag
  } else {
    // error:  unexpected-solidus-in-tag
    return beforeAttributeName(c);
  }
}

module.exports.parseHTML = function parseHTML(html) {
  let state = data;
  for (let c of html) {
    state = state(c);
  }
  state = state(EOF);
  return stack[0];
};
