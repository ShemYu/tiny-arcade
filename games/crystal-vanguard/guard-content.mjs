export const VERSION = 1;
export const W = 15, H = 11, CORE = {x:7,y:5};
export const ENTRANCES = [{x:0,y:5,name:['西門','West']},{x:7,y:0,name:['北門','North']},{x:14,y:5,name:['東門','East']}];
export const ROCKS = [[3,2],[4,2],[10,2],[11,2],[3,8],[4,8],[10,8],[11,8]];
export const HEROES = [
 {id:'knight',name:['亞瑟','Arthur'],job:['劍士','Knight'],sprite:0,color:'#cf7d6c',hp:250,atk:22,range:1.35,rate:0.95,speed:2.5,skill:['旋風斬','Whirlwind'],desc:['截擊前排 · 範圍斬擊','Frontline · cleaving strikes'],cooldown:18},
 {id:'ranger',name:['莉露','Lilu'],job:['弓手','Ranger'],sprite:2,color:'#80aa76',hp:125,atk:19,range:4.5,rate:0.8,speed:2.9,skill:['箭雨','Arrow rain'],desc:['遠程點殺 · 優先飛行怪','Ranged · hunts flying enemies'],cooldown:22},
 {id:'mage',name:['米菈','Mira'],job:['魔法師','Mage'],sprite:4,color:'#ad8ebc',hp:105,atk:29,range:3.8,rate:1.65,speed:2.5,skill:['暴風雪','Blizzard'],desc:['範圍魔法 · 穿透護甲','Area magic · ignores armor'],cooldown:25},
 {id:'priest',name:['諾菈','Nora'],job:['服事','Acolyte'],sprite:6,color:'#d4b678',hp:145,atk:12,range:3.5,rate:1.4,speed:2.5,skill:['聖域','Sanctuary'],desc:['治療隊友 · 維持防線','Heals allies · sustains the line'],cooldown:26}
];
export const BUILDINGS = {
 wall:{name:['木柵','Palisade'],cost:12,hp:260,sprite:12,solid:true,desc:['改變地面敵人的路線；留一條通路。','Reroutes ground enemies. Leave an open route.']},
 tower:{name:['箭塔','Arrow tower'],cost:42,hp:180,sprite:13,solid:true,atk:15,range:4.2,rate:1.05,desc:['自動射擊，也能攻擊飛行怪。','Fires automatically. Can hit flying enemies.']},
 frost:{name:['冰霜符文','Frost rune'],cost:26,hp:100,sprite:14,solid:false,desc:['範圍內地面敵人減速 48%。','Slows nearby ground enemies by 48%.']},
 repair:{name:['維修','Repair'],cost:10,desc:['點建築恢復 100 HP；點水晶恢復 35 HP。','Restore 100 building HP or 35 crystal HP.']},
 upgrade:{name:['升級','Upgrade'],cost:28,desc:['建築最高三級，強化傷害、耐久或範圍。','Improve damage, durability or area. Max level 3.']},
 sell:{name:['拆除','Dismantle'],cost:0,desc:['拆除建築，退回剩餘耐久比例的 60% 花費。','Refund 60% of investment, scaled by remaining HP.']}
};
export const ENEMIES = {
 jelly:{name:['果凍怪','Jelly'],sprite:8,hp:55,atk:7,speed:0.78,armor:0,gold:3},
 goblin:{name:['哥布林','Goblin'],sprite:9,hp:90,atk:11,speed:1.06,armor:2,gold:4},
 bat:{name:['夜翼蝠','Nightwing'],sprite:10,hp:52,atk:8,speed:1.42,armor:0,gold:4,flying:true},
 golem:{name:['石甲兵','Stoneguard'],sprite:11,hp:200,atk:16,speed:0.58,armor:11,gold:7},
 sapper:{name:['拆牆工兵','Sapper'],sprite:9,hp:110,atk:24,speed:0.87,armor:3,gold:6,siege:true},
 boss:{name:['苔石巨像','Moss Colossus'],sprite:11,hp:1050,atk:24,speed:0.42,armor:7,gold:30,boss:true}
};
// Deliberate changes of threat: crowds, air, armor, siege, then combinations.
export const WAVES = [
 {name:['森林的訪客','Forest visitors'],hint:['西門出現果凍怪。先在路旁蓋箭塔。','Jellies at the west gate. Build a tower beside the road.'],lanes:[0],groups:[['jelly',8]],reward:34},
 {name:['林間快腳','Quick feet'],hint:['北門與西門夾擊。移動劍士保護薄弱處。','North and west attack. Move Arthur to the weaker side.'],lanes:[0,1],groups:[['goblin',7],['jelly',5]],reward:38},
 {name:['越牆而來','Over the walls'],hint:['飛行怪無視圍牆。弓手與箭塔可以對空。','Bats ignore walls. Rangers and towers can hit them.'],lanes:[0,2],groups:[['bat',9],['jelly',5]],reward:42},
 {name:['第一隻守門者','The first guardian'],hint:['巨像有護甲。法師與冰霜符文能爭取時間。','The armored boss approaches. Magic and frost help.'],lanes:[0],groups:[['golem',3],['boss',1],['jelly',6]],reward:65,boss:true},
 {name:['拆掉你的堡壘','Breach crew'],hint:['工兵會追打建築。準備維修，別只堆牆。','Sappers attack buildings. Repair and cover them.'],lanes:[1,2],groups:[['sapper',5],['goblin',9]],reward:45},
 {name:['石與羽','Stone and feather'],hint:['石甲兵扛傷，蝙蝠突襲；分配物理與魔法火力。','Stoneguards tank while bats rush. Split your damage.'],lanes:[0,2],groups:[['golem',5],['bat',10]],reward:48},
 {name:['三面告急','Three gates'],hint:['三路同時進攻。保留技能救急。','All three gates attack. Keep a skill for emergencies.'],lanes:[0,1,2],groups:[['goblin',13],['sapper',4],['jelly',8]],reward:52},
 {name:['雙重試煉','Twin trial'],hint:['首領帶著飛行護衛。先處理漏網的蝙蝠。','A boss with air support. Pick off bats that slip through.'],lanes:[1,2],groups:[['boss',1],['bat',9],['golem',4]],reward:75,boss:true},
 {name:['漫長的黃昏','Long twilight'],hint:['密集小怪適合穿透、連鎖與範圍攻擊。','Dense packs reward piercing, chaining and area damage.'],lanes:[0,1,2],groups:[['jelly',20],['goblin',14]],reward:55},
 {name:['破城之槌','Siege hammer'],hint:['工兵與石甲兵聯手。維修與控場都很重要。','Sappers join stoneguards. Repair and crowd control matter.'],lanes:[0,2],groups:[['sapper',9],['golem',8]],reward:60},
 {name:['黎明前一刻','Before dawn'],hint:['最後的混合攻勢。裝備與站位決定能否守住。','One final mixed assault. Gear and positioning count.'],lanes:[0,1,2],groups:[['bat',14],['goblin',14],['sapper',5]],reward:65},
 {name:['森林之王','The forest king'],hint:['王在半血時狂暴並召喚援軍。留下你的大招。','The king enrages at half HP and summons help. Save your skills.'],lanes:[0,1,2],groups:[['golem',5],['boss',1],['sapper',5],['bat',6]],reward:100,boss:true}
];
const gear=(id,name,en,slot,who,tier,stats,effect,desc,edesc)=>({id,name:[name,en],slot,who,tier,stats,effect,desc:[desc,edesc]});
export const GEAR = [
 gear('fang','赤牙劍','Crimson Fang','weapon','knight',1,{atk:8},'lifesteal','攻擊吸血 18%，前排續戰。','Heal for 18% of damage dealt.'),
 gear('cleaver','旋刃大劍','Whirlblade','weapon','knight',1,{atk:10},'cleave','普攻斬擊身旁敵人。','Basic attacks cleave nearby enemies.'),
 gear('frostblade','霜紋劍','Frostbrand','weapon','knight',2,{atk:17},'freeze','攻擊減速，對緩速敵人增傷。','Slows on hit; bonus damage to slowed targets.'),
 gear('sunblade','晨曦聖劍','Dawnbringer','weapon','knight',3,{atk:29,hp:70},'lifesteal','高額攻擊與生命，攻擊吸血 18%。','Heavy damage, extra HP and 18% lifesteal.'),
 gear('pierce','穿林弓','Heartwood Bow','weapon','ranger',1,{atk:6},'pierce','箭矢穿透，連帶傷害目標後方敵人。','Arrows pierce enemies behind the target.'),
 gear('quickbow','疾風短弓','Gale Bow','weapon','ranger',1,{atk:4,haste:0.28},'none','攻速提高 28%。','Attack speed +28%.'),
 gear('stormbow','雷鳴弓','Stormcaller','weapon','ranger',2,{atk:13},'chain','攻擊連鎖至另外兩個目標。','Hits chain to two additional targets.'),
 gear('falcon','蒼鷹長弓','Skyhunter','weapon','ranger',3,{atk:22,range:1.2},'pierce','超長射程與穿透，掌握整條通道。','Extra range and piercing control long lanes.'),
 gear('icestaff','冰晶法杖','Glacial Staff','weapon','mage',1,{atk:9},'freeze','爆炸附加緩速，接續攻擊增傷。','Explosions slow; follow-up hits deal more damage.'),
 gear('ember','餘燼之杖','Emberwood','weapon','mage',1,{atk:13},'burn','爆炸點燃敵人，持續灼燒。','Explosions ignite enemies for damage over time.'),
 gear('thunder','雷枝魔杖','Thunderbranch','weapon','mage',2,{atk:18},'chain','範圍攻擊再連鎖閃電。','Area attacks also chain lightning.'),
 gear('winter','永冬之杖','Everfrost','weapon','mage',3,{atk:32,range:0.6},'freeze','強化冰爆，對減速目標造成額外傷害。','Powerful frost blasts punish slowed enemies.'),
 gear('grace','慈悲權杖','Grace','weapon','priest',1,{atk:8,heal:0.45},'none','治療量提高 45%。','Healing +45%.'),
 gear('bless','祈願之鈴','Wishbell','weapon','priest',1,{atk:6},'aura','附近隊友獲得 18% 攻速。','Nearby allies gain 18% attack speed.'),
 gear('halo','聖光十字','Daystar','weapon','priest',2,{atk:15,heal:0.35},'aura','治療強化，並提高附近隊友攻速。','Stronger healing and a nearby attack-speed aura.'),
 gear('seraph','天使之詩','Seraph Hymn','weapon','priest',3,{atk:23,heal:0.8},'aura','大幅強化治療，守護前線。','Greatly improved healing and an ally aura.'),
 gear('leather','旅人皮甲','Wayfarer Leather','armor','all',1,{hp:55,armor:2},'none','增加生命與護甲。','Extra health and armor.'),
 gear('thorn','荊棘鎧甲','Thornmail','armor','all',2,{hp:85,armor:5},'thorns','受到近戰攻擊反彈 12 傷害。','Reflect 12 damage on melee hits.'),
 gear('silk','月影法袍','Moonweave','armor','all',1,{hp:35,haste:0.15},'none','輕巧法袍，增加生命與攻速。','Light robes grant health and attack speed.'),
 gear('aegis','守望者重鎧','Warden Aegis','armor','all',3,{hp:160,armor:9},'thorns','厚重護甲與反傷，站穩前線。','Heavy armor, health and reflected damage.'),
 gear('scope','鷹眼墜飾','Hawkeye','charm','all',1,{range:0.8,atk:3},'none','射程 +0.8 格，適合後排。','Range +0.8 tiles. Ideal for the backline.'),
 gear('amber','琥珀護符','Amber Heart','charm','all',1,{hp:45,atk:5},'none','穩定增加生命與攻擊。','A reliable boost to health and damage.'),
 gear('clock','時之沙漏','Hourglass','charm','all',2,{haste:0.2,cdr:0.3},'none','攻速 +20%，技能冷卻 -30%。','Attack speed +20%; skill cooldown -30%.'),
 gear('moon','新月之石','Crescent Stone','charm','all',3,{atk:18,haste:0.25,cdr:0.25},'none','加速攻擊與技能，讓流派成形。','Faster attacks and skills complete your build.')
];
export const RARITIES = [['精良','Fine','#70a285'],['稀有','Rare','#779fc1'],['傳說','Legendary','#d8aa54']];
export const SLOTS = {weapon:['武器','Weapon'],armor:['防具','Armor'],charm:['飾品','Charm']};
export const TEXT = (value,lang='zh') => Array.isArray(value)?value[lang==='en'?1:0]:value;
