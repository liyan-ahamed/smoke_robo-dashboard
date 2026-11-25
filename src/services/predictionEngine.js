export function linearRegression(points) {
  if (points.length < 5) return null;
  const x0 = points[0].timestamp;
  const xs = points.map(p => (p.timestamp-x0)/1000);
  const meanX = xs.reduce((a,b)=>a+b,0)/xs.length;
  const meanY = points.reduce((a,p)=>a+p.value,0)/points.length;
  const denom = xs.reduce((a,x)=>a+(x-meanX)**2,0);
  if (denom < .001) return null;
  const slope = xs.reduce((a,x,i)=>a+(x-meanX)*(points[i].value-meanY),0)/denom;
  const intercept = meanY-slope*meanX;
  return {slope, predict: seconds => intercept+slope*seconds, elapsed:xs.at(-1)};
}
export function calculatePredictions(history) {
  const recent=history.slice(-30);
  const result={};
  for(const key of ['ambient','internal','co']) {
    const model=linearRegression(recent.map(p=>({timestamp:p.timestamp,value:p[key]})));
    result[key]=model ? {value:Math.max(0,model.predict(model.elapsed+30)), slope:model.slope} : null;
  }
  const internal=result.internal;
  result.timeToLimit=internal?.slope > .025 && history.at(-1)?.internal < 50 ? Math.max(0,(50-history.at(-1).internal)/internal.slope) : null;
  return result;
}
export function classifyRisk(reading, predictions, detection, thresholds) {
  if(!reading) return 'Low';
  let score=0;
  if(reading.ambient>=thresholds.ambientCritical || reading.internal>=50 || reading.co>=thresholds.coCritical) score+=4;
  else if(reading.ambient>=thresholds.ambientWarning || reading.internal>=thresholds.internalWarning || reading.co>=thresholds.coWarning) score+=2;
  if(predictions.ambient?.slope>.12 || predictions.co?.slope>.3) score++;
  if(predictions.timeToLimit!==null && predictions.timeToLimit<90) score+=2;
  if(detection?.humans?.length) score++;
  return score>=5?'Critical':score>=3?'High':score>=1?'Moderate':'Low';
}
