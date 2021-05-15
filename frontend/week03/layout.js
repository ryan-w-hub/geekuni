function getStyle(element) {
  if (!element.style) {
    element.style = {};
  }

  for (let prop in element.computedStyle) {
    element.style[prop] = element.computedStyle[prop].value;

    if (element.style[prop].toString().match(/(px$)|(^[0-9\.]+$)/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }
  }

  return element.style;
}

function layout(element) {
  if (!element.computedStyle) {
    return;
  }

  const style = getStyle(element);

  if (style.display !== "flex") {
    return;
  }

  const items = element.children.filter((e) => e.type === "element");

  items.sort((a, b) => (a.order || 0) - (b.order || 0));

  ["width", "height"].forEach((size) => {
    if (style[size] === "auto" || style[size] === "") {
      style[size] = null;
    }
  });

  // 初始值
  if (!style.flexDirection || style.flexDirection === "auto")
    style.flexDirection = "row";
  if (!style.alignItems || style.alignItems === "auto")
    style.alignItems = "stretch";
  if (!style.justifyContent || style.justifyContent === "auto")
    style.justifyContent = "flex-start";
  if (!style.flexWrap || style.flexWrap === "auto") style.flexWrap = "nowrap";
  if (!style.alignContent || style.alignContent === "auto")
    style.alignContent = "stretch";

  // 主轴/交叉轴变量
  let mainSize, mainStart, mainEnd, mainSign, mainBase;
  let crossSize, crossStart, crossEnd, crossSign, crossBase;

  if (style.flexDirection === "row") {
    mainSize = "width";
    mainStart = "left";
    mainEnd = "right";
    mainSign = +1;
    mainBase = 0;

    crossSize = "height";
    crossStart = "top";
    crossEnd = "bottom";
  }

  if (style.flexDirection === "row-reverse") {
    mainSize = "width";
    mainStart = "right";
    mainEnd = "left";
    mainSign = -1;
    mainBase = style.width;

    crossSize = "height";
    crossStart = "top";
    crossEnd = "bottom";
  }

  if (style.flexDirection === "column") {
    mainSize = "height";
    mainStart = "top";
    mainEnd = "bottom";
    mainSign = +1;
    mainBase = 0;

    crossSize = "width";
    crossStart = "left";
    crossEnd = "right";
  }

  if (style.flexDirection === "column-reverse") {
    mainSize = "height";
    mainStart = "bottom";
    mainEnd = "top";
    mainSign = -1;
    mainBase = style.height;

    crossSize = "width";
    crossStart = "left";
    crossEnd = "right";
  }

  if (style.flexWrap === "wrap-reverse") {
    let tmp = crossStart;
    crossStart = crossEnd;
    crossEnd = tmp;
    crossSign = -1;
  } else {
    crossBase = 0;
    crossSign = +1;
  }

  let isAutoMainSize = false;
  if (!style[mainSize]) {
    style[mainSize] = 0;
    items.forEach((item) => {
      const itemStyle = getStyle(item);
      if (itemStyle[mainSize] !== null || itemStyle[mainSize] !== void 0) {
        style[mainSize] = style[mainSize] + itemStyle[mainSize];
      }
    });
    isAutoMainSize = true;
  }

  let flexLine = [];
  const flexLines = [flexLine];

  // 主轴剩余空间
  let mainSpace = style[mainSize];
  let crossSpace = 0;

  // 收集元素进行
  items.forEach((item) => {
    const itemStyle = getStyle(item);

    if (itemStyle[mainSize] === null) {
      itemStyle[mainSize] = 0;
    }

    if (itemStyle.flex) {
      flexLine.push(item);
    } else if (style.flexWrap === "nowrap" && isAutoMainSize) {
      mainSpace -= itemStyle[mainSize];
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }

      flexLine.push(item);
    } else {
      if (itemStyle[mainSize] > style[mainSize]) {
        itemStyle[mainSize] = style[mainSize];
      }

      if (mainSpace < itemStyle[mainSize]) {
        flexLine.mainSpace = mainSpace;
        flexLine.crossSpace = crossSpace;

        flexLine = [item];
        flexLines.push(flexLine);

        mainSpace = style[mainSpace];
        crossSpace = 0;
      } else {
        flexLine.push(item);
      }

      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }

      mainSpace -= itemStyle[mainSize];
    }
  });

  flexLine.mainSpace = mainSpace;

  if (style.flexWrap === "nowrap" || isAutoMainSize) {
    flexLine.crossSpace =
      style[crossSize] !== undefined ? style[crossSize] : crossSpace;
  } else {
    flexLine.crossSpace = crossSpace;
  }

  // 主轴尺寸计算
  if (mainSpace < 0) {
    // 单行 需要压缩元素
    const scale = style[mainSize] / (style[mainSize] - mainSpace);
    let currentMain = mainBase;
    // 计算每个元素的起始/结束位置，忽略flex元素
    items.forEach((item) => {
      const itemStyle = getStyle(item);

      if (itemStyle.flex) {
        itemStyle[mainSize] = 0;
      }

      itemStyle[mainSize] = itemStyle[mainSize] * scale;

      itemStyle[mainStart] = currentMain;
      itemStyle[mainEnd] =
        itemStyle[mainStart] + mainSign * itemStyle[mainSize];

      currentMain = itemStyle[mainEnd];
    });
  } else {
    // 多行处理
    flexLines.forEach((items) => {
      const mainSpace = items.mainSpace;
      let flexTotal = 0;

      // 收集所有flex值
      items.forEach((item) => {
        const itemStyle = getStyle(item);

        if (itemStyle.flex !== null && itemStyle.flex !== void 0) {
          flexTotal += itemStyle.flex;
          return;
        }
      });

      // 有flex元素，遇到flex后根据比例计算主轴尺寸再排列
      if (flexTotal > 0) {
        let currentMain = mainBase;
        items.forEach((item) => {
          const itemStyle = getStyle(item);

          if (itemStyle.flex) {
            itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex;
          }
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] =
            itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd];
        });
      } else {
        let currentMain = mainBase; // 当前元素开始
        let step = 0; // 元素间隔
        switch (style.justifyContent) {
          case "flex-start":
            currentMain = mainBase;
            step = 0;
            break;
          case "flex-end":
            currentMain = mainSpace * mainSign + mainBase;
            step = 0;
            break;
          case "center":
            currentMain = (mainSpace / 2) * mainSign + mainBase;
            step = 0;
            break;
          case "space-between":
            currentMain = mainBase;
            step = (mainSpace / (items.length - 1)) * mainSign;
            break;
          case "space-around":
            step = (mainSpace / items.length) * mainSign;
            currentMain = step / 2 + mainBase;
            break;
        }

        items.forEach((item) => {
          const itemStyle = getStyle(item);
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] =
            itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd] + step;
        });
      }
    });
  }

  // 交叉轴尺寸计算
  if (!style[crossSize]) {
    // 父元素未设置交叉轴尺寸，自动撑满
    crossSpace = 0;
    style[crossSize] = 0;
    flexLines.forEach((items) => {
      style[crossSize] = style[crossSize] + items.crossSpace;
    });
  } else {
    crossSpace = style[crossSize];
    flexLines.forEach((items) => {
      crossSpace -= items.crossSpace;
    });
  }

  if (style.flexWrap === "wrap-reverse") {
    crossBase = style[crossSize];
  } else {
    crossBase = 0;
  }

  const lineSize = style[crossSize] / flexLines.length;
  let step;

  switch (style.alignContent) {
    case "flex-start":
      crossBase += 0;
      step = 0;
      break;

    case "flex-end":
      crossBase += crossSign * crossSpace;
      step = 0;
      break;

    case "center":
      crossBase += (crossSign * crossSpace) / 2;
      step = 0;
      break;

    case "space-between":
      crossBase += 0;
      step = crossSpace / (flexLines.length - 1);
      break;

    case "space-around":
      step = crossSpace / flexLines.length;
      crossBase += (crossSign * step) / 2;
      break;

    case "stretch":
      crossBase += 0;
      step = 0;
      break;
  }

  flexLines.forEach((items) => {
    const lineCrossSize =
      style.alignContent === "stretch"
        ? items.crossSpace + crossSpace / flexLines.length
        : item.crossSpace;

    items.forEach((item) => {
      const itemStyle = getStyle(item);
      let align = itemStyle.alignSelf || style.alignItems;

      if (itemStyle[crossSize] === null) {
        itemStyle[crossSize] = align === "stretch" ? lineCrossSize : 0;
      }

      switch (align) {
        case "flex-start":
          itemStyle[crossStart] = crossBase;
          itemStyle[crossEnd] =
            itemStyle[crossStart] + crossSign * itemStyle[crossSize];
          break;
        case "flex-end":
          itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize;
          itemStyle[crossStart] =
            itemStyle[crossEnd] - crossSign * itemStyle[crossSize];
          break;
        case "center":
          itemStyle[crossStart] =
            crossBase +
            (crossSign * (lineCrossSize - itemStyle[crossSize])) / 2;
          itemStyle[crossEnd] =
            itemStyle[crossStart] + crossSign * itemStyle[crossSize];
          break;
        case "stretch":
          itemStyle[crossStart] = crossBase;
          itemStyle[crossEnd] =
            crossBase +
            crossSign *
              (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0
                ? itemStyle[crossSize]
                : lineCrossSize);
          itemStyle[crossSize] =
            crossSign * (itemStyle[crossEnd] - itemStyle[crossStart]);
          break;
      }
    });
    crossBase += crossSign * (lineCrossSize + step);
  });
}

module.exports = layout;
