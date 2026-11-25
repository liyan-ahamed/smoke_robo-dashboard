// Replace this interface with an ESP32/WebSocket telemetry source when hardware is available.
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const noise = (scale) => (Math.random() - .5) * scale;
export const ENVIRONMENTS = ['Normal monitoring','Increasing fire intensity','Rising carbon monoxide','Robot overheating','Low battery','Weak wireless connection','Wireless connection loss'];
export const HUMANS = ['No human candidate','Moving person','Stationary person','Multiple persons'];

export class VirtualESP32 {
  constructor() { this.reset(); }
  reset() { this.tick = 0; this.ambient = 27; this.internal = 31; this.co = 8; this.battery = 100; this.wifi = -52; this.motor = true; this.shutdown = false; }
  next(environment, humanScenario) {
    if (this.shutdown) return null;
    this.tick++;
    const target = {
      ambient: environment === 'Increasing fire intensity' ? 75 : environment === 'Robot overheating' ? 43 : 28,
      internal: environment === 'Robot overheating' ? 58 : environment === 'Increasing fire intensity' ? 47 : 32,
      co: environment === 'Rising carbon monoxide' ? 240 : environment === 'Increasing fire intensity' ? 105 : 12,
      wifi: environment === 'Wireless connection loss' ? -105 : environment === 'Weak wireless connection' ? -87 : -52,
    };
    const approach = (value, goal, rate, jitter) => value + clamp((goal-value)*rate, -1.2, 1.2) + noise(jitter);
    this.ambient = clamp(approach(this.ambient,target.ambient,.023,.15),20,100);
    this.internal = clamp(approach(this.internal,target.internal,.025,.10),22,65);
    this.co = clamp(approach(this.co,target.co,.027,.7),0,400);
    this.wifi = clamp(approach(this.wifi,target.wifi,.14,2),-110,-35);
    this.battery = clamp(this.battery - (environment === 'Low battery' ? .85 : .022), 0, 100);
    return { timestamp: Date.now(), ambient: +this.ambient.toFixed(1), internal: +this.internal.toFixed(1), co: +this.co.toFixed(1), battery: +this.battery.toFixed(1), wifi: Math.round(this.wifi), thermal: generateThermalFrame(this.ambient, this.tick, humanScenario, environment), status: this.motor ? 'Operational' : 'Motors stopped' };
  }
  emergencyShutdown() { this.motor = false; this.shutdown = true; }
}

function generateThermalFrame(ambient, tick, humanScenario, environment) {
  // The camera's background is cooler than localized heat sources in this demo scene.
  const base = Math.min(ambient, 31.5);
  const frame = Array.from({length:8}, (_,y) => Array.from({length:8},(_,x) => +(base + Math.sin(x*.8+y*.5+tick*.08)*.45 + noise(.55)).toFixed(1)));
  const blob = (cx,cy,temp,radius=1.15) => {
    for(let y=0;y<8;y++) for(let x=0;x<8;x++) {
      const d=Math.hypot(x-cx,y-cy);
      if(d<radius) frame[y][x]=+(temp-(d/radius)*2+noise(.5)).toFixed(1);
    }
  };
  if (environment === 'Increasing fire intensity' || environment === 'Robot overheating') blob(6.5,1,Math.max(58,ambient+15),1.55);
  if (humanScenario === 'Moving person') blob(1.2+(tick%22)/4.5,4.7+Math.sin(tick*.3)*.25,36.6,1.5);
  if (humanScenario === 'Stationary person') blob(3.2,5.1,36.5,1.6);
  if (humanScenario === 'Multiple persons') { blob(1.5+Math.sin(tick*.19)*.45,4.7,36.7,1.4); blob(5.5,5.2,36.4,1.45); }
  return frame;
}
