export default function confetti() {
  const colors = ['#6e4bff', '#4dd0ff', '#2bf2c0', '#ff5edb', '#ffd166', '#ff5e62']
  const container = document.body

  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div')
    const size = Math.random() * 8 + 4
    el.style.cssText = `
      position: fixed;
      left: ${Math.random() * 100}vw;
      top: -20px;
      width: ${size}px;
      height: ${size}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      pointer-events: none;
      z-index: 9999;
      opacity: 1;
    `
    container.appendChild(el)
    const angle = (Math.random() - 0.5) * 200
    const speed = Math.random() * 600 + 400
    el.animate([
      { transform: `translateY(0) translateX(0) rotate(0deg)`, opacity: 1 },
      { transform: `translateY(${speed}px) translateX(${angle}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], {
      duration: Math.random() * 1200 + 800,
      easing: 'cubic-bezier(0,0.9,0.6,1)',
      delay: Math.random() * 300,
    }).onfinish = () => el.remove()
  }
}
