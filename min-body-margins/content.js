// Enforce minimum 0.5-inch left and right margins on the body.
// 1 CSS inch = 96px, so 0.5in = 48px.

const MIN_MARGIN_PX = 48;

function enforceMinMargins() {
  const body = document.body;
  if (!body) return;

  const style = window.getComputedStyle(body);
  const marginLeft = parseFloat(style.marginLeft) + parseFloat(style.paddingLeft);
  const marginRight = parseFloat(style.marginRight) + parseFloat(style.paddingRight);

  if (marginLeft < MIN_MARGIN_PX) {
    body.style.marginLeft = MIN_MARGIN_PX + 'px';
    body.style.paddingLeft = '0px';
  }

  if (marginRight < MIN_MARGIN_PX) {
    body.style.marginRight = MIN_MARGIN_PX + 'px';
    body.style.paddingRight = '0px';
  }
}

enforceMinMargins();
