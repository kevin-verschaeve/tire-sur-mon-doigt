const PROUT_COUNT = 14;

if (window.location.toString().startsWith('chrome-extension')) {
  // need to set the size for the extension, and 800px is the max allowed
  document.body.style.width = '800px';
}

interact('#doigt')
  .draggable({
    inertia: true,
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true
      })
    ],
    autoScroll: true,

    listeners: {
      move: dragMoveListener,
      end (event) {
        event.target.style.transform = 'translateX(0)';
        event.target.setAttribute('data-x', 0);
        document.body.classList.remove('release');
        document.getElementById('mobile-hint').style.display = 'none';

        const fart  = new Audio(`farts/fart${Math.floor(Math.random() * PROUT_COUNT + 1)}.mp3`);
        fart.play();

        document.dispatchEvent(new Event('release'));
      }
    }
  })

function dragMoveListener (event) {
  const target = event.target
  const prevX = (parseFloat(target.getAttribute('data-x')) || 0);

  if (prevX >= 200) {
    document.body.classList.add('release');
    return;
  }

  const x = prevX + event.dx
  target.style.transform = 'translateX(' + x + 'px)'
  target.setAttribute('data-x', x)
}

window.dragMoveListener = dragMoveListener
