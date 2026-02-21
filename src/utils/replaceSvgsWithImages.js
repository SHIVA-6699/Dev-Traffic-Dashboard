/**
 * Replace all SVG elements inside a DOM node with img elements (PNG data URLs)
 * so html2canvas can capture charts. Uses canvg to render SVG to canvas.
 * @param {HTMLElement} root - Container that has SVG descendants (e.g. report view)
 * @returns {Promise<void>}
 */
export async function replaceSvgsWithImages(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const svgs = [...root.querySelectorAll('svg')];
  if (svgs.length === 0) return;

  const { Canvg } = await import('canvg');

  for (const svg of svgs) {
    try {
      const w = Math.max(1, svg.clientWidth || 300);
      const h = Math.max(1, svg.clientHeight || 150);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      let svgString = new XMLSerializer().serializeToString(svg);
      if (!/width\s*=/.test(svgString)) svgString = svgString.replace(/<svg/, `<svg width="${w}" height="${h}"`);
      const v = await Canvg.from(ctx, svgString);
      await v.render();

      const dataUrl = canvas.toDataURL('image/png');
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = '';
      img.setAttribute('width', String(w));
      img.setAttribute('height', String(h));
      img.style.width = `${w}px`;
      img.style.height = `${h}px`;
      img.style.display = 'block';
      img.style.verticalAlign = 'middle';

      const parent = svg.parentNode;
      if (parent) parent.replaceChild(img, svg);
    } catch (err) {
      console.warn('replaceSvgsWithImages: skip one SVG', err);
    }
  }
}
