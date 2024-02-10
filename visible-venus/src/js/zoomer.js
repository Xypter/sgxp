const view = (() => {
    const matrix = [1, 0, 0, 1, 0, 0]; // current view transform
    var m = matrix;             // alias 
    var scale = 1;              // current scale
    const pos = { x: 0, y: 0}; // current position of origin
    var dirty = true;
    const API = {
      applyTo(el) {
        if (dirty) { this.update() }
        el.style.transform = `matrix(${m[0]},${m[1]},${m[2]},${m[3]},${m[4]},${m[5]})`;
      },
      update() {
        dirty = false;
        m[3] = m[0] = scale;
        m[2] = m[1] = 0;
        m[4] = pos.x;
        m[5] = pos.y;
      },
      pan(amount) {
        if (dirty) { this.update() }
         pos.x += amount.x;
         pos.y += amount.y;
         dirty = true;
      },
      scaleAt(at, amount) { // at in screen coords
        if (dirty) { this.update() }
        scale *= amount;
        pos.x = at.x - (at.x - pos.x) * amount;
        pos.y = at.y - (at.y - pos.y) * amount;
        dirty = true;
      },
    };
    return API;
  })();
  
  
  document.addEventListener("mousemove", mouseEvent, {passive: false});
  document.addEventListener("mousedown", mouseEvent, {passive: false});
  document.addEventListener("mouseup", mouseEvent, {passive: false});
  document.addEventListener("mouseout", mouseEvent, {passive: false});
  document.addEventListener("wheel", mouseWheelEvent, {passive: false});
  const mouse = {x: 0, y: 0, oldX: 0, oldY: 0, button: false};
  function mouseEvent(event) {
      if (event.type === "mousedown") { mouse.button = true }
      if (event.type === "mouseup" || event.type === "mouseout") { mouse.button = false }
      mouse.oldX = mouse.x;
      mouse.oldY = mouse.y;
      mouse.x = event.pageX;
      mouse.y = event.pageY;
      if(mouse.button) { // pan
          view.pan({x: mouse.x - mouse.oldX, y: mouse.y - mouse.oldY});
          view.applyTo(zoomMe);
      }
      event.preventDefault();
  }
  function mouseWheelEvent(event) {
      const x = event.pageX - (zoomMe.width / 2);
      const y = event.pageY - (zoomMe.height / 2);
      if (event.deltaY < 0) { 
          view.scaleAt({x, y}, 2);
          view.applyTo(zoomMe);
      } else { 
          view.scaleAt({x, y}, 1 / 2);
          view.applyTo(zoomMe);
      }
      event.preventDefault();
  }