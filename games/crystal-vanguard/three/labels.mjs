/** Reused DOM labels remain crisp at every device scale; never intercept input. */
export class WorldLabels {
  constructor(canvas) {
    this.root=document.createElement('div');this.root.className='world-labels';this.root.setAttribute('aria-hidden','true');
    canvas.insertAdjacentElement('afterend',this.root);this.items=new Map();
  }
  begin(){for(const item of this.items.values())item.used=false;}
  put(key,text,x,y,{color='#3a5748',className='',opacity=1,size=11}={}) {
    let item=this.items.get(key);
    if(!item){const el=document.createElement('span');this.root.append(el);item={el,used:true};this.items.set(key,item);}
    const el=item.el;item.used=true;
    if(el.textContent!==String(text))el.textContent=String(text);
    el.className=className;el.style.color=color;el.style.opacity=String(opacity);el.style.fontSize=`${size}px`;
    el.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;
  }
  end(){for(const [key,item]of this.items)if(!item.used){item.el.remove();this.items.delete(key);}}
  dispose(){this.root.remove();this.items.clear();}
}
