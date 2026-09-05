/** Renderer selection happens before any input is bound to the canvas. */
export async function createRenderer(canvas) {
  const forceCanvas=new URLSearchParams(location.search).get('renderer')==='canvas';
  let renderer;
  if(!forceCanvas) {
    try {
      const context=canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'default'});
      if(context) {
        const {Renderer}=await import('./guard-render.mjs');
        renderer=new Renderer(canvas,context);
      }
    } catch(error) {console.warn('3D display unavailable; using compatible display.',error);}
  }
  if(renderer)return renderer;
  // A canvas which acquired a GPU context cannot acquire a 2D context.
  const replacement=canvas.cloneNode(true);canvas.replaceWith(replacement);
  const {Renderer}=await import('./guard-render-canvas.mjs');
  renderer=new Renderer(replacement);renderer.backend='canvas';
  renderer.resetCamera=(mobile=false)=>{renderer.pan={x:0,y:0};renderer.zoom=mobile&&replacement.getBoundingClientRect().width<600?1.65:1;};
  renderer.diagnostics=()=>({backend:'canvas',contextLost:false});
  return renderer;
}
