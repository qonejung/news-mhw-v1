import {now} from './shared.js';
/** Reading/review telemetry: elapsed/visible time, paragraph exposure, scroll, revisit logs.
 * Kept separate from the survey controller to make data collection auditable.
 */
export function createReadingTracker(ctx) {
  const {root,articleForCurrent,makeVisit,persist,event,getReadiness,allowedToContinue}=ctx;
  let observer=null, lastTick=performance.now(), lastScrollSample=-Infinity;
  const resetClock=()=>{lastTick=performance.now()};

  function tickTime(){
    const state=ctx.getState();
    const stamp=performance.now(), delta=Math.max(0,Math.min(1500,stamp-lastTick));lastTick=stamp;
    if(state && ((state.phase==='reading')||(state.phase==='rating'&&state.ratingTab==='article'))){
      // During evaluation, returning to the article counts as a distinct review visit.
      // Until the evaluation is submitted, the active reading visit remains resumable.
      if(state.phase==='rating' && state.reviewSession){
        const review=state.reviewSession;
        review.elapsedMs=Date.now()-Date.parse(review.openedAt);
        if(document.visibilityState==='visible'&&!state.settingsOpen)review.visibleMs+=delta;
      }
      if(!state.visit)return;
      state.visit.elapsedMs=Math.max(0,Date.now()-Date.parse(state.visit.openedAt));
      if(document.visibilityState==='visible' && !state.settingsOpen){state.visit.visibleMs+=delta;}
      const t=document.querySelector('[data-visible-time]');if(t)t.textContent=`${Math.floor(state.visit.visibleMs/1000)}s`;
      const req=document.querySelector('[data-time-requirement]');if(req){const ready=getReadiness().time;req.classList.toggle('requirement-line--done',ready);req.querySelector('.requirement-bullet').textContent=ready?'✓':'·';}
      const btn=document.querySelector('[data-action="to-rating"]');if(btn)btn.disabled=!allowedToContinue();
      if(stamp%5000<400)persist();
    }
  }

  function watchParagraphs(){
    const state=ctx.getState();
    if(observer){observer.disconnect();observer=null;}
    if(!((state.phase==='reading')||(state.phase==='rating'&&state.ratingTab==='article'))||!state.visit||typeof IntersectionObserver==='undefined')return;
    observer=new IntersectionObserver(entries=>{
      if(!((state.phase==='reading')||(state.phase==='rating'&&state.ratingTab==='article'))||!state.visit||state.settingsOpen)return;
      entries.forEach(entry=>{
        if(entry.isIntersecting){const i=Number(entry.target.dataset.paragraph);
          if(!state.visit.paragraphsSeen.some(x=>x.paragraphIndex===i)){
            const rec={paragraphIndex:i, at:now(), visibleTimeMs:Math.round(state.visit.visibleMs)};
            state.visit.paragraphsSeen.push(rec);event('paragraph_visible',rec);persist(true);
          }
        }
      });
    },{threshold:.15});
    root.querySelectorAll('[data-paragraph]').forEach(el=>observer.observe(el));
  }

  function scrollRecord(){
    const state=ctx.getState();
    if(!state||state.settingsOpen)return;
    const articleVisible=state.phase==='reading'||(state.phase==='rating'&&state.ratingTab==='article');
    const isReading=articleVisible&&!!state.visit;
    const isReview=state.phase==='rating'&&state.ratingTab==='article'&&!!state.reviewSession;
    if(!isReading&&!isReview)return;
    const visit=isReview?state.reviewSession:state.visit;
    const top=window.scrollY,range=Math.max(1,document.documentElement.scrollHeight-window.innerHeight),percent=Math.min(100,Math.max(0,100*top/range));
    visit.maxScrollPercent=Math.max(visit.maxScrollPercent,percent);
    if(isReview&&state.visit)state.visit.maxScrollPercent=Math.max(state.visit.maxScrollPercent,percent);
    const stamp=performance.now();if(stamp-lastScrollSample<420)return;
    lastScrollSample=stamp;
    const last=visit.scrollSamples.at(-1),dir=!last?'none':top>last.scrollTop?'down':top<last.scrollTop?'up':'still';
    if(visit.scrollSamples.length<600){visit.scrollSamples.push({at:now(), visibleTimeMs:Math.round(visit.visibleMs), scrollTop:Math.round(top), scrollPercent:Math.round(percent*10)/10, direction:dir});}
    event(isReview?'article_review_scroll':'scroll',{scrollPercent:Math.round(percent*10)/10,direction:dir});
  }

  function startReview(){
    const state=ctx.getState();
    if(state.reviewSession)return;
    state.reviewSession={articleId:articleForCurrent().id,openedAt:now(),closedAt:null,visibleMs:0,elapsedMs:0,maxScrollPercent:0,scrollSamples:[]};
    lastTick=performance.now();
    event('article_review_open',{articleId:articleForCurrent().id});persist(true);
  }

  function stopReview(){
    const state=ctx.getState();
    if(!state.reviewSession)return;
    tickTime();
    state.reviewSession.closedAt=now();
    state.reviewSession.elapsedMs=Date.now()-Date.parse(state.reviewSession.openedAt);
    state.reviewVisits.push(state.reviewSession);
    event('article_review_close',{articleId:state.reviewSession.articleId,visibleMs:Math.round(state.reviewSession.visibleMs)});
    state.reviewSession=null;persist(true);
  }

  function openFirstVisit(){
    const state=ctx.getState();state.ratingTab='article';state.visit=makeVisit(articleForCurrent());lastTick=performance.now();event('article_open',{articleId:articleForCurrent().id});persist(true);}

  function recordVisitDone(){
    const state=ctx.getState();
    tickTime();const v=state.visit;v.completedAt=now();v.status='reading_completed';v.elapsedMs=Date.now()-Date.parse(v.openedAt);v.requirementsAtCompletion={...state.requirements};v.maxScrollPercent=Math.round(v.maxScrollPercent*10)/10;
    state.readingVisits.push(JSON.parse(JSON.stringify(v)));
    event('article_reading_completed',{visibleMs:Math.round(v.visibleMs), maxScrollPercent:v.maxScrollPercent});
    state.visit=null;
  }

  return {tickTime,watchParagraphs,scrollRecord,startReview,stopReview,
    openFirstVisit,recordVisitDone,resetClock};
}
