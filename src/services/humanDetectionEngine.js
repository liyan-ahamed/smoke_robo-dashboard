const neighbors=[[1,0],[-1,0],[0,1],[0,-1]];
function components(frame, predicate) {
  const seen=new Set(), groups=[];
  for(let y=0;y<8;y++) for(let x=0;x<8;x++) {
    const key=y*8+x;
    if(seen.has(key)||!predicate(frame[y][x],x,y)) continue;
    const queue=[[x,y]], cells=[]; seen.add(key);
    while(queue.length) {
      const [cx,cy]=queue.shift(); cells.push([cx,cy]);
      for(const [dx,dy] of neighbors) { const nx=cx+dx,ny=cy+dy,nk=ny*8+nx; if(nx>=0&&nx<8&&ny>=0&&ny<8&&!seen.has(nk)&&predicate(frame[ny][nx],nx,ny)){seen.add(nk);queue.push([nx,ny]);} }
    }
    groups.push(cells);
  }
  return groups;
}
function region(cells) {
  const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]);
  return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs)+1,height:Math.max(...ys)-Math.min(...ys)+1,cx:xs.reduce((a,b)=>a+b,0)/cells.length,cy:ys.reduce((a,b)=>a+b,0)/cells.length,area:cells.length};
}
export function analyzeThermalFrame(frame, previous={humans:[],lastMovement:null,nextId:1}, timestamp=Date.now()) {
  if(!frame?.length) return {humans:[],hotspots:[],lastMovement:previous.lastMovement,nextId:previous.nextId||1};
  const background=frame.flat().filter(v=>v<42).sort((a,b)=>a-b);
  const baseline=background[Math.floor(background.length*.25)] ?? 28;
  const hotspots=components(frame,v=>v>=48).filter(c=>c.length>=1).map(region);
  const candidates=components(frame,v=>v>=32.5 && v<=41.5 && v>=baseline+2.1)
    .filter(c=>c.length>=2 && c.length<=14).map(region);
  let nextId=previous.nextId||1;
  const used=new Set(); let lastMovement=previous.lastMovement;
  const humans=candidates.map(candidate=>{
    let match=null, distance=Infinity;
    for(const old of previous.humans||[]) { const d=Math.hypot(old.cx-candidate.cx,old.cy-candidate.cy); if(!used.has(old.id)&&d<distance&&d<=2.2){match=old;distance=d;} }
    if(match) used.add(match.id);
    const moved=!!match && distance>.32;
    if(moved) lastMovement=timestamp;
    return {...candidate,id:match?.id??nextId++,moving:moved,trail:[...(match?.trail||[]),{x:candidate.cx,y:candidate.cy}].slice(-12),direction:candidate.cx<2.7?'Left':candidate.cx>4.7?'Right':'Center'};
  });
  return {humans,hotspots,lastMovement,nextId,lastDetection:humans.length?timestamp:previous.lastDetection||null};
}
