/* Crystal Vanguard V2 — original content; no external art or runtime packages. */
(function(root){
  'use strict';
  const heroes = {
    blade: { name:['Frontier Blade','拓荒劍士'], role:['Cleave / mobile','近戰・橫掃'], cost:12, hp:140, damage:23, range:1.05, interval:.95, speed:1.55, leash:3.2, armor:1, color:'#65beb3', skill:['Every third strike cleaves nearby foes.','每第三次攻擊橫掃周圍敵人。'] },
    ranger: { name:['Wind Ranger','逐風遊俠'], role:['Ranged / rapid','遠程・連射'], cost:14, hp:90, damage:19, range:3.4, interval:.85, speed:1.25, leash:.5, armor:0, color:'#a9bf6c', skill:['Every third shot fires a second arrow.','每第三次射擊追加一支箭矢。'] },
    mage: { name:['Ember Mage','星火法師'], role:['Magic / area','魔法・範圍'], cost:16, hp:80, damage:34, range:3.0, interval:1.7, speed:1.1, leash:.4, armor:0, color:'#bb9ddd', skill:['Fire blossoms damage a small area.','星火綻放，對小範圍敵人造成傷害。'] },
    guard: { name:['Dawn Guardian','晨曦盾衛'], role:['Shield / protect','前衛・守護'], cost:12, hp:230, damage:15, range:1.12, interval:1.15, speed:1.0, leash:2.1, armor:6, color:'#e6bc73', skill:['Nearby allies take 25% less damage.','附近隊友受到的傷害減少 25%。'] }
  };
  const monsters={
    sprout:{name:['Dew Sprout','露芽'],hp:45,damage:7,speed:.6,interval:1.3,range:.65,reward:1,core:5},
    imp:{name:['Bramble Imp','荊棘小鬼'],hp:74,damage:11,speed:.74,interval:1.1,range:.7,reward:2,core:7},
    wolf:{name:['Dusk Wolf','暮色狼'],hp:65,damage:10,speed:1.05,interval:.9,range:.8,reward:2,core:7},
    golem:{name:['Ruined Sentinel','遺跡石衛'],hp:200,damage:21,speed:.4,interval:1.7,range:.9,reward:4,core:12},
    elder:{name:['The Hollow King','空寂之王'],hp:1350,damage:28,speed:.29,interval:1.8,range:1.2,reward:18,core:35}
  };
  // Compass labels follow board coordinates; all eight approaches are used.
  const directions=[{x:0,y:-1,label:'N'},{x:1,y:-1,label:'NE'},{x:1,y:0,label:'E'},{x:1,y:1,label:'SE'},{x:0,y:1,label:'S'},{x:-1,y:1,label:'SW'},{x:-1,y:0,label:'W'},{x:-1,y:-1,label:'NW'}];
  const waves=[
    {name:['A rustle in the grass','草叢裡的動靜'],lanes:[0,2],count:10,gap:1.2,mix:['sprout','sprout','imp'],scale:1},
    {name:['Visitors from the west','西風帶來的訪客'],lanes:[4,6],count:13,gap:1.05,mix:['sprout','imp','sprout'],scale:1.04},
    {name:['Teeth in the twilight','暮色中的獠牙'],lanes:[1,5],count:16,gap:.92,mix:['wolf','sprout','imp'],scale:1.1},
    {name:['Stone remembers','石頭的記憶'],lanes:[0,3,6],count:18,gap:.95,mix:['golem','imp','sprout','wolf'],scale:1.12},
    {name:['A circle of thorns','荊棘包圍'],lanes:[1,3,5,7],count:22,gap:.8,mix:['imp','wolf','sprout','golem'],scale:1.18},
    {name:['The long watch','漫長的守望'],lanes:[0,2,4,6],count:25,gap:.74,mix:['wolf','golem','imp','sprout'],scale:1.25},
    {name:['Before the dawn','黎明之前'],lanes:[0,1,2,3,4,5,6,7],count:29,gap:.66,mix:['imp','golem','wolf','sprout'],scale:1.3},
    {name:['Keep the light alive','讓光繼續亮著'],lanes:[0,1,2,3,4,5,6,7],count:29,gap:.72,mix:['golem','wolf','imp','sprout'],scale:1.32,boss:true}
  ];
  function freeze(o){Object.values(o).forEach(v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);});return Object.freeze(o);}
  const content=freeze({heroes,monsters,directions,waves,maxRoster:12,maxRank:3,coreHP:100,repairCost:12,repairAmount:25});
  if(typeof module!=='undefined'&&module.exports)module.exports=content;else root.CVContent=content;
})(globalThis);
