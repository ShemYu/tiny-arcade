/* Original pixel art, constructed from geometry at runtime. No image files. */
(function(root){
  'use strict';
  const INK='#252a3e', cache=new Map();
  function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function painter(ctx){
    const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    function line(x0,y0,x1,y1,c,width=1){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;for(let i=0;i<10000;i++){r(x0,y0,width,width,c);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}}
    function poly(points,c,stroke){let lo=Math.floor(Math.min(...points.map(p=>p[1]))),hi=Math.ceil(Math.max(...points.map(p=>p[1])));for(let y=lo;y<=hi;y++){const xs=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)r(Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,c);}if(stroke)for(let i=0;i<points.length;i++)line(...points[i],...points[(i+1)%points.length],stroke);}
    function ellipse(x,y,rx,ry,c){for(let j=-Math.floor(ry);j<=ry;j++){const k=Math.floor(rx*Math.sqrt(Math.max(0,1-j*j/(ry*ry))));r(x-k,y+j,k*2+1,1,c);}}
    return{r,line,poly,ellipse};
  }
  function sprite(kind,rank=1,face=2,pose=0,frame=0){
    const key=[kind,rank,face,pose,frame%4].join('/');if(cache.has(key))return cache.get(key);
    const c=surface(72,84),ctx=c.getContext('2d');let {r,line,poly,ellipse}=painter(ctx);
    const hero=['blade','ranger','mage','guard'].includes(kind),back=face>=5,side=face===0||face===4;
    const flip=face>=3&&face<=5;if(flip){ctx.translate(72,0);ctx.scale(-1,1);}
    ctx.translate(4,0);
    const walk=pose===1?[-1,1,1,-1][frame%4]:0,bob=pose===1?(frame%2):pose===0?(frame%4===3?1:0):pose===3?2:0;
    ctx.translate(0,bob);
    if(hero){
      const accent={blade:'#c96c67',ranger:'#75a585',mage:'#8d83bd',guard:'#c9a86b'}[kind];
      const light={blade:'#f4b99b',ranger:'#bcda9b',mage:'#d9b9e4',guard:'#f2da96'}[kind];
      const cape={blade:'#883e51',ranger:'#365f58',mage:'#514466',guard:'#354c69'}[kind];
      // Cape, quiver and legs sit behind the torso; every pose has the same foot anchor.
      poly([[24,43],[39,43],[43+walk,63],[32,60],[21-walk,64]],INK);
      poly([[25,43],[38,43],[41+walk,61],[32,58],[23-walk,62]],cape);
      line(26,48,24-walk,59,accent);if(rank>1)line(25,60,39,60,'#dfc985');
      if(kind==='ranger'){poly([[38,39],[43,38],[44,57],[39,58]],'#614755',INK);for(let n=0;n<3;n++){line(39+n*2,44,41+n*2,28,'#d4c3a0');poly([[39+n*2,29],[43+n*2,26],[43+n*2,31]],'#b9d3c5');}}
      r(25,57+walk,6,11,INK);r(34,57-walk,6,11,INK);r(26,58+walk,4,7,'#65627a');r(35,58-walk,4,7,'#65627a');
      r(24,65+walk,8,4,INK);r(33,65-walk,8,4,INK);r(25,65+walk,6,2,'#826d6d');r(34,65-walk,6,2,'#826d6d');
      const torso=kind==='mage'?'#726494':kind==='ranger'?'#929679':'#849eab';
      poly([[25,43],[38,43],[41,54],[38,60],[25,60],[22,53]],torso,INK);
      poly([[26,44],[36,44],[36,54],[28,56],[25,51]],kind==='ranger'?'#c8c69a':kind==='mage'?'#ae93bd':'#c6d9d7');
      r(25,56,14,3,'#434457');r(31,56,4,3,rank>1?'#ffe0a0':'#c3a67d');r(32,57,2,1,INK);
      if(kind==='mage'){
        poly([[25,46],[38,46],[44,66],[35,68],[23,66]],'#726494',INK);
        poly([[29,45],[33,47],[31,63],[25,65]],'#c9b9cc');poly([[34,48],[37,48],[41,64],[36,65]],'#9180b2');
        line(25,64,41,64,'#dfbd8f');r(30,52,3,3,'#f4d49d');r(30,58,3,2,'#f4d49d');
      }
      const arm=pose===2?-5:walk;
      poly([[22,45],[26,45],[26,55+walk],[23,57+walk],[20,53]],torso,INK);
      r(22,54+walk,4,4,'#dbac92');r(23,54+walk,3,2,'#ffe1b2');
      poly([[38,44],[42,45+arm],[45,53+arm],[41,56+arm],[37,51]],torso,INK);
      r(41,52+arm,4,4,'#dbac92');r(42,52+arm,3,2,'#ffe1b2');
      if(kind==='blade'||kind==='guard'){
        poly([[22,44],[27,43],[29,48],[25,50],[20,48]],kind==='guard'?'#c9a86b':'#9db4bd',INK);
        line(22,45,26,44,kind==='guard'?'#f1d48d':'#e2ece2');
        poly([[37,43],[42,44],[45,48],[39,49]],kind==='guard'?'#c9a86b':'#9db4bd',INK);
        line(38,44,42,45,kind==='guard'?'#f1d48d':'#e2ece2');
        if(rank>1){r(21,45,2,3,'#edce88');r(41,45,2,3,'#edce88');line(28,48,35,48,'#ead29b');}
      }
      // Face: warm skin, readable eyes, asymmetric fringe, single-pixel expression.
      if(kind==='ranger')poly([[23,39],[22,31],[29,23],[39,25],[43,33],[41,43]],'#476e5c',INK);
      poly([[26,31],[37,30],[41,35],[39,41],[35,45],[28,43],[24,38]],'#c6897d',INK);
      poly([[27,32],[36,32],[39,35],[38,40],[34,43],[28,41],[26,37]],'#f3c7a5');
      r(28,34,8,4,'#ffdfb3');r(26,37,2,3,'#ebaa90');
      if(!back){
        r(side?33:28,37,3,3,'#534459');r(side?33:28,37,2,1,'#f9f1d7');r(side?34:29,38,1,2,'#314052');
        if(!side){r(35,37,3,3,'#534459');r(35,37,2,1,'#f9f1d7');r(36,38,1,2,'#314052');}
        r(32+(side?3:0),42,2,1,'#b47c80');r(27,40,2,1,'#df9790');
      }
      const hair=kind==='blade'?'#b6bcc5':kind==='ranger'?'#ba8261':kind==='mage'?'#e5c78e':'#767b8e';
      const hairDark=kind==='blade'?'#6b7b91':kind==='ranger'?'#79545c':kind==='mage'?'#ad836b':'#4a5067';
      poly([[23,36],[23,30],[27,25],[31,27],[36,25],[41,29],[42,35],[39,40],[37,33],[34,36],[32,32],[29,36],[27,33],[25,39]],hairDark,INK);
      poly([[24,31],[28,27],[31,29],[36,27],[40,30],[40,33],[37,32],[35,34],[32,30],[28,33]],hair);
      line(27,28,30,29,kind==='blade'?'#e9e7dc':'#f4d79e');
      if(back){poly([[24,31],[40,31],[41,37],[37,42],[27,41],[24,37]],hairDark);poly([[25,31],[39,31],[39,36],[34,39],[27,37]],hair);}
      if(kind==='blade'){
        r(26,43,13,3,'#b34e5a');r(27,43,11,1,'#ee9783');poly([[26,44],[29,46],[23,54],[20-walk,54],[23,48]],'#c35f65',INK);line(25,47,22,52,'#ee9783');
        if(pose===2){poly([[42,48],[54,28],[58,25],[58,32],[46,51]],'#cddedb',INK);line(45,47,56,29,'#fcf4dc');line(42,46,48,51,'#d5b477',2);line(43,51,40,55,'#6c4c59',2);}
        else{poly([[44,51],[44,29],[46,25],[48,29],[48,51]],'#a8bec9',INK);line(45,30,45,48,'#f6efda');line(41,50,50,50,'#dac68c',2);r(45,52,2,6,'#6c4c59');}
        if(rank===3){poly([[23,29],[21,23],[27,27]],'#e7d69b',INK);poly([[39,29],[43,23],[40,33]],'#e7d69b',INK);}
      }
      if(kind==='ranger'){
        poly([[24,32],[25,27],[31,22],[37,26],[40,32],[34,29]],'#5e896d',INK);line(27,27,31,24,'#b4c48b');
        line(44,34+arm,49,40+arm,'#e4c18c',2);line(49,40+arm,51,47+arm,'#a77860',2);line(51,47+arm,46,57+arm,'#d9b584',2);
        line(44,34+arm,46,57+arm,'#f4e6bf');r(46,45+arm,3,4,'#775562');
        if(pose===2){line(34,43,57,43,'#dccdac');poly([[55,40],[61,43],[55,46]],'#b6d7ce');}
        if(rank>1){line(28,30,35,28,'#e8cf8a');poly([[36,26],[40,17],[40,24]],'#c5e0aa');}
      }
      if(kind==='mage'){
        poly([[19,33],[25,28],[27,16],[34,12],[41,19],[34,19],[39,28],[45,32],[44,35],[28,36]],'#524767',INK);
        poly([[27,27],[28,17],[34,14],[38,17],[32,18],[35,27]],'#9387bb');
        poly([[22,32],[27,29],[38,29],[42,32],[30,34]],'#bc9bba');line(26,29,39,29,'#e4bf87',2);r(33,29,2,2,'#b6ebe0');
        line(46,30+arm,44,66,'#674956',3);line(46,31+arm,45,64,'#d6ab7f');
        poly([[44,30+arm],[41,23+arm],[45,18+arm],[50,23+arm],[49,30+arm]],'#886786',INK);
        poly([[46,19+arm],[49,23+arm],[46,29+arm],[43,23+arm]],'#90ded2');line(45,21+arm,44,23+arm,'#eef4cf');
        if(pose===2){ellipse(20,45,4,4,'#e4b290');r(19,41,2,2,'#ffedbc');}
        if(rank>1){r(25,31,2,2,'#f1dbab');r(39,31,2,2,'#f1dbab');}
      }
      if(kind==='guard'){
        poly([[23,35],[23,30],[28,25],[37,25],[41,30],[41,35],[38,34],[37,31],[28,31],[27,35]],'#8d939f',INK);
        poly([[25,30],[29,27],[36,27],[39,30],[33,29]],'#d5d8c9');r(30,27,3,6,'#e3c488');
        poly([[31,26],[30,21],[35,20],[39,23],[34,22],[34,27]],rank===3?'#f2cc92':'#7a9daf',INK);
        if(!back){r(25,35,2,5,'#a3adb1');r(38,35,2,5,'#a3adb1');}
        const sh=pose===2?-3:0;
        poly([[39,43+sh],[49,40+sh],[55,45+sh],[53,60+sh],[46,68+sh],[38,59+sh]],'#58677e',INK);
        poly([[41,45+sh],[49,43+sh],[52,46+sh],[50,59+sh],[46,64+sh],[41,57+sh]],'#bca16c');
        poly([[43,46+sh],[48,45+sh],[50,48+sh],[48,59+sh],[46,61+sh],[43,56+sh]],'#657f8e');
        line(46,46+sh,46,60+sh,'#eddda8',2);line(43,51+sh,49,51+sh,'#eddda8',2);r(46,51+sh,2,2,'#e6f2db');
        line(19,49,19,63,'#806475',3);poly([[15,45],[20,42],[23,45],[22,50],[16,50]],'#aebfc1',INK);
      }
      if(rank===3){r(27,49,2,3,'#fbda99');r(35,49,2,3,'#fbda99');}
    }else if(kind==='slime'){
      const squash=pose===2?2:frame%2;ellipse(32,62,15+squash,9-squash,INK);ellipse(32,60,13+squash,10-squash,'#57898c');
      poly([[19,59],[21,52],[27,49],[30,45],[35,49],[41,51],[45,60],[41,65],[24,65]],'#93cbb4');
      ellipse(32,57,11,7,'#bce0ba');ellipse(27,52,4,2,'#e7ecc5');r(26,57,2,4,INK);r(36,57,2,4,INK);r(30,62,4,1,'#588687');r(22,61,3,1,'#de9a99');r(39,61,3,1,'#de9a99');
    }else if(kind==='goblin'){
      r(25,58+walk,5,10,INK);r(35,58-walk,5,10,INK);r(24,65+walk,7,3,'#765966');r(34,65-walk,8,3,'#765966');
      poly([[25,42],[38,42],[42,58],[24,60],[21,52]],'#77506a',INK);r(25,48,13,8,'#a6777e');r(24,57,15,2,'#c5a170');
      poly([[24,37],[15,29],[16,36],[25,43],[39,40],[48,30],[48,38],[39,45]],'#9bac7d',INK);
      poly([[24,30],[39,30],[43,36],[41,45],[34,50],[24,44],[21,37]],'#849878',INK);
      poly([[24,33],[37,32],[41,37],[37,44],[28,43],[24,39]],'#b1c38e');
      r(25,36,4,3,'#44374e');r(35,36,4,3,'#44374e');r(26,37,2,1,'#e7d29e');r(36,37,2,1,'#e7d29e');r(30,41,5,3,'#697b6b');r(28,46,2,3,'#ede3b7');r(36,45,2,3,'#ede3b7');
      poly([[22,32],[25,26],[36,24],[42,31],[38,32],[32,28]],'#796477',INK);r(30,27,6,2,'#b49287');
      const a=pose===2?-9:0;line(44,46+a,49,60+a,'#926956',4);ellipse(43,43+a,6,7,INK);ellipse(43,42+a,5,6,'#b59b7c');r(40,39+a,3,3,'#dfc29a');
    }else if(kind==='wisp'){
      const b=frame%2;poly([[24,67],[26,57],[19,54],[24,49],[22,38],[29,31],[32,23],[36,33],[42,37],[43,49],[48,55],[40,56],[41,65],[34,61],[31,69]],'#635c99',INK);
      poly([[25,52],[26,38],[32,32],[35,28],[35,37],[40,42],[38,52],[35,57],[30,63+b],[30,55]],'#9b9eda');
      poly([[29,49],[28,40],[32,36],[36,41],[36,50],[32,55]],'#d5d9e3');r(27,45,3,3,'#313957');r(35,45,3,3,'#313957');r(28,46,1,1,'#f7e3bc');r(36,46,1,1,'#f7e3bc');
    }else{
      const boss=kind==='boss',off=boss?0:4;ctx.translate(0,off);
      r(20,56+walk,10,12,INK);r(35,56-walk,10,12,INK);r(21,59+walk,8,8,'#646d7e');r(36,59-walk,8,8,'#79858e');
      poly([[21,34],[40,34],[48,46],[42,60],[20,60],[15,46]],'#586776',INK);
      poly([[21,36],[38,35],[42,44],[37,53],[23,50],[19,43]],'#9ba4a2');
      poly([[25,48],[32,45],[38,49],[35,57],[27,57]],'#475d71',INK);poly([[31,46],[36,50],[32,56],[28,50]],boss?'#e6b5f0':'#99ded1');
      poly([[14,36],[21,36],[23,44],[18,56],[12,56],[9,47]],'#89918e',INK);poly([[42,35],[51,38],[55,51],[50,58],[42,54],[39,43]],'#727f8b',INK);
      line(12,41,18,38,'#bdc0a9');line(44,38,49,40,'#b9bbaa');r(10,52,9,9,'#5b697b');r(45,54,10,9,'#566777');
      poly([[22,23],[29,18],[39,21],[43,29],[39,38],[24,37],[20,30]],'#83939b',INK);
      poly([[24,25],[29,21],[37,23],[38,29],[32,33],[24,31]],'#b6bbae');r(24,29,5,2,boss?'#f0b5d7':'#80d1c8');r(34,29,5,2,boss?'#f0b5d7':'#80d1c8');line(29,34,35,34,'#4a586a');
      line(26,38,29,43,'#577d83');line(38,38,35,44,'#577d83');r(14,38,4,2,'#759b81');r(35,22,3,2,'#90a487');
      if(boss){poly([[23,25],[16,20],[15,12],[19,15],[22,22],[27,22]],'#b099af',INK);poly([[38,23],[45,16],[48,13],[47,22],[41,28]],'#b099af',INK);poly([[29,21],[32,13],[36,20]],'#d8c0c2',INK);line(31,37,31,43,'#d4a6df');}
    }
    cache.set(key,c);return c;
  }
  function portrait(canvas,kind,rank=1){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;const s=sprite(kind,rank,2,0,0);const scale=Math.min(canvas.width/50,canvas.height/64);ctx.drawImage(s,10,10,52,64,(canvas.width-52*scale)/2,(canvas.height-64*scale)/2,52*scale,64*scale);}
  root.CVArt={surface,painter,sprite,portrait};
})(globalThis);
