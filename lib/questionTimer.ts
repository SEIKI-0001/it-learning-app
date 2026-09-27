/** Foreground time only; an unattended question cannot accumulate hours. */
export class QuestionTimer {
  private active: {id:string;since:number}|null=null;
  private elapsed=new Map<string,number>();
  private answered=new Set<string>();
  show(id:string,now:number){this.pause(now);if(!this.answered.has(id)){this.active={id,since:now};if(!this.elapsed.has(id))this.elapsed.set(id,0);}}
  pause(now:number){if(!this.active)return;const {id,since}=this.active;this.elapsed.set(id,Math.min(300000,(this.elapsed.get(id)??0)+Math.max(0,now-since)));this.active=null;}
  answer(id:string,now:number){this.pause(now);this.answered.add(id);return this.seconds(id);}
  seconds(id:string):number|null {const value=this.elapsed.get(id);return value===undefined?null:Math.round(value/1000);}
}
