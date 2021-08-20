const step = 10;

let fart;
let offset = -200;
let previousCursorX = 0;
let cursorX;

['dragstart', 'touchstart'].forEach(function (eventName) {
    document.getElementById('doigt').addEventListener(eventName, function(event) {
        cursorX = event.clientX || event.touches[0].clientX;
    }, false);
});

['dragover', 'touchmove'].forEach(function (eventName) {
    document.getElementById('doigt').addEventListener(eventName, function(event) {
        previousCursorX = cursorX;
        cursorX = event.clientX || event.touches[0].clientX;

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
        }
    }, false);
});

['dragend', 'touchend'].forEach(function (eventName) {
    document.getElementById('doigt').addEventListener(eventName, function(event) {
        event.target.style.marginLeft = -200;
        offset = -200;
    }, false);
});
