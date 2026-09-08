(() => {
  for (const panel of document.querySelectorAll('[data-summary-audio]')) {
    const audio = panel.querySelector('audio');
    const rate = panel.querySelector('[data-audio-rate]');
    const error = panel.querySelector('[data-audio-error]');
    rate.addEventListener('change', () => { audio.playbackRate = Number(rate.value); });
    for (const button of panel.querySelectorAll('[data-audio-seek]')) {
      button.addEventListener('click', () => {
        if (!Number.isFinite(audio.duration)) return;
        audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + Number(button.dataset.audioSeek)));
      });
    }
    audio.addEventListener('play', () => {
      for (const other of document.querySelectorAll('[data-summary-audio] audio')) if (other !== audio) other.pause();
    });
    audio.addEventListener('error', () => { error.hidden = false; });
  }
})();
