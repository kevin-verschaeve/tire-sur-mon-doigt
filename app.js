const step = 10;

let fart;
let offset = -200;
let previousCursorX = 0;
let cursorX;

document.getElementById('doigt').addEventListener('dragstart', function(event) {
    cursorX = event.clientX;
}, false);

document.getElementById('doigt').addEventListener('drag', function(event) {
    previousCursorX = cursorX;
    cursorX = event.clientX;

    let newOffset;
    if (cursorX > previousCursorX) {
        newOffset = offset + step;
    } else {
        newOffset = offset - step;
    }

    event.target.style.marginLeft = newOffset;
    offset = newOffset;

    if (offset >= 0) {
        fart  = new Audio(`farts/fart${Math.floor(Math.random() * 9 + 1)}.mp3`);
        fart.play();
        event.target.style.marginLeft = -200;
        offset = -200;
        event.preventDefault();
        return false;
    }
}, false);

document.getElementById('doigt').addEventListener('dragend', function(event) {
    event.target.style.marginLeft = -200;
    offset = -200;
}, false);
