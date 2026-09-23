/* ==========================================================
   EMT-2 章節圖表庫（第二版）
   結構：window.EMT2_DIAGRAMS[章節代號] = [ {t:標題, c:說明, s:SVG} ]

   SVG 的文字不會自動換行，所以這裡自備 wrap()：
   先估算每個字的寬度（中日韓字元約等於字級，英數約 0.56 倍），
   超過指定寬度就斷行成 tspan。所有文字都限制在畫布內。
   ========================================================== */
window.EMT2_DIAGRAMS = (function(){

var W = 640;                 /* 畫布寬度 */
var PAD = 14;                /* 左右留白 */
var FULL = W - PAD*2;        /* 可用寬度 */
var RED="#C0392B", AMBER="#C4820A", GREEN="#1E8449", BLACK="#343A40";
var INK="var(--ink)", MUTED="var(--muted)", RULE="var(--rule)",
    BLUE="var(--blue)", BLUED="var(--blue-dark)", TINT="var(--blue-tint)";

/* ---------- 文字寬度估算與斷行 ---------- */
function textWidth(s, size){
  var t = 0;
  for(var i=0;i<s.length;i++){
    var c = s.charCodeAt(i);
    if(c === 32) t += size*0.3;          /* 空白 */
    else if(c < 0x00a0) t += size*0.6;   /* ASCII 英數與基本標點 */
    else if(c >= 0x2e80) t += size;      /* 中日韓、全形 */
    else t += size*0.92;                 /* 其餘非 ASCII：箭頭、≥≤×÷°℃±、下標等，一律保守估寬避免溢出框 */
  }
  return t;
}
function splitLines(s, maxW, size){
  var out = [], cur = "";
  for(var i=0;i<s.length;i++){
    var ch = s.charAt(i);
    if(ch === "\n"){ out.push(cur); cur = ""; continue; }
    if(cur && textWidth(cur + ch, size) > maxW){
      out.push(cur);
      cur = (ch === " ") ? "" : ch;
    }else{
      cur += ch;
    }
  }
  if(cur) out.push(cur);
  return out.length ? out : [""];
}
function esc(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/* 單行文字，不斷行 */
function t1(x,y,s,o){
  o = o || {};
  return '<text x="'+x+'" y="'+y+'" font-size="'+(o.size||13)+'" fill="'+(o.fill||INK)+
    '" font-weight="'+(o.w||400)+'" text-anchor="'+(o.a||"start")+'">'+esc(s)+'</text>';
}
/* 自動斷行文字，回傳 {svg, h, n} */
function wrap(x,y,s,maxW,o){
  o = o || {};
  var size = o.size || 13, lh = o.lh || Math.round(size*1.55);
  var ls = splitLines(s, maxW, size);
  var body = ls.map(function(l,i){
    return '<tspan x="'+x+'" dy="'+(i?lh:0)+'">'+esc(l)+'</tspan>';
  }).join("");
  return {
    svg:'<text y="'+y+'" font-size="'+size+'" fill="'+(o.fill||INK)+
        '" font-weight="'+(o.w||400)+'">'+body+'</text>',
    h: (ls.length-1)*lh,
    n: ls.length
  };
}
function box(x,y,w,h,fill,stroke,sw){
  return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="'+
    (fill||"#fff")+'" stroke="'+(stroke||RULE)+'" stroke-width="'+(sw||1.4)+'"/>';
}
function arrow(x1,y1,x2,y2,color){
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+
    (color||MUTED)+'" stroke-width="1.6" marker-end="url(#ar)"/>';
}
/* 連接線上的說明標籤：加白底蓋住線，讓箭頭在標籤處自然斷開、箭頭露在下方 */
function clabel(x,y,text,o){
  o=o||{}; var size=o.size||12;
  var w=textWidth(text,size)+14;
  return '<rect x="'+(x-w/2)+'" y="'+(y-size)+'" width="'+w+'" height="'+(size+8)+
         '" rx="5" fill="#fff"/>'+
         t1(x,y,text,{a:"middle",size:size,fill:o.fill||INK,w:o.w||400});
}
function pill(x,y,w,label,color,h){
  h = h || 30;
  return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(h/2)+
    '" fill="'+color+'"/>'+t1(x+w/2,y+h/2+5,label,{a:"middle",fill:"#fff",w:700,size:13});
}
/* 底部註腳，自動斷行並回傳高度 */
function foot(y, s, color){
  var r = wrap(PAD, y, s, FULL, {size:12, fill:color||MUTED, w:color?700:400});
  return {svg:r.svg, bottom: y + r.h};
}
/* 文字卡片：標題 + 內文，內文自動斷行，高度自動 */
function card(x,y,w,title,body,accent,bg,minH){
  var inner = w - 28;
  var titleY = y + 24;          /* 標題基線 */
  var bodyY = titleY + 22;      /* 內文第一行基線，與標題保持距離 */
  var r = wrap(x+14, bodyY, body, inner, {size:12.5, lh:18});
  /* r.h 只含第一行之後累積的高度，總高 = 上緣到內文最後一行 + 底部留白 */
  var h = (bodyY - y) + r.h + 16;
  if(minH && minH > h) h = minH;   /* 供多欄對齊：統一高度 */
  return {
    svg: box(x,y,w,h,bg||"#fff",accent||RULE, accent?1.5:1.4) +
         t1(x+14, titleY, title, {w:700, size:13.5, fill:accent||INK}) + r.svg,
    h: h
  };
}
function svg(h, body){
  return '<svg viewBox="0 0 '+W+' '+Math.ceil(h)+'" style="width:100%;height:auto;'+
         'font-family:inherit" role="img">'+body+'</svg>';
}

/* ====================================================
   第 1 章　生命之星
   ==================================================== */
function starOfLife(){
  var cx=150, cy=160, r=86, body="";
  var pts=[[0,-1],[0.866,-0.5],[0.866,0.5],[0,1],[-0.866,0.5],[-0.866,-0.5]]
    .map(function(p){ return [cx+p[0]*r, cy+p[1]*r]; });
  for(var i=0;i<3;i++){
    body += '<line x1="'+pts[i][0]+'" y1="'+pts[i][1]+'" x2="'+pts[i+3][0]+
      '" y2="'+pts[i+3][1]+'" stroke="#1B6FB5" stroke-width="16" stroke-linecap="round"/>';
  }
  body += '<circle cx="'+cx+'" cy="'+cy+'" r="30" fill="#fff" stroke="#1B6FB5" stroke-width="2"/>'+
    '<line x1="'+cx+'" y1="'+(cy-22)+'" x2="'+cx+'" y2="'+(cy+22)+
      '" stroke="#1B6FB5" stroke-width="3" stroke-linecap="round"/>'+
    '<path d="M'+(cx-9)+' '+(cy-14)+' q18 8 0 16 q-18 8 0 16" fill="none" '+
      'stroke="#1B6FB5" stroke-width="2.6" stroke-linecap="round"/>';

  var names=["發現","通報","反應出勤","現場處置","運送照顧","送達確切醫療"];
  var eng=["Detection","Reporting","Response","On Scene Care",
           "Care In Transit","Transfer to Definitive Care"];
  pts.forEach(function(p,i){
    body += '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="13" fill="#fff" stroke="#1B6FB5" stroke-width="2"/>'+
      t1(p[0],p[1]+4.5,String(i+1),{a:"middle",w:700,size:12,fill:"#1B6FB5"});
    var y = 42 + i*38;
    body += '<circle cx="300" cy="'+y+'" r="11" fill="'+TINT+'"/>'+
      t1(300,y+4,String(i+1),{a:"middle",w:700,size:12,fill:BLUED})+
      t1(320,y+1,names[i],{w:700,size:13.5})+
      t1(320,y+16,eng[i],{size:11.5,fill:MUTED});
  });
  var f = foot(288,"中央的盤蛇節杖源自古希臘醫藥之神亞斯古尼克的權杖，象徵治療與痊癒。"+
    "六個角由正上方起順時針排列，代表院前救護的完整流程。");
  return svg(f.bottom+16, body+f.svg);
}

/* ====================================================
   第 2 章　腦部分區
   ==================================================== */
function brain(){
  var b = "";
  b += '<path d="M46 138 q0-70 88-82 q94-12 128 38 q28 42 4 82 q-20 34-70 38 l-104 2 '+
       'q-46-6-46-78z" fill="'+TINT+'" stroke="'+BLUE+'" stroke-width="1.6"/>'+
    t1(148,112,"大腦",{w:700,size:15,a:"middle",fill:BLUED})+
    t1(148,132,"意識・思考・感覺・隨意運動",{size:11.5,a:"middle",fill:MUTED});
  b += '<ellipse cx="252" cy="196" rx="50" ry="33" fill="#DCEAF5" stroke="'+BLUE+'" stroke-width="1.6"/>'+
    t1(252,193,"小腦",{w:700,size:13,a:"middle",fill:BLUED})+
    t1(252,210,"平衡・協調",{size:11,a:"middle",fill:MUTED});
  b += '<rect x="118" y="158" width="84" height="106" rx="8" fill="none" stroke="'+MUTED+
       '" stroke-width="1.2" stroke-dasharray="4 3"/>'+
    t1(118,280,"虛線範圍為腦幹",{size:11.5,fill:MUTED});

  var stem=[["中腦","瞳孔對光反射、聽覺與視覺反射"],
            ["橋腦","呼吸調節中樞，協調吸氣與呼氣轉換"],
            ["延腦","生命中樞：呼吸節律、心搏速率、血管舒縮、吞嚥與嘔吐反射"]];
  var y = 164, maxB = 0;
  stem.forEach(function(s,i){
    b += box(124,y,72,26,"#fff")+t1(160,y+17,s[0],{a:"middle",w:700,size:12.5});
    b += arrow(200,y+13,306,y+13);
    var r = wrap(314, y+9, s[1], W-314-PAD, {size:12.5, w:i===2?700:400,
      fill:i===2?RED:INK, lh:16});
    b += r.svg;
    maxB = Math.max(maxB, y+9+r.h);
    y += 38;
  });
  var f = foot(Math.max(maxB, 296)+18,
    "延腦受損直接危及呼吸與心跳，是腦幹三構造中最常考的一項。");
  return svg(f.bottom+16, b+f.svg);
}

/* ====================================================
   第 2 章　動脈觸摸點
   ==================================================== */
function pulsePoints(){
  var b = "";
  /* 人形 */
  b += '<circle cx="140" cy="52" r="26" fill="#F4F7FA" stroke="'+RULE+'" stroke-width="1.5"/>'+
    '<path d="M112 92 h56 l18 28 v76 h-92 v-76z" fill="#F4F7FA" stroke="'+RULE+'" stroke-width="1.5"/>'+
    '<path d="M96 104 l-22 78" stroke="#E4EAF0" stroke-width="17" stroke-linecap="round"/>'+
    '<path d="M184 104 l22 78" stroke="#E4EAF0" stroke-width="17" stroke-linecap="round"/>'+
    '<path d="M118 196 l-10 84" stroke="#E4EAF0" stroke-width="19" stroke-linecap="round"/>'+
    '<path d="M162 196 l10 84" stroke="#E4EAF0" stroke-width="19" stroke-linecap="round"/>';

  var dots=[[152,78,"1"],[86,132,"2"],[118,196,"2"],[70,176,"3"],[106,282,"4"]];
  dots.forEach(function(d){
    b += '<circle cx="'+d[0]+'" cy="'+d[1]+'" r="10" fill="'+BLUE+'"/>'+
      t1(d[0],d[1]+4,d[2],{a:"middle",fill:"#fff",w:700,size:11});
  });

  var rows=[["1","頸動脈 Carotid","收縮壓 ≥ 60 mmHg"],
            ["2","肱動脈 / 股動脈","收縮壓 ≥ 70 mmHg"],
            ["3","橈動脈 Radial","收縮壓 ≥ 80 mmHg"],
            ["4","足背動脈 Dorsalis pedis","收縮壓 ≥ 90 mmHg"]];
  var y = 28;
  rows.forEach(function(r){
    b += box(238,y,388,52,"#fff")+
      '<circle cx="262" cy="'+(y+26)+'" r="12" fill="'+BLUE+'"/>'+
      t1(262,y+30,r[0],{a:"middle",fill:"#fff",w:700,size:12})+
      t1(284,y+22,r[1],{w:700,size:13.5})+
      t1(284,y+40,r[2],{size:12.5,fill:RED,w:700});
    y += 60;
  });
  var f = foot(Math.max(y+8, 300),
    "摸得到即代表收縮壓至少達到該數值。摸不到橈動脈但摸得到頸動脈時，收縮壓約在 60 至 80 之間。");
  return svg(f.bottom+16, b+f.svg);
}

/* ====================================================
   第 2 章　GCS
   ==================================================== */
function gcs(){
  var cols=[
    {k:"E　張眼反應",x:PAD,rows:[["4","自發張眼"],["3","呼喚張眼"],
      ["2","痛刺激張眼"],["1","無反應"]]},
    {k:"V　語言反應",x:218,rows:[["5","人時地清楚"],["4","語無倫次"],
      ["3","不適當字詞"],["2","呻吟發聲"],["1","無反應"]]},
    {k:"M　運動反應",x:422,rows:[["6","遵從指令"],["5","疼痛定位"],["4","避痛屈曲"],
      ["3","去皮質僵直"],["2","去大腦僵直"],["1","無反應"]]}
  ];
  var b = "", bottom = 0;
  cols.forEach(function(c){
    b += box(c.x,14,204,32,BLUED,BLUED)+
      t1(c.x+102,35,c.k,{a:"middle",fill:"#fff",w:700,size:13.5});
    c.rows.forEach(function(r,i){
      var y = 54+i*34;
      var hot = c.k.charAt(0)==="M" && (r[0]==="3"||r[0]==="2");
      b += box(c.x,y,204,28,hot?"var(--bad-tint)":"#fff")+
        '<rect x="'+(c.x+7)+'" y="'+(y+4)+'" width="20" height="20" rx="5" fill="'+TINT+'"/>'+
        t1(c.x+17,y+19,r[0],{a:"middle",w:700,size:12,fill:BLUED})+
        t1(c.x+34,y+19,r[1],{size:12.5});
      bottom = Math.max(bottom, y+28);
    });
  });
  b += box(422,bottom+10,204,26,"var(--bad-tint)","var(--bad)")+
    t1(524,bottom+27,"紅底為腦部嚴重受損",{a:"middle",size:11.5,fill:RED,w:700});
  var f = foot(bottom+62,
    "總分 3 至 15 分。13 至 15 為輕度，9 至 12 為中度，8 分以下為重度昏迷，"+
    "無法自主維持呼吸道。插管記 VE、氣切記 VT、失語症記 VA。");
  return svg(f.bottom+16, b+f.svg);
}

/* ====================================================
   第 3 章　事故現場車輛停放
   ==================================================== */
function sceneParking(){
  var b = "";
  b += t1(PAD,26,"防撞車在後方擋住來車，救護車在前方負責載運，中間才是安全工作區",
        {size:13,w:700});
  b += '<rect x="0" y="84" width="640" height="112" fill="#F1F4F7"/>'+
    '<line x1="0" y1="140" x2="640" y2="140" stroke="#fff" stroke-width="3" stroke-dasharray="22 16"/>'+
    '<line x1="0" y1="84" x2="640" y2="84" stroke="'+RULE+'" stroke-width="1.4"/>'+
    '<line x1="0" y1="196" x2="640" y2="196" stroke="'+RULE+'" stroke-width="1.4"/>';
  b += arrow(PAD,62,116,62,BLUE)+t1(PAD,54,"車流方向",{size:11.5,fill:BLUED,w:700});

  b += '<g transform="rotate(-26 240 150)">'+
    '<rect x="196" y="130" width="92" height="38" rx="6" fill="#FAE8E6" stroke="'+RED+'" stroke-width="1.8"/>'+
    '<text x="242" y="154" font-size="12" font-weight="700" text-anchor="middle" fill="'+RED+'">消防車</text></g>';
  b += '<rect x="360" y="110" width="82" height="34" rx="5" fill="#FFF4E0" stroke="'+AMBER+'" stroke-width="1.6"/>'+
    t1(401,132,"事故車",{a:"middle",size:12,w:700,fill:AMBER});
  b += '<rect x="518" y="146" width="100" height="40" rx="6" fill="#EAF4EC" stroke="'+GREEN+'" stroke-width="1.8"/>'+
    t1(568,171,"救護車",{a:"middle",size:12,w:700,fill:GREEN});

  b += '<path d="M148 182 l7-18 7 18z" fill="'+AMBER+'"/>'+
    '<path d="M110 182 l7-18 7 18z" fill="'+AMBER+'"/>'+
    '<path d="M72 182 l7-18 7 18z" fill="'+AMBER+'"/>';
  b += '<line x1="72" y1="218" x2="230" y2="218" stroke="'+BLUE+'" stroke-width="1.4"/>'+
    '<line x1="72" y1="212" x2="72" y2="224" stroke="'+BLUE+'" stroke-width="1.4"/>'+
    '<line x1="230" y1="212" x2="230" y2="224" stroke="'+BLUE+'" stroke-width="1.4"/>'+
    t1(151,210,"交通錐警示距離",{a:"middle",size:11.5,w:700,fill:BLUED});

  var c1 = card(PAD,238,300,"消防車（防撞阻絕車）",
    "15 至 45 度斜停於事故後方，前輪打向遠離現場的方向，被追撞時才不會往前推擠傷及人員。",RED,"#FDF3F2");
  var c2 = card(326,238,300,"救護車",
    "停在事故現場前方，車頭朝離場方向，傷患上車後可直接駛離。",GREEN,"#F1F9F3");
  var y2 = 238 + Math.max(c1.h, c2.h) + 14;
  var f = foot(y2+14, "交通錐設於防撞車後方：一般道路 30 至 100 公尺，高速或快速公路 100 公尺以上。");
  return svg(f.bottom+16, b+c1.svg+c2.svg+f.svg);
}

/* ====================================================
   第 4 章　CPR 年齡對照
   ==================================================== */
function cprTable(){
  var cols=[
    {t:"成人與青少年",x:PAD,rows:[["按壓深度","5 至 6 公分"],["按壓速率","100 至 120 次/分"],
      ["壓吹比","30 : 2"],["按壓手法","雙手掌根重疊"],["脈搏位置","頸動脈"]]},
    {t:"兒童（1 歲至青春期）",x:218,rows:[["按壓深度","約 5 公分"],["按壓速率","100 至 120 次/分"],
      ["壓吹比","單人 30:2　雙人 15:2"],["按壓手法","單手或雙手掌根"],["脈搏位置","頸或股動脈"]]},
    {t:"嬰兒（未滿 1 歲）",x:422,rows:[["按壓深度","約 4 公分"],["按壓速率","100 至 120 次/分"],
      ["壓吹比","單人 30:2　雙人 15:2"],["按壓手法","雙拇指環抱法"],["脈搏位置","肱動脈"]]}
  ];
  var b = "", bottom = 0;
  cols.forEach(function(c){
    b += box(c.x,14,204,34,BLUED,BLUED)+
      t1(c.x+102,36,c.t,{a:"middle",fill:"#fff",w:700,size:12.5});
    c.rows.forEach(function(r,i){
      var y = 56+i*44;
      b += box(c.x,y,204,40,i%2?"#F8FAFC":"#fff")+
        t1(c.x+12,y+16,r[0],{size:11,fill:MUTED});
      var v = wrap(c.x+12, y+32, r[1], 180, {size:12.5, w:700, lh:14});
      b += v.svg;
      bottom = Math.max(bottom, y+40);
    });
  });
  var f = foot(bottom+26,
    "AHA 2025 更新：未滿 1 歲嬰兒不論單人或雙人施救，一律改採雙拇指環抱法，"+
    "不再建議單人使用單手兩指法。", RED);
  return svg(f.bottom+16, b+f.svg);
}

/* ====================================================
   第 4 章　哈姆立克
   ==================================================== */
function heimlich(){
  var b = "";
  b += '<path d="M136 34 q44 0 44 38 v104 q0 38-44 38 q-44 0-44-38 v-104 q0-38 44-38z" '+
    'fill="#F4F7FA" stroke="'+RULE+'" stroke-width="1.6"/>'+
    '<path d="M108 68 q28 16 56 0" fill="none" stroke="'+RULE+'" stroke-width="1.4"/>';
  b += '<line x1="136" y1="72" x2="136" y2="102" stroke="'+RULE+'" stroke-width="1.4" stroke-dasharray="3 3"/>'+
    '<circle cx="136" cy="102" r="5" fill="'+MUTED+'"/>'+t1(180,106,"劍突",{size:12,fill:MUTED});
  b += '<circle cx="136" cy="160" r="7" fill="none" stroke="'+MUTED+'" stroke-width="1.6"/>'+
    t1(180,164,"肚臍",{size:12,fill:MUTED});
  b += '<circle cx="136" cy="132" r="18" fill="'+RED+'"/>'+
    t1(136,137,"拳",{a:"middle",fill:"#fff",w:700,size:12});
  b += arrow(136,200,136,156,RED)+
    t1(136,222,"向內、向上快速推擠",{a:"middle",size:12.5,w:700,fill:RED});

  var c1 = card(260,20,366,"輕度哽塞：能咳嗽、能說話",
    "鼓勵病人自主咳嗽，此時咳嗽比任何手法有效。不可拍背，也不要干擾。");
  var c2 = card(260,20+c1.h+12,366,"重度哽塞：無法發聲、雙手掐頸",
    "站在病人後方立即施行腹部推擠，持續到異物排出或病人失去意識。",RED,"#FDF3F2");
  var y3 = 20+c1.h+12+c2.h+12;
  var c3 = card(260,y3,366,"兩種情況改用胸部推擠",
    "懷孕後期孕婦與重度肥胖者，腹部推擠無效且可能傷及胎兒或內臟。");
  var bottom = Math.max(240, y3+c3.h);
  var f = foot(bottom+24,
    "未滿 1 歲嬰兒採 5 次背擊（頭低腳高）加 5 次壓胸交替，絕對禁止腹部推擠，以免肝臟破裂。", RED);
  return svg(f.bottom+16, b+c1.svg+c2.svg+c3.svg+f.svg);
}

/* ====================================================
   第 4 章　止血帶
   ==================================================== */
function tourniquet(){
  var b = "";
  b += t1(PAD,28,"傷口位置不明確時改採綁高綁緊（High and Tight），直接綁在肢體根部",
    {size:12.5,fill:MUTED});
  b += '<rect x="40" y="82" width="470" height="54" rx="27" fill="#F4F7FA" stroke="'+RULE+'" stroke-width="1.6"/>'+
    t1(46,74,"近心端（靠軀幹）",{size:11.5,fill:MUTED})+
    t1(504,74,"遠心端",{size:11.5,fill:MUTED,a:"end"});
  b += '<path d="M392 92 l14 18 -12 16 14 12" fill="none" stroke="'+RED+
    '" stroke-width="3" stroke-linecap="round"/>'+
    t1(400,162,"傷口",{a:"middle",size:12,w:700,fill:RED});
  b += '<rect x="282" y="76" width="26" height="66" rx="5" fill="'+INK+'"/>'+
    '<rect x="270" y="92" width="50" height="10" rx="5" fill="'+INK+'"/>'+
    '<circle cx="295" cy="64" r="12" fill="none" stroke="'+INK+'" stroke-width="3"/>'+
    t1(295,162,"止血帶",{a:"middle",size:12.5,w:700});
  b += '<line x1="308" y1="186" x2="392" y2="186" stroke="'+BLUE+'" stroke-width="1.4"/>'+
    '<line x1="308" y1="180" x2="308" y2="192" stroke="'+BLUE+'" stroke-width="1.4"/>'+
    '<line x1="392" y1="180" x2="392" y2="192" stroke="'+BLUE+'" stroke-width="1.4"/>'+
    t1(350,178,"5 至 8 公分",{a:"middle",size:12,w:700,fill:BLUED});

  var c1 = card(PAD,206,300,"綁多緊才夠",
    "旋轉手柄直到出血停止，而且遠端摸不到脈搏。只是變慢不算成功。");
  var c2 = card(326,206,300,"時間一定要寫",
    "在止血帶上標記施打時間，到院前不可任意鬆開。第一條無效時，緊鄰其近心端並排綁第二條。",RED,"#FDF3F2");
  var f = foot(206+Math.max(c1.h,c2.h)+26,
    "適用時機：肢體動脈噴血、截肢、直接加壓無效的致命性大出血。");
  return svg(f.bottom+16, b+c1.svg+c2.svg+f.svg);
}

/* ====================================================
   第 5 章　XABCDE
   ==================================================== */
function xabcde(){
  var steps=[
    ["X","大量外出血 eXsanguinating","優先於一切。直接加壓、止血帶綁高綁緊、交界處傷口填塞止血。",RED],
    ["A","呼吸道 Airway","外傷首選下顎推舉法，避免頭頸移動。GCS 低於 9 分應置入輔助呼吸道。",BLUE],
    ["B","呼吸 Breathing","評估胸廓對稱性、呼吸作功、聽診肺音。GCS 低於 9 分即使血氧正常仍給高濃度氧氣。",BLUE],
    ["C","循環 Circulation","雙側橈動脈、膚色濕冷度、微血管充填時間。骨盆穩固性檢查以一次為限。",BLUE],
    ["D","神經學 Disability","GCS、兩側瞳孔大小與對光反射、四肢運動與感覺。",BLUE],
    ["E","暴露與保暖 Exposure","快速視診全身找出隱藏傷口，處置後立即覆蓋保暖，預防致死三聯症。",AMBER]
  ];
  var b = "", y = 14;
  steps.forEach(function(s,i){
    var r = wrap(84, y+44, s[2], W-84-PAD, {size:12.5, fill:MUTED, lh:17});
    var h = Math.max(58, 52 + r.h);
    b += box(PAD,y,W-PAD*2,h,"#fff") +
      '<rect x="'+PAD+'" y="'+y+'" width="56" height="'+h+'" rx="8" fill="'+s[3]+'"/>' +
      t1(PAD+28, y+h/2+8, s[0], {a:"middle",fill:"#fff",w:700,size:22}) +
      t1(84, y+26, s[1], {w:700,size:14}) + r.svg;
    if(i<steps.length-1) b += arrow(PAD+28, y+h, PAD+28, y+h+10, RULE);
    y += h + 12;
  });
  return svg(y+4, b);
}

/* ====================================================
   第 6 章　12 導程
   ==================================================== */
function ecg12(){
  var b = "";
  b += '<path d="M120 56 q110-24 220 0 q20 70 0 152 q-110 22-220 0 q-20-82 0-152z" '+
    'fill="#F7FAFC" stroke="'+RULE+'" stroke-width="1.4"/>'+
    '<line x1="230" y1="60" x2="230" y2="204" stroke="'+RULE+'" stroke-width="1.2" stroke-dasharray="4 4"/>'+
    '<path d="M140 90 q92 16 184 0 M136 122 q96 16 192 0 M140 154 q92 16 184 0 '+
      'M148 186 q84 14 168 0" fill="none" stroke="'+RULE+'" stroke-width="1.2"/>'+
    t1(230,44,"胸骨中線",{a:"middle",size:11,fill:MUTED});

  var v=[["V1",186,114,"胸骨右緣第 4 肋間"],
         ["V2",240,114,"胸骨左緣第 4 肋間"],
         ["V3",268,142,"V2 與 V4 的連線中點"],
         ["V4",296,170,"左鎖骨中線第 5 肋間"],
         ["V5",330,176,"左前腋線，與 V4 同水平"],
         ["V6",362,180,"左中腋線，與 V4 同水平"]];
  v.forEach(function(p,i){
    b += '<circle cx="'+p[1]+'" cy="'+p[2]+'" r="10" fill="'+BLUE+'"/>'+
      t1(p[1],p[2]+4,p[0].slice(1),{a:"middle",fill:"#fff",w:700,size:11});
    var y = 36+i*32;
    b += t1(410,y,p[0],{w:700,size:13,fill:BLUED})+t1(444,y,p[3],{size:12});
  });
  b += box(396,16,230,32*6,"none",RULE,1.2);
  var f1 = wrap(PAD,244,"肢體導極：RA 右上肢、LA 左上肢、RL 右下肢、LL 左下肢",FULL,{size:12.5,w:700});
  var f = foot(244+f1.h+24,
    "貼附順序：先定 V1 與 V2，再定 V4，V3 補在兩者之間，最後 V5 與 V6 與 V4 維持同一水平線。");
  return svg(f.bottom+16, b+f1.svg+f.svg);
}

/* ====================================================
   第 7 章　九則定律
   ==================================================== */
function ruleOfNines(){
  function figure(ox, label, head, leg){
    return t1(ox+70,24,label,{a:"middle",w:700,size:13})+
    '<circle cx="'+(ox+70)+'" cy="58" r="22" fill="'+TINT+'" stroke="'+BLUE+'" stroke-width="1.3"/>'+
      t1(ox+70,63,head,{a:"middle",w:700,size:12,fill:BLUED})+
    '<rect x="'+(ox+40)+'" y="86" width="60" height="84" rx="6" fill="#DCEAF5" stroke="'+BLUE+'" stroke-width="1.3"/>'+
      t1(ox+70,134,"18%",{a:"middle",w:700,size:14,fill:BLUED})+
    '<rect x="'+(ox+8)+'" y="88" width="26" height="74" rx="10" fill="#E9F1F8" stroke="'+BLUE+'" stroke-width="1.3"/>'+
      t1(ox+21,130,"9%",{a:"middle",w:700,size:11,fill:BLUED})+
    '<rect x="'+(ox+106)+'" y="88" width="26" height="74" rx="10" fill="#E9F1F8" stroke="'+BLUE+'" stroke-width="1.3"/>'+
      t1(ox+119,130,"9%",{a:"middle",w:700,size:11,fill:BLUED})+
    '<rect x="'+(ox+40)+'" y="176" width="27" height="88" rx="9" fill="#D2E4F2" stroke="'+BLUE+'" stroke-width="1.3"/>'+
      t1(ox+53,224,leg,{a:"middle",w:700,size:11,fill:BLUED})+
    '<rect x="'+(ox+73)+'" y="176" width="27" height="88" rx="9" fill="#D2E4F2" stroke="'+BLUE+'" stroke-width="1.3"/>'+
      t1(ox+86,224,leg,{a:"middle",w:700,size:11,fill:BLUED});
  }
  var b = figure(PAD,"成人（前）","9%","18%") + figure(160,"兒童（前）","18%","14%");
  var c1 = card(316,14,310,"成人：9 的倍數",
    "頭頸 9，前軀幹 18，後軀幹 18，每側上肢 9，每側下肢 18，會陰 1。");
  var c2 = card(316,14+c1.h+12,310,"兒童：頭大腿短",
    "頭頸放大為 18，每側下肢縮為 14（雙下肢共 28），會陰 0。",BLUE,TINT);
  var y3 = 14+c1.h+12+c2.h+12;
  var c3 = card(316,y3,310,"零星小面積",
    "以病患本人的手掌（含併攏的五指）估算，約為體表面積的 1%。");
  var bottom = Math.max(276, y3+c3.h);
  var f = foot(bottom+24,"一度燒傷（僅紅、乾、痛，無水泡）不計入燒傷面積。", RED);
  return svg(f.bottom+16, b+c1.svg+c2.svg+c3.svg+f.svg);
}

/* ====================================================
   第 8 章　小兒評估三角
   ==================================================== */
function pat(){
  var A=[152,44], B=[48,216], C=[256,216];
  var b = '<polygon points="'+A+' '+B+' '+C+'" fill="'+TINT+'" stroke="'+BLUE+'" stroke-width="2"/>';
  [[A,"A"],[B,"B"],[C,"C"]].forEach(function(p){
    b += '<circle cx="'+p[0][0]+'" cy="'+p[0][1]+'" r="25" fill="'+BLUE+'"/>'+
      t1(p[0][0],p[0][1]+6,p[1],{a:"middle",fill:"#fff",w:700,size:17});
  });
  b += t1(152,146,"30 至 60 秒內",{a:"middle",size:13,w:700,fill:BLUED})+
    t1(152,166,"不接觸病童完成",{a:"middle",size:13,w:700,fill:BLUED})+
    t1(152,20,"外觀",{a:"middle",size:12.5,w:700})+
    t1(48,254,"呼吸作功",{a:"middle",size:12.5,w:700})+
    t1(256,254,"皮膚循環",{a:"middle",size:12.5,w:700});

  var c1 = card(306,14,320,"A　外觀 Appearance",
    "肌張力、互動性、安撫性、眼神注視、哭聲或說話。肌張力軟癱代表腦部缺氧或灌流不良。");
  var c2 = card(306,14+c1.h+10,320,"B　呼吸作功 Work of Breathing",
    "鼻翼煽動、肋間與胸骨上凹陷、異常姿勢，以及喘鳴、哮鳴、呻吟聲。");
  var y3 = 14+c1.h+10+c2.h+10;
  var c3 = card(306,y3,320,"C　皮膚循環 Circulation to Skin",
    "臉唇蒼白或發紺、四肢出現網狀大理石斑紋。");
  var bottom = Math.max(266, y3+c3.h);
  var f = foot(bottom+24,
    "三項全部異常即為心肺衰竭，立即開始 CPR。外觀與呼吸異常而循環正常為呼吸衰竭；"+
    "僅循環異常為代償性休克。", RED);
  return svg(f.bottom+16, b+c1.svg+c2.svg+c3.svg+f.svg);
}

/* ====================================================
   第 13 章　直升機安全方位
   ==================================================== */
function helipad(){
  var cx=168, cy=170, b="";
  b += '<circle cx="'+cx+'" cy="'+cy+'" r="128" fill="none" stroke="'+RULE+
    '" stroke-width="1.4" stroke-dasharray="6 5"/>';
  b += '<path d="M'+cx+' '+cy+' m-122 0 a122 122 0 0 1 35-86 l87 86z" fill="#FAE8E6" opacity=".5"/>'+
    '<path d="M'+cx+' '+cy+' m122 0 a122 122 0 0 1-35 86 l-87-86z" fill="#FAE8E6" opacity=".5"/>'+
    '<path d="M'+cx+' '+cy+' m-122 0 a122 122 0 0 0 35 86 l87-86z" fill="#EAF4EC" opacity=".65"/>'+
    '<path d="M'+cx+' '+cy+' m122 0 a122 122 0 0 0-35-86 l-87 86z" fill="#EAF4EC" opacity=".65"/>';
  b += '<ellipse cx="'+cx+'" cy="'+cy+'" rx="32" ry="48" fill="#DCE6EE" stroke="'+INK+'" stroke-width="1.6"/>'+
    '<rect x="'+(cx-9)+'" y="'+(cy+42)+'" width="18" height="62" rx="5" fill="#DCE6EE" stroke="'+INK+'" stroke-width="1.6"/>'+
    '<circle cx="'+cx+'" cy="'+(cy+108)+'" r="13" fill="none" stroke="'+RED+'" stroke-width="2.4"/>';
  b += t1(cx,cy-56,"機頭",{a:"middle",size:11.5,fill:RED,w:700})+
    t1(cx+24,cy+112,"尾旋翼",{size:11.5,fill:RED,w:700})+
    t1(cx-126,cy+4,"9 點",{a:"middle",size:13,w:700,fill:GREEN})+
    t1(cx+126,cy+4,"3 點",{a:"middle",size:13,w:700,fill:GREEN});

  var c1 = card(310,14,316,"安全進出區",
    "機身正側方的 3 點鐘與 9 點鐘方向。必須由機組員引導，彎腰低姿態進出。",GREEN,"#F1F9F3");
  var c2 = card(310,14+c1.h+10,316,"絕對禁區",
    "機尾的尾旋翼轉速高、位置低且肉眼看不見；機頭在慢車狀態下主旋翼會下沉低垂。",RED,"#FDF3F2");
  var y3 = 14+c1.h+10+c2.h+10;
  var c3 = card(310,y3,316,"停機坪與車輛",
    "陌生場域臨時降落區至少 30 乘 30 公尺，無高壓電線。救護車停在 3 點鐘方向旋翼區外。");
  var bottom = Math.max(300, y3+c3.h);
  var f = foot(bottom+24,"機上執行電擊前，必須先完成機艙絕緣並通報前艙機長確認。");
  return svg(f.bottom+16, b+c1.svg+c2.svg+c3.svg+f.svg);
}

/* ====================================================
   第 14 章　化災三區
   ==================================================== */
function hazmatZones(){
  var cx=170, cy=170, b="";
  b += '<circle cx="'+cx+'" cy="'+cy+'" r="132" fill="#EAF4EC" stroke="'+GREEN+'" stroke-width="1.6"/>'+
    '<circle cx="'+cx+'" cy="'+cy+'" r="92" fill="#FDF4E3" stroke="'+AMBER+'" stroke-width="1.6"/>'+
    '<circle cx="'+cx+'" cy="'+cy+'" r="50" fill="#FAE8E6" stroke="'+RED+'" stroke-width="1.6"/>';
  b += t1(cx,cy-4,"熱區",{a:"middle",w:700,size:14,fill:RED})+
    t1(cx,cy+16,"污染核心",{a:"middle",size:11,fill:RED})+
    t1(cx,cy-104,"暖區　除污走廊",{a:"middle",w:700,size:13,fill:AMBER})+
    t1(cx,cy-146,"冷區　指揮與醫療站",{a:"middle",w:700,size:13,fill:GREEN});
  b += arrow(24,44,92,84,BLUE)+t1(20,34,"風向",{size:12,w:700,fill:BLUED});

  var c1 = card(318,14,308,"熱區　Hot Zone",
    "污染核心。僅著合規防護等級的應變人員可進入救人，禁止在區內做評估或包紮。",RED,"#FDF3F2");
  var c2 = card(318,14+c1.h+10,308,"暖區　Warm Zone",
    "架設除污走廊。所有脫困人員在此除污並接受緊急救命處置後才能移入冷區。",AMBER,"#FEF8EC");
  var y3 = 14+c1.h+10+c2.h+10;
  var c3 = card(318,y3,308,"冷區　Cold Zone",
    "指揮站、醫療救護站與救護車待命區，一律設在上風、上坡、上游處。",GREEN,"#F1F9F3");
  var bottom = Math.max(306, y3+c3.h);
  var f1 = wrap(PAD,bottom+24,
    "救護核心觀念是醫療處置優先、除污其次，不可因除污程序延誤致命傷的急救。",
    FULL,{size:12,w:700,fill:RED});
  var f = foot(bottom+24+f1.h+22,
    "脫除衣物即可去除 70 至 90% 的體表污染。輻射事故熱區管制為每小時 100 微西弗以上，"+
    "冷區為每小時 0.5 微西弗以下。");
  return svg(f.bottom+16, b+c1.svg+c2.svg+c3.svg+f1.svg+f.svg);
}

/* ====================================================
   第 15 章　START 檢傷
   ==================================================== */
function start(){
  var rows=[
    ["能自行走動？","是","綠色　輕傷",GREEN],
    ["有自主呼吸？","打開氣道後仍無","黑色　死亡",BLACK],
    ["呼吸 > 30 或 < 10 次/分？","是","紅色　第一優先",RED],
    ["橈動脈摸不到，或 CRT > 2 秒？","是","紅色　第一優先",RED],
    ["無法遵從簡單指令？","是","紅色　第一優先",RED],
    ["以上皆否","","黃色　第二優先",AMBER]
  ];
  var b = "", y = 16, GAP = 74;
  rows.forEach(function(r,i){
    var last = (i === rows.length-1);
    b += box(PAD,y,246,46,last?"#FFF9EC":"#fff",last?AMBER:RULE) +
      t1(PAD+14,y+28,r[0],{size:12.5,w:last?700:400});
    b += arrow(266,y+23,376,y+23);
    if(r[1]) b += t1(321,y+15,r[1],{a:"middle",size:10.5,fill:MUTED});
    b += pill(384,y+8,242,r[2],r[3]);
    if(!last) b += arrow(137,y+46,137,y+GAP-10);
    y += GAP;
  });
  b += t1(266,116,"（先打開氣道再判斷）",{size:10.5,fill:MUTED});
  b += t1(266,170,"恢復呼吸則改列紅色",{size:11,fill:RED,w:700});
  var f = foot(y+6,
    "任何一項異常就直接列為紅色，全部通過才是黃色。兒童版 JumpSTART 的差別："+
    "無呼吸但有脈搏時先給 5 次人工呼吸，呼吸標準改為每分鐘 15 至 45 次。");
  return svg(f.bottom+16, b+f.svg);
}

/* ====================================================
   第 15 章　四色檢傷
   ==================================================== */
function triageColors(){
  var rows=[
    [RED,"紅色　第一優先","危及生命但及時治療存活率高，立即送醫",
      "張力性氣胸、大出血休克、嚴重呼吸窘迫、吸入性灼傷"],
    [AMBER,"黃色　第二優先","傷勢嚴重但短時間內無立即生命危險，可暫緩 1 至 2 小時",
      "閉鎖性大腿長骨骨折、無休克的深部裂傷、大面積擦傷"],
    [GREEN,"綠色　第三優先","能自行行走的輕傷 Walking wounded",
      "輕微挫傷、表淺擦傷、肢體末梢小扭傷"],
    [BLACK,"黑色　最後處置","已明顯死亡或傷勢極重已無生命跡象，需通知警方",
      "斷頭、軀幹斷裂、腦漿外溢、暢通氣道後仍無自主呼吸"]
  ];
  var b = "", y = 14;
  rows.forEach(function(r){
    var r1 = wrap(PAD+26, y+40, r[2], FULL-40, {size:12, fill:MUTED, lh:16});
    var r2 = wrap(PAD+26, y+40+r1.h+18, r[3], FULL-40, {size:12.5, lh:16});
    var h = 52 + r1.h + r2.h + 18;
    b += box(PAD,y,FULL,h,"#fff") +
      '<rect x="'+PAD+'" y="'+y+'" width="10" height="'+h+'" rx="5" fill="'+r[0]+'"/>' +
      t1(PAD+26, y+24, r[1], {w:700,size:13.5,fill:r[0]}) + r1.svg + r2.svg;
    y += h + 10;
  });
  var f = foot(y+14,
    "檢傷是動態的。黃區傷患在等待後送期間若呼吸轉快、膚色轉蒼白、意識轉為躁動，"+
    "應立即升級為紅色。", RED);
  return svg(f.bottom+16, b+f.svg);
}

/* ====================================================
   第 4 章　到院前檢傷程序（三級初判 → 五級確認）
   ==================================================== */
function triageFlow(){
  var b="", y=16;
  var top = card(PAD, y, FULL, "現場評估",
    "到達現場後：①初步評估 ②輔助檢查 ③詢問病史，再依單項技術「病情危急度判斷」進行三級檢傷初判。",
    BLUE, TINT);
  b += top.svg; y += top.h + 12;
  b += arrow(W/2, y, W/2, y+16, MUTED); y += 22;
  b += t1(W/2, y, "三級檢傷初判 — 判為以下哪一類？", {a:"middle", w:700, size:13, fill:INK});
  y += 14;

  var gap=14, colW=Math.round((FULL-2*gap)/3);
  var xs=[PAD, PAD+colW+gap, PAD+2*(colW+gap)];
  var cols=[
    {label:"一級", color:RED,
     body:"符合危急個案且被列舉為一級者。建議「直接判定、不需檢索」以免延誤；立即現場處置並於送醫前通報醫院。"},
    {label:"二級", color:AMBER,
     body:"危急個案但未列舉為一級者。先記憶時間急症（中度呼吸窘迫、血行動力不足、GCS 9–13、中樞重度疼痛、高危機轉、心因性胸痛、6 小時內急性腦中風），其餘可現場檢索。"},
    {label:"可能三～五級", color:GREEN,
     body:"非危急個案。可於現場、送醫途中或到院後檢索；因仍可能藏有二級病人，建議送醫前以量表確認，避免『檢傷輕判』。"}
  ];
  var cardY=y+8, maxH=0;
  cols.forEach(function(cd,i){ var c=card(xs[i],cardY,colW,cd.label,cd.body,cd.color); if(c.h>maxH)maxH=c.h; });
  cols.forEach(function(cd,i){ b += card(xs[i],cardY,colW,cd.label,cd.body,cd.color,null,maxH).svg; });
  y = cardY + maxH + 12;
  var by = y + 20;
  xs.forEach(function(x){ b += arrow(x+colW/2, y, x+colW/2, by-6, MUTED); });

  var bottom = card(PAD, by, FULL, "五級檢傷確認",
    "最終以五級量表確認級數 — 一級 急救復甦｜二級 危急｜三級 緊急｜四級 次緊急｜五級 非緊急。",
    BLUED, TINT);
  b += bottom.svg;
  var endY = by + bottom.h;
  var f = foot(endY+22,
    "口訣：現場先用『三級』快速初判，送醫前以『五級』確認；一級直接判、不檢索。", BLUED);
  return svg(f.bottom+16, b+f.svg);
}

/* ====================================================
   第 9 章　新生兒復甦救護流程（圖 9-5）
   ==================================================== */
function neonatalResus(){
  var b="", y=16;
  var top = card(PAD, y, FULL, "出生・黃金一分鐘　初評",
    "① 足月？　② 肌張力良好？　③ 有呼吸或哭？　三項皆「是」→ 常規照護（擦乾保暖、擺位、膚貼膚、持續觀察）；任一為「否」→ 進入復甦。",
    BLUE, TINT);
  b += top.svg; y += top.h + 8;
  b += arrow(W/2, y, W/2, y+32, MUTED);
  b += clabel(W/2, y+20, "任一項為「否」", {size:12, fill:MUTED}); y += 36;

  var A = card(PAD, y, FULL, "A　初步處置（黃金一分鐘內）",
    "必要時吸球抽吸口鼻・擦乾身體並保暖・輕拍足底或摩擦背部刺激・擺位成嗅吸姿勢（肩下墊高）。",
    AMBER);
  b += A.svg; y += A.h + 8;
  b += arrow(W/2, y, W/2, y+32, MUTED);
  b += clabel(W/2, y+20, "無適當呼吸　或　心率 < 100 次/分", {size:12, fill:INK}); y += 36;

  var B = card(PAD, y, FULL, "B　正壓通氣（PPV）15 秒",
    "甦醒球 40～60 次/分（15 秒約 15 下），接血氧／EKG（貼右手或右耳）。≥35 週用空氣(21%)，<35 週用 21～30% O₂。",
    BLUE);
  b += B.svg; y += B.h + 8;
  b += arrow(W/2, y, W/2, y+32, MUTED);
  b += clabel(W/2, y+20, "心跳無上升／胸部無起伏 → 校正通氣", {size:12, fill:INK}); y += 36;

  var Bc = card(PAD, y, FULL, "校正通氣「擺・吸・漏・壓」→ 再 PPV 30 秒",
    "擺＝重新擺位；吸＝抽吸口鼻；漏＝查面罩漏氣；壓＝加壓給氣。校正後再正壓通氣 30 秒。",
    BLUE, TINT);
  b += Bc.svg; y += Bc.h + 14;
  b += t1(W/2, y, "30 秒後評估心率（每分鐘次數）", {a:"middle", size:13, fill:INK, w:700}); y += 6;

  var gap=12, colW=Math.round((FULL-2*gap)/3);
  var xs=[PAD, PAD+colW+gap, PAD+2*(colW+gap)];
  var cols=[
    {label:"< 60 次", color:RED,
     body:"C：胸部按壓＋100% O₂。壓:吹 = 3:1，每分約 120 次（90 壓＋30 吹），60 秒／30 循環。"},
    {label:"60～99 次", color:AMBER,
     body:"心跳未達 100：再次正壓通氣 15 秒，持續評估心率。"},
    {label:"≥ 100 次", color:GREEN,
     body:"進入復甦後照護，持續監測血氧與呼吸。"}
  ];
  var cardY = y + 22, maxH = 0;
  cols.forEach(function(cd,i){ var c=card(xs[i],cardY,colW,cd.label,cd.body,cd.color); if(c.h>maxH)maxH=c.h; });
  xs.forEach(function(x){ b += arrow(x+colW/2, y+4, x+colW/2, cardY-4, MUTED); });
  cols.forEach(function(cd,i){ b += card(xs[i],cardY,colW,cd.label,cd.body,cd.color,null,maxH).svg; });
  y = cardY + maxH + 12;
  var f = foot(y+8, "口訣：擺吸漏壓（校正通氣）｜壓吹 3:1｜把握黃金一分鐘。", BLUED);
  return svg(f.bottom+16, b + f.svg);
}

/* ====================================================
   第 7 章　常見非外傷急症　流程群
   ==================================================== */
/* 多欄分支列：items=[{label,body,color}]，回傳 {svg,bottom,cx:[中心x]} */
function colRow(y, items){
  var n=items.length, gap=12, colW=Math.round((FULL-(n-1)*gap)/n);
  var xs=[], maxH=0;
  for(var i=0;i<n;i++) xs.push(PAD+i*(colW+gap));
  items.forEach(function(it,i){                       /* 第一遍：量各欄自然高度 */
    var c=card(xs[i],y,colW,it.label,it.body,it.color);
    if(c.h>maxH) maxH=c.h;
  });
  var s="";
  items.forEach(function(it,i){                       /* 第二遍：統一高度重繪，欄底對齊 */
    s+=card(xs[i],y,colW,it.label,it.body,it.color,null,maxH).svg;
  });
  return {svg:s, bottom:y+maxH, cx:xs.map(function(x){return x+colW/2;})};
}

/* 圖 7-2 到院前心臟停止（OHCA） */
function ohcaFlow(){
  var b="",y=16;
  var s1=card(PAD,y,FULL,"現場評估（≤10 秒同時完成）",
    "確認無意識、無適當呼吸（僅喘息視為無效）、頸動脈無脈搏。",BLUE,TINT);
  b+=s1.svg; y+=s1.h+10;
  b+=t1(W/2,y,"是否符合『明顯死亡（DOA）』？",{a:"middle",size:13,fill:INK,w:700}); y+=6;
  var r=colRow(y+22,[
    {label:"是 → 不予送醫",color:RED,
     body:"無意識＋無呼吸＋無脈搏，且有屍腐／屍僵／焦黑／無首／內臟外溢／軀幹斷肢之一。通知警方到場。"},
    {label:"否 → 立即急救",color:GREEN,
     body:"開始高品質 CPR，並儘早使用 AED 去顫。"}
  ]);
  r.cx.forEach(function(cx){ b+=arrow(cx,y+4,cx,y+18,MUTED); });
  b+=r.svg; y=r.bottom+10;
  b+=arrow(r.cx[1],y-4,r.cx[1],y+12,MUTED); y+=16;
  var s3=card(PAD,y,FULL,"建立進階氣道（SGA）＋接 EtCO₂",
    "EtCO₂ < 10 → CPR 品質不佳，立即改善按壓；驟升並維持 ≥ 40 → 疑 ROSC，評估脈搏心律；歸零 → 氣道脫落／阻塞。",BLUE);
  b+=s3.svg; y+=s3.h+8;
  b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s4=card(PAD,y,FULL,"依 AED 指示循環 CPR／去顫 → 通報後送",
    "每 2 分鐘循環評估，依線上醫療指導處置與後送。",BLUE,TINT);
  b+=s4.svg; y+=s4.h+10;
  var f=foot(y+6,"生存之鏈：辨識啟動→CPR→去顫→高級救命→ROSC 後照護→復原。機械按壓（LUCAS）用於長時間／人手不足／行進間。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}

/* 圖 7-6 呼吸困難 */
function dyspneaFlow(){
  var b="",y=16;
  var s1=card(PAD,y,FULL,"初步處置",
    "ABC 評估、必要時給氧、擺位半坐臥（頭高 30°）、監測 SpO₂。",BLUE,TINT);
  b+=s1.svg; y+=s1.h+10;
  b+=t1(W/2,y,"聽診鑑別呼吸音",{a:"middle",size:13,fill:INK,w:700}); y+=6;
  var r=colRow(y+22,[
    {label:"喘鳴 Stridor",color:AMBER,
     body:"吸氣期高調音＝大氣道阻塞（過敏水腫／異物／哮吼）。依因處置：過敏→腎上腺素；異物→哽塞處置。"},
    {label:"哮鳴 Wheezing",color:BLUE,
     body:"吐氣期哨音＝小支氣管痙攣（氣喘／COPD）。清醒且自備 MDI 者，協助吸入短效支氣管擴張劑。"},
    {label:"過度換氣",color:GREEN,
     body:"焦慮致呼吸深快、手足麻痙。安撫、引導深慢呼吸。嚴禁紙袋套口鼻！"}
  ]);
  r.cx.forEach(function(cx){ b+=arrow(cx,y+4,cx,y+18,MUTED); });
  b+=r.svg; y=r.bottom+10;
  b+=arrow(W/2,y-4,W/2,y+12,MUTED); y+=16;
  var s2=card(PAD,y,FULL,"惡化警訊",
    "意識下降或無適當呼吸 → BVM 正壓通氣、準備進階氣道、快速後送並通報。",RED);
  b+=s2.svg; y+=s2.h+10;
  var f=foot(y+6,"重點：半坐臥頭高 30°；過度換氣嚴禁紙袋（易致缺氧猝死）。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}

/* 圖 7-7 低血壓／休克 */
function shockFlow(){
  var b="",y=16;
  var s1=card(PAD,y,FULL,"辨識休克",
    "心率快、收縮壓下降、皮膚濕冷、CRT > 2 秒、意識改變。休克指數 SI = HR ÷ SBP，> 1.0 提示顯著休克。",BLUE,TINT);
  b+=s1.svg; y+=s1.h+8;
  b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s2=card(PAD,y,FULL,"通用處置",
    "平躺、下肢抬高 15～30 公分（胸傷或呼吸喘者除外）；保暖、高濃度氧、控制外出血。孕婦 > 20 週：左側躺或將子宮向左推移。",AMBER);
  b+=s2.svg; y+=s2.h+10;
  b+=t1(W/2,y,"判斷休克型態",{a:"middle",size:13,fill:INK,w:700}); y+=6;
  var r=colRow(y+22,[
    {label:"過敏性休克",color:RED,
     body:"嚴重過敏＋低血壓／呼吸窘迫。腎上腺素注射筆（成人 0.3 mg）於大腿前外側 IM（可隔衣），未改善每 10 分鐘追加。"},
    {label:"其他休克",color:BLUE,
     body:"依 EMT-2 適應症輸液（避免過度灌注），快速後送並持續監測。"}
  ]);
  r.cx.forEach(function(cx){ b+=arrow(cx,y+4,cx,y+18,MUTED); });
  b+=r.svg; y=r.bottom+10;
  var f=foot(y+6,"重點：SI > 1 提示休克；孕婦左側臥；腎上腺素打大腿前外側肌肉。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}

/* 圖 7-11 胸痛 */
function chestPainFlow(){
  var b="",y=16;
  var s1=card(PAD,y,FULL,"初步處置＋病史",
    "監測生命徵象、必要時給氧、OPQRST 問診（壓榨感疑 ACS；撕裂感疑主動脈剝離）。",BLUE,TINT);
  b+=s1.svg; y+=s1.h+8;
  b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s2=card(PAD,y,FULL,"12 導程心電圖",
    "疑似 STEMI／ACS → 儘早通報並直送具心導管（PCI）能力醫院。",BLUE);
  b+=s2.svg; y+=s2.h+10;
  b+=t1(W/2,y,"是否協助含服硝化甘油（NTG）？",{a:"middle",size:13,fill:INK,w:700}); y+=6;
  var r=colRow(y+22,[
    {label:"先查四大禁忌",color:RED,
     body:"① SBP < 90　② HR < 50 或 > 100　③ 24 h 內威而鋼／48 h 內犀利士　④ NTG 過敏。任一存在→不給。"},
    {label:"可給則含服",color:GREEN,
     body:"舌下含片每 5 分鐘 1 顆，最多 3 顆，每次前後再測血壓。"}
  ]);
  r.cx.forEach(function(cx){ b+=arrow(cx,y+4,cx,y+18,MUTED); });
  b+=r.svg; y=r.bottom+10;
  b+=arrow(W/2,y-4,W/2,y+12,MUTED); y+=16;
  var s3=card(PAD,y,FULL,"惡化",
    "出現致命心律不整或心跳停止 → 依 OHCA 流程急救。",AMBER);
  b+=s3.svg; y+=s3.h+10;
  var f=foot(y+6,"重點：NTG 四禁（低血壓／心率過慢過快／PDE-5 抑制劑／過敏）；胸痛送 PCI 醫院。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}

/* ====================================================
   第 8 章　常見外傷　流程群
   ==================================================== */
/* 圖 8-2 外傷出血性休克 */
function traumaShockFlow(){
  var b="",y=16;
  var s1=card(PAD,y,FULL,"XABCDE — 大出血優先",
    "先控制致命外出血（直接加壓 → 止血帶 → 交界處填塞），同時徒手保護頸椎。",BLUE,TINT);
  b+=s1.svg; y+=s1.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s2=card(PAD,y,FULL,"判斷失血性休克",
    "SI = HR÷SBP > 1 提示休克。分級：Ⅰ(<15%) → Ⅱ(15～30%，HR>100、脈壓窄) → Ⅲ(31～40%，SBP↓失代償) → Ⅳ(>40% 瀕死)。代償期血壓可正常，勿被騙。",AMBER);
  b+=s2.svg; y+=s2.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s3=card(PAD,y,FULL,"現場處置",
    "止血、保暖（防致死三聯症：低體溫→凝血病→酸中毒）、許可性低血壓輸液：無腦傷者維持 SBP 80～90；LR 成人首劑 ≤1 L、小兒 20 mL/kg，避免過度輸液。",BLUE);
  b+=s3.svg; y+=s3.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s4=card(PAD,y,FULL,"快速後送外傷中心 ＋ 通報","",BLUE,TINT);
  b+=s4.svg; y+=s4.h+10;
  var f=foot(y+6,"重點：致死三聯症（低溫/凝血/酸中毒）｜許可性低血壓 SBP 80～90｜代償性休克血壓會騙人。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}
/* 圖 8-5 傷口處理 */
function woundCareFlow(){
  var b="",y=16;
  var s1=card(PAD,y,FULL,"① 直接加壓止血","以敷料直接、持續加壓於出血點。",BLUE,TINT);
  b+=s1.svg; y+=s1.h+6; b+=arrow(W/2,y,W/2,y+30,MUTED);
  b+=clabel(W/2,y+19,"出血未止",{size:11,fill:MUTED}); y+=34;
  var s2=card(PAD,y,FULL,"② 止血帶",
    "傷口近心端 5～8 cm（約 4 指幅；位置不明則綁高綁緊）；束帶拉緊服貼後旋緊到出血停止且遠端脈搏消失，固定並記錄時間。到院前不可鬆開；無效則並排上第二條。",RED);
  b+=s2.svg; y+=s2.h+6; b+=arrow(W/2,y,W/2,y+30,MUTED);
  b+=clabel(W/2,y+19,"交界處（鼠蹊／腋下）無法上止血帶",{size:11,fill:MUTED}); y+=34;
  var s3=card(PAD,y,FULL,"③ 傷口填塞",
    "止血紗布以手指深塞至出血骨骼面，填滿後加壓 3 分鐘（一般紗布 10 分鐘）並環形包紮。",AMBER);
  b+=s3.svg; y+=s3.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s4=card(PAD,y,FULL,"④ 骨折固定",
    "固定前後皆評估 CMS（循環/運動/感覺）；夾板須超過骨折上、下兩關節；開放性骨折外露骨頭嚴禁推回。",BLUE);
  b+=s4.svg; y+=s4.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s5=card(PAD,y,FULL,"⑤ 斷肢保存（隔水低溫）",
    "殘肢止血；斷肢以濕紗布包 → 乾塑膠袋密封 → 放入裝冰水混合物的容器；嚴禁直接接觸冰塊或浸泡水中；標記時間隨病患送醫。",BLUE,TINT);
  b+=s5.svg; y+=s5.h+10;
  var f=foot(y+6,"口訣：加壓 → 止血帶 → 填塞 → 固定 → 斷肢隔水低溫保存。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}

/* ====================================================
   第 13 章　環境急症　流程群
   ==================================================== */
/* 圖 13-1 溺水 */
function drowningFlow(){
  var b="",y=16;
  var s1=card(PAD,y,FULL,"確保自身安全、將患者救起評估","",BLUE,TINT);
  b+=s1.svg; y+=s1.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s2=card(PAD,y,FULL,"頸椎處置",
    "溺水頸傷率極低；除非有明確外傷機轉（跳水、滑水道撞擊、落水前車禍）否則不例行固定頸椎。",BLUE);
  b+=s2.svg; y+=s2.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s3=card(PAD,y,FULL,"溺水 OHCA 急救",
    "無呼吸 → 先給 2 次人工呼吸並查頸動脈；摸不到 → 30 次按壓＋2 次人工呼吸（30:2）；摸得到 → 持續人工呼吸。注意抽吸口腔積水（最常見併發症為胃逆流）。",RED);
  b+=s3.svg; y+=s3.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s4=card(PAD,y,FULL,"明顯死亡（免急救）標準",
    "溫水（核心 >6.1°C）無生命徵象且復甦 30 分鐘失敗；冰水（水溫 ≤6.1°C）浸泡超過 60 分鐘。",AMBER);
  b+=s4.svg; y+=s4.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s5=card(PAD,y,FULL,"清醒無症狀者也要送醫",
    "二次溺水（延遲性肺水腫）可能於數小時後發生，務必強力衛教並說服送醫觀察。",GREEN);
  b+=s5.svg; y+=s5.h+10;
  var f=foot(y+6,"重點：無呼吸先給 2 次人工呼吸再依脈搏 CPR｜非外傷機轉不例行固定頸椎｜當心二次溺水。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}
/* 圖 13-2 冷、熱急症 */
function heatColdFlow(){
  var b="",y=16;
  b+=t1(W/2,y,"依環境暴露分兩大類",{a:"middle",size:13,fill:INK,w:700}); y+=6;
  var r=colRow(y+22,[
    {label:"熱急症",color:RED,
     body:"熱痙攣（體溫正常、大汗，補水與電解質）→ 熱衰竭（<40°C、大汗、脈快血壓偏低，移陰涼補液）→ 熱中暑（>40°C＋意識不清，死亡率高）。原則：先快速降溫（冰水浸泡最快，或濕敷搧風）降至 <40°C 再送。"},
    {label:"冷急症",color:BLUE,
     body:"低體溫：輕度 32～35°C（劇烈發抖）→ 中度 28～32°C（發抖停止、意識混亂）→ 重度 <28°C（易 VF）→ <24°C 心停。未回溫不算死亡；脈搏評估至少 30～45 秒；電擊 1 次無效暫緩，待核心 >30°C 再去顫；搬運極輕柔。凍傷用 37～39°C 溫水回溫，勿火烤或搓揉。"}
  ]);
  r.cx.forEach(function(cx){ b+=arrow(cx,y+4,cx,y+18,MUTED); });
  b+=r.svg; y=r.bottom+10;
  var f=foot(y+6,"重點：熱中暑先降溫再送｜發抖停止＝中度低體溫｜「未回溫前不算真正死亡」｜蒸發是高溫時唯一有效散熱。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}
/* 圖 13-11 動物咬螫（毒蛇） */
function snakeBiteFlow(){
  var b="",y=16;
  b+=t1(W/2,y,"臺灣六大常見毒蛇分類",{a:"middle",size:13,fill:INK,w:700}); y+=6;
  var r=colRow(y+22,[
    {label:"出血性",color:RED,
     body:"百步蛇、龜殼花、赤尾鮐（青竹絲）→ 劇痛、大片腫脹瘀血、血泡、凝血異常出血。"},
    {label:"神經性",color:AMBER,
     body:"雨傘節、飯匙倩（眼鏡蛇）→ 眼瞼下垂、吞嚥困難、麻痺、呼吸衰竭。"},
    {label:"混合性",color:BLUE,
     body:"鎖鏈蛇 → 兼具出血＋神經症狀，易急性腎衰竭。"}
  ]);
  r.cx.forEach(function(cx){ b+=arrow(cx,y+4,cx,y+18,MUTED); });
  b+=r.svg; y=r.bottom+10;
  b+=arrow(W/2,y-4,W/2,y+12,MUTED); y+=16;
  var s1=card(PAD,y,FULL,"現場處置（依課本）",
    "保持冷靜、減少活動；患肢維持與心臟同高（不過高或垂墜）、關節屈曲 <45 度；立即卸除戒指手錶等束縛物；每 15 分鐘以黑筆標記腫脹前緣；彈性繃帶由遠端向近端、覆蓋傷口兩側各 10～15 公分＋夾板固定。切勿給予會加速血液循環的酒或藥物。儘速送備有對應抗蛇毒血清之醫院。",BLUE,TINT);
  b+=s1.svg; y+=s1.h+10;
  var f=foot(y+6,"重點：患肢與心臟同高、卸束縛物、每 15 分標記、彈繃固定；切勿飲酒或用藥；送有抗蛇毒血清醫院。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}

/* ====================================================
   第 6 章　病人評估　＋　跨章速查卡
   ==================================================== */
/* 圖 6-5 非外傷通用評估流程 */
function nontraumaAssess(){
  var b="",y=16;
  var s1=card(PAD,y,FULL,"現場安全 ＋ 意識評估（AVPU）",
    "確認現場安全、戴手套。呼喚、輕拍、壓斜方肌或壓指甲床（嚴禁搓胸骨）。",BLUE,TINT);
  b+=s1.svg; y+=s1.h+10;
  b+=t1(W/2,y,"對痛無反應（U）？",{a:"middle",size:13,fill:INK,w:700}); y+=6;
  var r=colRow(y+22,[
    {label:"是 → 查頸動脈＋呼吸 ≤10 秒",color:RED,
     body:"無脈搏無呼吸 → OHCA（CPR＋AED）；有脈搏無適當呼吸 → 打開氣道、給 BVM 人工呼吸。"},
    {label:"否（A／V／P）→ 續 ABC",color:GREEN,
     body:"依 A 呼吸道 → B 呼吸 → C 循環逐項評估與處置。"}
  ]);
  r.cx.forEach(function(cx){ b+=arrow(cx,y+4,cx,y+18,MUTED); });
  b+=r.svg; y=r.bottom+10;
  b+=arrow(r.cx[1],y-4,r.cx[1],y+12,MUTED); y+=16;
  var s2=card(PAD,y,FULL,"ABC 處置要點",
    "A：鼾音壓額抬頦／OPA、痰音抽吸、喘鳴疑喉頭水腫。B：SpO₂ <94% 或窘迫才給氧（NC 1–6／面罩 6–10／NRM 10–15），喘者半坐臥。C：雙側橈脈、CRT >2 秒、休克抬腿（輸液前先聽肺音排除肺水腫）。",BLUE);
  b+=s2.svg; y+=s2.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s3=card(PAD,y,FULL,"輔助檢查 ＋ 病史（主・之・吃・過・藥・敏・感）",
    "血壓血氧常規；血糖（意識改變／中風／冒汗顫抖／抽搐／糖尿病）；12 導程（胸痛胸悶、疑 ACS）。",AMBER);
  b+=s3.svg; y+=s3.h+10;
  b+=t1(W/2,y,"危急度判斷 → 監測頻率",{a:"middle",size:13,fill:INK,w:700}); y+=6;
  var r2=colRow(y+22,[
    {label:"危急個案（五級 1–2）",color:RED,body:"生命徵象不穩／意識不清／休克／急性胸痛或中風：每 2～5 分鐘再評估。"},
    {label:"非危急（五級 3–5）",color:GREEN,body:"生命徵象穩定：每 15 分鐘再評估。"}
  ]);
  r2.cx.forEach(function(cx){ b+=arrow(cx,y+4,cx,y+18,MUTED); });
  b+=r2.svg; y=r2.bottom+10;
  var f=foot(y+6,"與外傷最大差別：外傷『大出血』優先於 A；非外傷先評 AVPU→ABC。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}
/* 速查卡：成人生命徵象與危急個案門檻 */
function vitalsQuickCard(){
  var b="",y=16;
  b+=t1(W/2,y,"成人生命徵象速查",{a:"middle",size:14,fill:BLUED,w:700}); y+=8;
  var r=colRow(y+8,[
    {label:"正常值",color:GREEN,
     body:"意識 GCS 15｜呼吸 12–20／分｜脈搏 60–100／分｜收縮壓 ≥90｜SpO₂ ≥94%｜體溫 36–37.5°C。"},
    {label:"危急個案門檻",color:RED,
     body:"GCS <14｜呼吸 ≥30 或 <10｜脈搏 >150 或 <50｜SBP >220 或 <90｜SpO₂ <90%｜CRT >2 秒｜體溫 >41 或 <32°C。"}
  ]);
  b+=r.svg; y=r.bottom+10;
  var f=foot(y+6,"符合任一危急門檻即屬危急個案（到院前一、二級），每 2～5 分鐘再評估、快速後送。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}

/* ====================================================
   第 11 章　行為急症與精神　流程
   ==================================================== */
/* 圖 11-4 精神疾病救護通用流程 */
function psychFlow(){
  var b="",y=16;
  var s1=card(PAD,y,FULL,"初級評估「叫叫 CABD」",
    "叫團隊（通報警、消、衛生）、叫周邊／叫裝備（淨空疏散、確認防護）；C 認知、A 情緒、B 行為、D 決定降階或約束。",BLUE,TINT);
  b+=s1.svg; y+=s1.h+10;
  b+=t1(W/2,y,"有無立即威脅（持武器／攻擊）？",{a:"middle",size:13,fill:INK,w:700}); y+=6;
  var r=colRow(y+22,[
    {label:"無 → DEFUSE 言語降階",color:GREEN,
     body:"選情境、確保安全與退路、建立信任關係、善用其在乎的事、設界線、隨時再評估。"},
    {label:"有 → 團隊保護性約束",color:RED,
     body:"團隊協同、足夠人力，以控制大關節（肩、膝）為原則。"}
  ]);
  r.cx.forEach(function(cx){ b+=arrow(cx,y+4,cx,y+18,MUTED); });
  b+=r.svg; y=r.bottom+10;
  b+=arrow(r.cx[1],y-4,r.cx[1],y+12,MUTED); y+=16;
  var s2=card(PAD,y,FULL,"四點約束標準",
    "仰躺、床頭抬高 30°；一手過頭、一手過腰、雙下肢固定；約束帶固定於擔架床骨架（嚴禁固定活動床欄）。嚴禁俯臥壓胸背（體位性窒息）、嚴禁塞口。",AMBER);
  b+=s2.svg; y+=s2.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var s3=card(PAD,y,FULL,"現場站位",
    "站門側、勿正對門口；採 L 型／三角站位避免火線交叉；主手交涉、副手警戒並守住退路。",BLUE);
  b+=s3.svg; y+=s3.h+10;
  var f=foot(y+6,"護送就醫依精神衛生法；感覺危險就相信直覺、優先撤離。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}

/* ====================================================
   第 12 章　轉送、轉診　流程
   ==================================================== */
/* 圖 12-5 送醫途中 ＋ 標準化交班 */
function transportHandover(){
  var b="",y=16;
  var s1=card(PAD,y,FULL,"送醫途中",
    "隨車人員全程繫妥安全帶；監測：危急個案每 2～5 分鐘、非危急每 15 分鐘再評估，並持續通報。",BLUE,TINT);
  b+=s1.svg; y+=s1.h+10;
  b+=t1(W/2,y,"抵院結構化交班",{a:"middle",size:13,fill:INK,w:700}); y+=6;
  var r=colRow(y+22,[
    {label:"ISBAR（內科／通用）",color:BLUE,
     body:"I 自我介紹｜S 情況(年齡性別主訴時間)｜B 背景(病史用藥過敏)｜A 評估(生命徵象GCS、ECG、血糖)｜R 建議(啟動導管室／中風團隊)。"},
    {label:"IMIST（創傷專用）",color:AMBER,
     body:"I 身分｜M 傷害機轉｜I 傷型與部位｜S 徵象(GCS、BP、HR、RR、SpO₂)｜T 已做處置(止血帶／長背板／輸液)。"}
  ]);
  r.cx.forEach(function(cx){ b+=arrow(cx,y+4,cx,y+18,MUTED); });
  b+=r.svg; y=r.bottom+10;
  var f=foot(y+6,"內科用 ISBAR、創傷用 IMIST；胸痛／中風先電話通報，讓院方預先啟動團隊。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}

/* ====================================================
   第 18 章　TECC　MARCH 流程
   ==================================================== */
function marchFlow(){
  var b="",y=16;
  var s0=card(PAD,y,FULL,"熱區（直接威脅）",
    "唯一醫療處置＝控制四肢致命大出血，止血帶「綁高綁緊」。嚴禁 CPR／插管／脫防護；善用掩護與掩蔽。",RED);
  b+=s0.svg; y+=s0.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=18;
  b+=t1(W/2,y,"暖區 — MARCH 戰術創傷評估",{a:"middle",size:13,fill:INK,w:700}); y+=10;
  function step(letter,body,color){
    var c=card(PAD,y,FULL,letter,body,color); b+=c.svg; y+=c.h+8;
    b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  }
  step("M　大出血","止血帶（出血點上方 5～8 cm；無效則近心端加第二條）；交界處止血紗布填塞加壓 3 分鐘；疑骨盆骨折合併休克上骨盆固定帶。",RED);
  step("A　呼吸道","清醒取舒適位；無意識推下顎、置鼻咽呼吸道（NPA）；重度阻塞考慮 SGA 或外科環甲膜切開。",AMBER);
  step("R　呼吸","開放性氣胸 → 有導氣孔胸封貼片（或以不具孔貼片／塑膠膜／鋁箔三邊固定）；張力性氣胸（呼吸窘迫＋單側呼吸音消失）→ 針刺減壓。",BLUE);
  step("C　循環","建立 IV／IO；許可性低血壓 SBP 80～90（合併 TBI 維持 100～110）；必要時給止血針劑（TXA／傳明酸）。",BLUE);
  var h=card(PAD,y,FULL,"H　低體溫／頭部外傷",
    "脫濕衣、HPMK 與保暖毯積極保溫（防致死三聯症）；TBI 無脊椎疑慮床頭抬 30°、警惕庫欣三徵；避免使用 NSAID。",BLUE,TINT);
  b+=h.svg; y+=h.h+8; b+=arrow(W/2,y,W/2,y+16,MUTED); y+=20;
  var e=card(PAD,y,FULL,"冷區（EVAC 後送）",
    "全面重新評估；止血帶轉換（受傷 <2 小時且無大動脈出血）；撤退依 PACE（主要／備援／應急／極限）。",BLACK);
  b+=e.svg; y+=e.h+10;
  var f=foot(y+6,"MARCH：大出血 → 氣道 → 呼吸 → 循環 → 低體溫／頭傷。",BLUED);
  return svg(f.bottom+16,b+f.svg);
}

/* ---------- 組裝 ---------- */
function d(t,c,s,q){ return {t:t,c:c,s:s,q:q||null}; }

return {
  "ch_01":[ d("藍色生命之星六角意義",
      "六角依順時針排列，是院前救護從發現到確切治療的完整流程。",starOfLife()) ],
  "ch_02":[
    d("腦部分區與功能","延腦是生命中樞，腦幹三構造的分工是最常出現的考點。",brain()),
    d("動脈觸摸點與收縮壓推估","摸不到橈動脈時立即改摸頸動脈，可快速判斷休克程度。",pulsePoints()),
    d("格拉斯哥昏迷指數 GCS","運動反應分數最高也最容易混淆，去皮質與去大腦要分清楚。",gcs(),{gcs:true})
  ],
  "ch_03":[ d("事故現場車輛停放與警示距離",
      "防撞車在後、救護車在前，是現場安全工作區的基本配置。",sceneParking()) ],
  "ch_t04":[ d("到院前檢傷程序：三級初判 → 五級確認",
      "現場以三級快速分流，送醫前以五級確認；一級病人直接判定不檢索。",triageFlow(),{order:["現場評估","三級檢傷初判分流","一級直接判、二級記時間急症","送醫前以五級確認"]}) ],
  "ch_04":[
    d("各年齡層 CPR 規範對照","深度、壓吹比與按壓手法的差異是必考重點。",cprTable()),
    d("呼吸道異物哽塞處置","拳頭放在肚臍上緣、劍突下方，方向是向內向上。",heimlich()),
    d("戰術止血帶施打位置","位置、緊度、時間記錄三者缺一不可。",tourniquet())
  ],
  "ch_05":[ d("外傷評估流程 XABCDE",
      "大量外出血優先於一切，這是外傷與內科評估最大的差別。",xabcde(),{order:["X 控制致命大出血","A 呼吸道","B 呼吸","C 循環","D 失能（意識/瞳孔）","E 暴露、保暖"]}),
      d("非外傷評估流程（圖 6-5）",
      "AVPU 意識 → 對痛無反應查頸脈呼吸 → ABC 處置 → 輔助檢查病史 → 依危急度定監測頻率。",nontraumaAssess(),{order:["現場安全＋AVPU 意識評估","對痛無反應→查頸動脈與呼吸","ABC 逐項處置","輔助檢查＋病史","依危急度決定監測頻率"]}),
      d("生命徵象與危急個案門檻速查",
      "正常值 vs 危急門檻對照；符合任一危急門檻＝到院前一、二級。",vitalsQuickCard()) ],
  "ch_06":[ d("12 導程心電圖胸前導極位置",
      "先定 V1、V2 與 V4，再補 V3，最後 V5、V6 與 V4 同水平。",ecg12()),
      d("到院前心臟停止 OHCA 流程（圖 7-2）",
      "現場判斷 DOA → 否則立即 CPR＋AED → SGA 接 EtCO₂ 監測品質與 ROSC → 循環後送。",ohcaFlow(),{order:["現場評估（≤10 秒）","判斷是否明顯死亡 DOA","立即 CPR＋AED","建立 SGA 接 EtCO₂","依 AED 循環後送"],fill:[{q:"EtCO₂ ＜ [ ] → CPR 品質不佳",opts:["10","20","30"],a:"10"},{q:"EtCO₂ 驟升並維持 ≥ [ ] → 疑 ROSC",opts:["20","30","40"],a:"40"}]}),
      d("呼吸困難處置流程（圖 7-6）",
      "給氧＋半坐臥後聽診鑑別：喘鳴(大氣道)／哮鳴(氣喘COPD)／過度換氣；惡化則正壓通氣。",dyspneaFlow(),{order:["初步處置（給氧、半坐臥）","聽診鑑別呼吸音","依病因處置（喘鳴／哮鳴／過度換氣）","惡化→BVM 正壓通氣"]}),
      d("低血壓／休克流程（圖 7-7）",
      "SI>1 辨識休克 → 抬腿保暖給氧 → 過敏性休克打腎上腺素、其他依適應症輸液快送。",shockFlow(),{order:["辨識休克（SI＞1）","通用處置（抬腿、保暖、給氧）","判斷休克型態","過敏性休克打腎上腺素／其他輸液快送"]}),
      d("胸痛處置流程（圖 7-11）",
      "OPQRST＋12 導程 → 疑 STEMI 送 PCI；NTG 前先查四大禁忌；惡化依 OHCA。",chestPainFlow(),{order:["初步處置＋病史 OPQRST","12 導程心電圖","疑 STEMI→送 PCI 醫院","含服 NTG 前查四禁","惡化依 OHCA"],fill:[{q:"NTG 禁忌：SBP ＜ [ ]",opts:["90","100","110"],a:"90"},{q:"NTG 禁忌：心率 ＜ 50 或 ＞ [ ]",opts:["100","120","150"],a:"100"}]}) ],
  "ch_07":[ d("燒燙傷面積九則定律",
      "成人與兒童的頭頸與下肢比例不同，這是最常見的陷阱題。",ruleOfNines()),
      d("外傷出血性休克流程（圖 8-2）",
      "大出血優先止血 → 判斷休克分級 → 保暖＋許可性低血壓輸液 → 快送外傷中心。",traumaShockFlow(),{order:["XABCDE 大出血優先","判斷失血性休克分級","止血、保暖＋許可性低血壓輸液","快速後送外傷中心"]}),
      d("傷口處理流程（圖 8-5）",
      "加壓 → 止血帶 → 交界處填塞 → 骨折固定(CMS) → 斷肢隔水低溫保存。",woundCareFlow(),{order:["直接加壓","止血帶","交界處填塞","骨折固定（CMS）","斷肢隔水低溫保存"]}) ],
  "ch_08":[ d("小兒評估三角 PAT",
      "三個維度的組合可直接推出臨床臆斷，全異常即為心肺衰竭。",pat()),
      d("新生兒復甦救護流程（圖 9-5）",
      "黃金一分鐘：初評→A 初步處置→B 正壓通氣→校正→依心率分流；口訣「擺吸漏壓、壓吹 3:1」。",neonatalResus(),{order:["出生初評（足月／肌張力／呼吸）","初步處置（擦乾保暖刺激擺位）","正壓通氣 PPV 15 秒","通氣校正（擺吸漏壓）","依心率分流"]}) ],
  "ch_10":[ d("精神疾病救護通用流程（圖 11-4）",
      "叫叫 CABD 初評 → 有無立即威脅 → DEFUSE 降階或團隊約束 → 四點約束標準 → 站位安全。",psychFlow(),{order:["叫叫 CABD 初評","判斷有無立即威脅","DEFUSE 降階或團隊約束","四點約束標準","現場站位安全"]}) ],
  "ch_11":[ d("送醫途中與標準化交班（圖 12-5）",
      "途中監測頻率＋安全帶；抵院交班 內科用 ISBAR、創傷用 IMIST。",transportHandover(),{order:["送醫途中監測＋繫安全帶","抵院結構化交班（ISBAR／IMIST）"]}) ],
  "ch_17":[ d("TECC 三階段與 MARCH 流程",
      "熱區只止血 → 暖區 MARCH（大出血/氣道/呼吸/循環/低體溫頭傷）→ 冷區重評估與 PACE 後送。",marchFlow(),{order:["熱區：止血帶綁高綁緊","M 大出血","A 呼吸道","R 呼吸","C 循環","H 低體溫／頭部外傷","冷區：重評估、PACE 後送"]}) ],
  "ch_12":[ d("溺水急症流程（圖 13-1）",
      "救起評估 → 非外傷機轉不例行固定頸椎 → OHCA 先給 5 次人工呼吸再 CPR → DOA 標準 → 當心二次溺水。",drowningFlow(),{order:["確保安全、救起評估","依外傷機轉決定頸椎固定","OHCA：先給 2 次人工呼吸再依脈搏 CPR","判斷明顯死亡 DOA 標準","清醒無症狀也送醫（二次溺水）"]}),
      d("冷、熱急症流程（圖 13-2）",
      "熱急症：熱痙攣→熱衰竭→熱中暑（>40°C 先降溫再送）；冷急症：低體溫分級，未回溫不算死亡。",heatColdFlow()),
      d("毒蛇咬傷處置（圖 13-11）",
      "六大毒蛇分出血性／神經性／混合性；患肢放低、彈繃固定；五大嚴禁；送有抗蛇毒血清醫院。",snakeBiteFlow()) ],
  "ch_13":[ d("直升機停機坪安全進出方位",
      "機頭與機尾都是致命禁區，只能從正側方在引導下進出。",helipad()) ],
  "ch_14":[ d("化災現場三區劃分",
      "指揮站永遠設在上風、上坡、上游處。",hazmatZones()) ],
  "ch_15":[
    d("START 成人簡易檢傷流程","任何一項異常就是紅色，全部正常才是黃色。",start()),
    d("四色檢傷分類標準","顏色代表處置順序，不是傷勢嚴重度的絕對排序。",triageColors())
  ]
};
})();
