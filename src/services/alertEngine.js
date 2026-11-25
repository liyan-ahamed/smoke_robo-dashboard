const rule=(id,title,description,severity,value,active)=>({id,title,description,severity,value,active});
export function evaluateAlerts(reading, predictions, detection, history, thresholds) {
  if(!reading) return [];
  const prior=history.at(-Math.min(history.length,12));
  const ambientRise=prior && reading.ambient-prior.ambient>1.8;
  const coRise=prior && reading.co-prior.co>7;
  return [
    rule('ambient-rise','Ambient temperature increasing','Sustained temperature rise in the monitored environment.','warning',`${reading.ambient} °C`,ambientRise),
    rule('co-rise','Carbon monoxide rising','CO concentration is climbing across recent readings.','warning',`${reading.co} ppm`,coRise),
    rule('human','Possible human candidate','Thermal pattern consistent with a simulated human candidate.','warning',`${detection.humans.length} candidate(s)`,detection.humans.length>0),
    rule('stationary','Stationary human candidate','A thermal candidate remains in view without observed movement.','warning',`${detection.humans.filter(h=>!h.moving).length} candidate(s)`,detection.humans.some(h=>!h.moving)),
    rule('hotspot','Thermal hotspot detected','High-temperature region found in the thermal frame.','critical',`${detection.hotspots.length} hotspot(s)`,detection.hotspots.length>0),
    rule('battery','Low battery','Battery reserve is below the demonstration threshold.','warning',`${reading.battery}%`,reading.battery<=thresholds.batteryWarning),
    rule('wifi','Weak Wi-Fi signal','Wireless signal may become unreliable.','warning',`${reading.wifi} dBm`,reading.wifi<=thresholds.wifiWarning&&reading.wifi>-95),
    rule('connection','Wireless connection loss','Simulated telemetry link is unavailable.','critical',`${reading.wifi} dBm`,reading.wifi<=-95),
    rule('overheat-prediction','Predicted robot overheating','Current linear trend reaches 50°C within 90 seconds.','critical',predictions.timeToLimit==null?'—':`${Math.ceil(predictions.timeToLimit)} s`,predictions.timeToLimit!==null&&predictions.timeToLimit<=90),
    rule('internal-critical','CRITICAL INTERNAL HEAT — RETRIEVE BOT','Motor stopped; final thermal frame transmitted; simulated safe shutdown initiated.','critical',`${reading.internal} °C`,reading.internal>=50)
  ].filter(x=>x.active);
}
export function mergeAlerts(existing, active, timestamp, lastFired) {
  const next={...lastFired}; const additions=[];
  for(const alert of active) if(!next[alert.id] || timestamp-next[alert.id]>=30000) {
    next[alert.id]=timestamp; additions.push({...alert,timestamp,uid:`${alert.id}-${timestamp}`});
  }
  return {alerts:[...additions,...existing].slice(0,200),lastFired:next};
}
