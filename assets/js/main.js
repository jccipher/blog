(() => {
  const command = document.querySelector('[data-type-command]');
  if (!command || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const text = command.textContent;
  command.textContent = '';
  let index = 0;
  const type = () => {
    command.textContent = text.slice(0, index += 1);
    if (index < text.length) window.setTimeout(type, 62);
  };
  window.setTimeout(type, 600);
})();
