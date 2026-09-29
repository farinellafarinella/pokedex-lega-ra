// Pokémon Rosso uses a 256x224 Super Game Boy frame around a 160x144 game.
// Show the central game at its native proportions without altering emulation.
const root = document.getElementById('root');
function fitGameScreen() {
  const canvas = root.querySelector('#canvas');
  const wrapper = canvas?.closest('.canvas-wrapper');
  if (!wrapper) return;
  const bordered = canvas.width === 256 && canvas.height === 224;
  const gameBoy = bordered || (canvas.width === 160 && canvas.height === 144);
  wrapper.classList.toggle('gameboy-screen', gameBoy);
  wrapper.classList.toggle('sgb-cropped', bordered);
}
new MutationObserver(fitGameScreen).observe(root, {
  childList: true, subtree: true, attributes: true, attributeFilter: ['width', 'height']
});
fitGameScreen();
