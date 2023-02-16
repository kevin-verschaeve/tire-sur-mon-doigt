if (window.location.toString().startsWith('chrome-extension')) {
  // need to set the size for the extension, and 800px is the max allowed
  document.body.style.width = '800px';
}

document.addEventListener('click', function (e) {
  const backdrop = document.getElementById('mobile-backdrop');
  if ('none' === backdrop.style.display) {
    return;
  }

  backdrop.style.display = 'none';
});

interact('#doigt')
  .draggable({
    inertia: true,
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true
      })
    ],
    startAxis: 'x',
    lockAxis: 'x',
    autoScroll: false,

    listeners: {
      move: dragMoveListener,
      end (event) {
        event.target.style.transform = 'translateX(0)';
        event.target.setAttribute('data-x', 0);
        document.body.classList.remove('release');
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
