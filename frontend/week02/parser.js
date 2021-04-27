const css = require("css");

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
const rules = [];

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

    // 入栈前计算
    computeCss(element);

    top.children.push(element);
    element.parent = top;

    if (!token.isSelfClosing) stack.push(element);

    currentTextNode = null;
  } else if (token.type === "endTag") {
    if (top.tagName !== token.tagName) {
      throw new Error("Tag start end doesn't matched!");
    } else {
      // 收集css规则
      if (top.tagName === "style") {
        addCssRules(top.children[0].content);
      }
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

function addCssRules(text) {
  const ast = css.parse(text);
  // console.log(JSON.stringify(ast));
  console.log(JSON.stringify(ast, null, "   "));
  rules.push(...ast.stylesheet.rules);
}

function computeCss(element) {
  // 父级元素列表
  const elements = stack.slice().reverse();

  if (!element.computedStyle) element.computedStyle = {};

  for (let rule of rules) {
    const selectorParts = rule.selectors[0].split(" ").reverse();

    // 先匹配当前元素
    if (!match(element, selectorParts[0])) continue;

    let matched = false;

    let j = 1;
    for (let i = 0; i < elements.length; i++) {
      if (match(elements[i], selectorParts[j])) j++;
    }

    if (j >= selectorParts.length) {
      matched = true;
    }

    if (matched) {
      const sp = specificity(rule.selectors[0]);
      const _computedStyle = element.computedStyle;

      for (let declaration of rule.declarations) {
        if (!_computedStyle[declaration.property]) {
          _computedStyle[declaration.property] = {};
        }

        if (
          !_computedStyle[declaration.property].specificity ||
          compare(_computedStyle[declaration.property].specificity, sp) < 0
        ) {
          _computedStyle[declaration.property].value = declaration.value;
          _computedStyle[declaration.property].specificity = sp;
        }
      }
    }
  }
}

function compare(sp1, sp2) {
  if (sp1[0] - sp2[0]) {
    return sp1[0] - sp2[0];
  } else if (sp1[1] - sp2[1]) {
    return sp1[1] - sp2[1];
  } else if (sp1[2] - sp2[2]) {
    return sp1[2] - sp2[2];
  }
  return sp1[3] - sp2[3];
}

function match(element, selector) {
  if (!selector || !element.attributes) return false;

  // 拆分复合选择器
  const _selectors = selector.match(
    /(^[a-zA-Z]+(?![a-zA-Z]))|(\.[a-zA-Z]+(?![a-zA-Z]))|(#[a-zA-Z]+$)/g
  );
  if (!_selectors) return false;

  // 确保每个选择器都匹配
  return _selectors.every((_selector) => {
    if (_selector.charAt(0) === "#") {
      const attr = element.attributes.filter((a) => a.name === "id")[0];
      return !!attr && attr.value === _selector.replace("#", "");
    } else if (_selector.charAt(0) === ".") {
      const attr = element.attributes.filter((a) => a.name === "class")[0];
      return (
        !!attr && attr.value.split(" ").includes(_selector.replace(".", ""))
      );
    } else {
      return element.tagName === _selector;
    }
  });
}

function specificity(selector) {
  const tuple = [0, 0, 0, 0];
  const selectorParts = selector.split(" ");
  for (let part of selectorParts) {
    const _subParts = part.match(
      /(^[a-zA-Z]+(?![a-zA-Z]))|(\.[a-zA-Z]+(?![a-zA-Z]))|(#[a-zA-Z]+$)/g
    );
    if (!_subParts) continue;

    for (let _sp of _subParts) {
      if (_sp.charAt(0) === "#") {
        tuple[1] += 1;
      } else if (_sp.charAt(0) === ".") {
        tuple[2] += 1;
      } else {
        tuple[3] += 1;
      }
    }
  }
  return tuple;
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
