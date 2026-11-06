/** CSS Media article survey controller (framework-free static site).
 *
 * Editable content: /data/*.json. Runtime config: /config/study-config.json.
 * UI templates: /assets/views.js. Persistence and event log remain browser-local.
 */
import {icon,esc,now,sentenceSegments} from './shared.js';
import {getStored,STORAGE_KEY,makeVisit as createVisit,cleanRequirements,
  freshState as createFreshState,getReadiness as computeReadiness} from './state.js';
import {loadStudyData,validateQuestions,chooseArticles as selectArticles} from './data.js';
import {createViews} from './views.js';
import {createReadingTracker} from './tracking.js';

(() => {
  'use strict';
  const root=document.getElementById('app');
  const byId={};
  let articles=[],newsSets=[],newsSetMap=new Map(),studyConfig={},activeNewsSetId=null,state;
  let ARTICLE_QUESTIONS=[],BACKGROUND_QUESTIONS=[];
  let timerHandle,lastSave=0,renderedViewKey=null;

  const views=createViews({
    icon,esc,sentenceSegments,articleForCurrent,getReadiness,allowedToContinue,
    canSubmitArticleEvaluation,canSubmitBackground,
    getState:()=>state,getArticles:()=>articles,getNewsSets:()=>newsSets
  });

  const tracker=createReadingTracker({
    root, getState:()=>state, articleForCurrent, makeVisit,
    persist, event, getReadiness, allowedToContinue
  });
  const {tickTime,watchParagraphs,scrollRecord,startReview,stopReview,
    openFirstVisit,recordVisitDone}=tracker;

  function makeVisit(article){return createVisit(article,state.newsSetId,state.requirements);}
  function freshState(){return createFreshState(studyConfig,articles,activeNewsSetId);}
  function getReadiness(){return computeReadiness(state);}
  function chooseArticles(setId,preferredOrder=null){
    return selectArticles(setId,{newsSetMap,newsSets,byId,studyConfig},preferredOrder);
  }

  // Local-only storage; throttling avoids serializing the full event log on every scroll.
  function persist(force = false) {
    const t = Date.now();
    if (!force && t-lastSave < 1300) return;
    lastSave = t;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) { console.warn('Local save failed',err); }
  }

  // Central event schema keeps article ID, stage, and news-set ID attached to actions.
  function event(type, details = {}) {
    state.events.push({ at:now(), type, phase:state.phase, newsSetId:state.newsSetId, articleId:articles[state.index]?.id || null, ...details });
    if (state.events.length > 5000) state.events.splice(0,state.events.length-5000);
    persist();
  }

  function articleForCurrent(){ return articles[state.index]; }

  function allowedToContinue(){return Object.values(getReadiness()).every(Boolean);}

  // Reading time counts only when the browser tab is visible and settings are closed.


  function articleAnswersComplete(){return ARTICLE_QUESTIONS.every(q=>!!state.draftRatings[q.id]);}

  function canSubmitArticleEvaluation(){return (state.allowIncompleteResponses || articleAnswersComplete()) && allowedToContinue();}

  function backgroundComplete(){return BACKGROUND_QUESTIONS.every(q=>!!state.background[q.id]) && (state.background.gender!=='3'||!!String(state.background.genderText||'').trim());}

  function canSubmitBackground(){return state.allowIncompleteResponses || backgroundComplete();}

  // Render the current screen while preserving the independent article/evaluation scroll offsets.
  function render(progressToTop = false){
    if(!state)return;
    const cur=state.index+1,total=articles.length,step=state.phase;
    const n= step==='background'||step==='complete'?total:cur;
    const percentage= step==='intro'?0:step==='background'||step==='complete'?100:((state.index+(step==='rating'?.5:0))/total)*100;
    const sub=step==='intro'?'Getting started':step==='reading'?'Read the article':step==='rating'?(state.ratingTab==='article'?'Review the article':'Evaluate the article'):step==='background'?'Background information':'Completed';
    if(renderedViewKey)state.scrollPositions[renderedViewKey]=window.scrollY;
    const nextKey = screenKey();
    root.innerHTML=`<div class="site-wrap">
      <header class="header"><div class="header__identity"><div class="header__name">CSS Media</div><div class="header__domain">${icon('globe',12)} cssmedia.example</div></div><button class="icon-btn header__settings" data-action="settings" aria-label="Prototype settings" title="Prototype settings">${icon('dots',23)}</button></header>
      <div class="progress-band"><div class="progress-band__row"><span class="eyebrow">${step==='intro'?'Introduction':step==='background'?'Background questions':step==='complete'?'Completed':'Article reading'}</span><span class="article-counter">${step==='intro'?`${total} articles`:step==='background'?'All articles read':step==='complete'?'Finished':`Article ${n} of ${total}`}</span></div>
      <div class="progress-title">${sub}</div><div class="progress-track"><div class="progress-fill" style="width:${percentage}%"></div></div></div>
      ${(step==='reading'||step==='rating')?views.renderViewTabs():''}
      ${step==='intro'?views.renderIntro():step==='reading'?views.renderArticle():step==='rating'?(state.ratingTab==='article'?views.renderArticle(true):views.renderRating()):step==='background'?views.renderBackground():views.renderComplete()}
      
    </div>${views.renderSettings()}`;
    document.body.classList.toggle('modal-open',state.settingsOpen);
    renderedViewKey=nextKey;
    const wanted=progressToTop?0:(state.scrollPositions[nextKey]||0);
    window.scrollTo({top:wanted,behavior:'instant'});
    const head=root.querySelector('.header'), progress=root.querySelector('.progress-band');
    if(head&&progress)document.documentElement.style.setProperty('--progress-bottom',`${head.offsetHeight+progress.offsetHeight}px`);
    watchParagraphs();
    tickTime();
  }

  function screenKey(){
    if(state.phase==='reading')return `reading:${state.index}`;
    if(state.phase==='rating')return `rating:${state.index}:${state.ratingTab||'evaluation'}`;
    return state.phase;
  }

  // Exposure logging observes visible paragraphs; visibility does not prove comprehension.




  // Revisits during evaluation are stored separately from the initial article reading.






  function toggleHighlight(key){
    if(!state.requirements.highlightEnabled)return;
    const [pi,si]=key.split(':').map(Number),a=articleForCurrent(),sentence=sentenceSegments(a.body[pi])[si];if(!sentence)return;
    const v=state.visit;const existing=v.highlights.findIndex(x=>x.key===key);
    if(existing>=0){v.highlights.splice(existing,1);v.highlightEvents.push({action:'remove', key, at:now()});event('highlight_remove',{key});}
    else if(v.highlights.length<2){const h={key, paragraphIndex:pi, sentenceIndex:si, text:sentence};v.highlights.push(h);v.highlightEvents.push({action:'add', ...h, at:now()});event('highlight_add',h);}
    else {root.querySelector('.tip-count').textContent='Two already selected · Tap one to remove it';return;}
    persist(true);render();
  }



  // Commit this article's answers before advancing so a partial draft cannot leak to the next article.
  function submitRating(){
    tickTime();
    if(!canSubmitArticleEvaluation())return;
    if(state.reviewSession)stopReview();
    if(state.visit)recordVisitDone();
    const a=articleForCurrent();const responses={};ARTICLE_QUESTIONS.forEach(q=>{
      const raw=state.draftRatings[q.id];const selected=raw?Number(raw):null;responses[q.id]={value:selected, label:selected===null?null:q.options[selected-1]};
    });
    const reading=state.readingVisits.findLast(v=>v.articleId===a.id);
    state.ratings[a.id]={articleId:a.id,coreId:a.coreId,condition:a.condition,newsSetId:state.newsSetId,title:a.title,submittedAt:now(), allowIncompleteResponses:state.allowIncompleteResponses, responses,readingVisibleMs:reading?.visibleMs??null};
    event('article_evaluation_submitted',{articleId:a.id});state.draftRatings={};state.ratingTab='article';
    if(state.index+1<articles.length){state.index+=1;state.phase='reading';openFirstVisit();}else{state.phase='background';event('background_open');}
    persist(true);render(true);
  }

  function submitBackground(){if(!canSubmitBackground())return;
    const out={};BACKGROUND_QUESTIONS.forEach(q=>{const raw=state.background[q.id];const x=raw?Number(raw):null;out[q.id]={value:x,label:x===null?null:q.options[x-1]};});
    if(state.background.gender==='3')out.gender.selfDescribe=String(state.background.genderText||'').trim();
    state.backgroundResponses=out;state.backgroundAllowIncompleteResponses=state.allowIncompleteResponses;state.phase='complete';state.completedAt=now();event('survey_completed',{ratingCount:Object.keys(state.ratings).length});persist(true);render(true);
  }

  function exportData(){
    tickTime();
    const data={exportedAt:now(), study:'CSS Media article survey', notice:'Client-side prototype export. Data were not sent to a research server.', participantPreviewId:state.participantPreviewId, newsSetId:state.newsSetId, surveyStartedAt:state.surveyStartedAt, startedAt:state.startedAt, completedAt:state.completedAt, articleOrder:articles.map(a=>({id:a.id,coreId:a.coreId,condition:a.condition})), requirementsCurrent:state.requirements, allowIncompleteResponsesCurrent:state.allowIncompleteResponses, ratings:state.ratings, background:state.backgroundResponses||state.background, readingVisits:[...state.readingVisits,...(state.visit?[{...state.visit,status:'in_progress_at_export'}]:[])],reviewVisits:[...state.reviewVisits,...(state.reviewSession?[{...state.reviewSession,status:'in_progress_at_export'}]:[])],events:state.events};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`css-media-article-survey-${state.participantPreviewId.slice(0,8)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
    event('data_exported');
  }

  function resetDemo(){
    if(!confirm('Restart the prototype? This clears current locally saved progress and responses. Export the data first if you need it.'))return;
    const req={...state.requirements}, allowIncomplete=state.allowIncompleteResponses;state=freshState();state.requirements=req;state.allowIncompleteResponses=allowIncomplete;event('survey_reset');render(true);persist(true);
  }

  // A news-set change starts a new session only after an explicit confirmation.
  function applyNewsSet(){
    const field=root.querySelector('#news-set-id');
    const next=Number(field?.value);
    if(!Number.isInteger(next)||!newsSetMap.has(next)){
      alert(`Please enter a valid news set ID (${newsSets.map(s=>s.id).join(', ')}).`);
      return;
    }
    if(next===state.newsSetId){state.settingsOpen=false;event('settings_close');render();return;}
    if(!confirm(`Switch to news set ${next}? This will restart the survey and clear its current answers and interaction logs from this browser. Export data first if you need to keep it.`))return;
    const req={...state.requirements},allowIncomplete=state.allowIncompleteResponses;
    articles=chooseArticles(next);activeNewsSetId=next;
    state=freshState();state.requirements=req;state.allowIncompleteResponses=allowIncomplete;
    event('news_set_selected',{newsSetId:next,selectedArticleIds:articles.map(a=>a.id)});
    persist(true);render(true);
  }

  // One delegated click handler handles links, reading actions, tabs, and settings.
  function handleClick(e){
    if(!state)return;
    const el=e.target.closest('[data-action]');if(!el)return;
    const action=el.dataset.action;
    if(action==='close-backdrop'&&e.target!==el)return;
    if(action==='toggle-highlight'){toggleHighlight(el.dataset.key);return;}
    if(action==='apply-news-set'){applyNewsSet();return;}
    if(action==='start-survey'&&state.phase==='intro'){state.phase='reading';state.surveyStartedAt=now();event('survey_started',{newsSetId:state.newsSetId});openFirstVisit();render(true);persist(true);return;}
    if(action==='show-article'&&state.phase==='rating'){
      if(state.ratingTab!=='article'){tickTime();state.ratingTab='article';startReview();render();}return;
    }
    if(action==='show-evaluation'&&(state.phase==='rating'||state.phase==='reading')){
      if(state.phase==='reading'){
        tickTime();
        state.scrollPositions[`rating:${state.index}:article`]=window.scrollY;
        state.phase='rating';state.ratingTab='evaluation';
        event('article_evaluation_open');persist(true);render(true);
      }else if(state.ratingTab!=='evaluation'){
        stopReview();state.ratingTab='evaluation';event('article_evaluation_return');render();
      }
      return;
    }
    if(action==='settings'){tickTime();state.settingsOpen=true;event('settings_open');render();return;}
    if(action==='close-settings'||action==='close-backdrop'){state.settingsOpen=false;tracker.resetClock();event('settings_close');render();return;}
    if(action==='submit-quiz'){
      if(state.visit?.quizChoice===null||state.visit?.quizSubmitted)return;
      state.visit.quizSubmitted=true;state.visit.quizCorrect=state.visit.quizChoice===Boolean(articleForCurrent().attentionCheck.correctAnswer);state.visit.quizSubmittedAt=now();
      event('quiz_submitted',{answer:state.visit.quizChoice,correct:state.visit.quizCorrect});persist(true);render();return;
    }
    if(action==='to-rating'){
      tickTime();
      state.scrollPositions[`rating:${state.index}:article`]=window.scrollY;
      state.phase='rating';state.ratingTab='evaluation';event('article_evaluation_open');persist(true);render(true);return;
    }
    if(action==='submit-rating'){submitRating();return;}
    if(action==='submit-background'){submitBackground();return;}
    if(action==='export'){exportData();return;}
    if(action==='reset'){resetDemo();return;}
  }

  function handleChange(e){
    const input=e.target;if(!state)return;
    if(input.dataset.setting){const key=input.dataset.setting;
      if(key==='minimumSeconds'){const n=Math.max(0,Math.min(600,Math.round(Number(input.value)||0)));state.requirements.minimumSeconds=n;}
      else if(key==='allowIncompleteResponses'){state.allowIncompleteResponses=input.checked;}
      else state.requirements[key]=input.checked;
      event('settings_changed',{key,value:key==='allowIncompleteResponses'?state.allowIncompleteResponses:state.requirements[key]});persist(true);render();return;
    }
    if(input.dataset.field==='quizChoice'){if(!state.visit?.quizSubmitted){state.visit.quizChoice=input.value==='true';event('quiz_choice_changed',{value:state.visit.quizChoice});persist(true);render();}return;}
    if(input.dataset.field==='rating'){state.draftRatings[input.dataset.question]=input.value;persist(true);render();return;}
    if(input.dataset.field==='bg'){state.background[input.dataset.question]=input.value;persist(true);render();return;}
  }

  function handleInput(e){if(e.target.dataset.field==='genderText'&&state){state.background.genderText=e.target.value;persist(true);const b=document.querySelector('[data-action="submit-background"]');if(b)b.disabled=!canSubmitBackground();}}

  // Load all static study materials before restoring any browser-local survey progress.
  async function init(){
    try {
      const inputs=await loadStudyData();
      const rawConfig=inputs.config,rawArticles=inputs.articles,rawNewsSets=inputs.newsSets;
      ARTICLE_QUESTIONS=validateQuestions(inputs.articleQuestions,'article-questions.json');
      BACKGROUND_QUESTIONS=validateQuestions(inputs.backgroundQuestions,'background-questions.json');
      views.setQuestions(ARTICLE_QUESTIONS,BACKGROUND_QUESTIONS);
      studyConfig=rawConfig;
      if(!Array.isArray(rawArticles)||!Array.isArray(rawNewsSets))throw new Error('Expected article data and news sets to be JSON arrays.');
      rawArticles.forEach(a=>{if(a?.id&&Array.isArray(a.body)){
        if(byId[a.id])throw new Error(`Duplicate article ID: ${a.id}`);
        byId[a.id]=a;
      }});
      newsSets=rawNewsSets;
      for(const set of newsSets){
        if(!Number.isInteger(Number(set.id))||newsSetMap.has(Number(set.id))||!Array.isArray(set.news_set))throw new Error('Invalid or duplicated news set ID.');
        newsSetMap.set(Number(set.id),set);
      }
      const stored=getStored();
      const configuredId=Number(rawConfig.newsSetId ?? 1);
      activeNewsSetId=(stored?.version===5 && newsSetMap.has(Number(stored.newsSetId)))?Number(stored.newsSetId):configuredId;
      articles=chooseArticles(activeNewsSetId,(stored?.version===5)?stored.articleIds:null);
      if(!articles.length)throw new Error('No articles in selected set.');
      if(stored?.version===5 && Number(stored.newsSetId)===activeNewsSetId &&
         JSON.stringify(stored.articleIds)===JSON.stringify(articles.map(a=>a.id))){
        state=stored;state.settingsOpen=false;state.requirements=cleanRequirements(state.requirements);
        state.scrollPositions ||= {};state.reviewVisits ||= [];state.ratingTab ||= 'evaluation';
        if(state.phase==='rating'&&state.ratingTab==='article'){state.reviewSession=null;state.ratingTab='evaluation';}
        if(state.phase==='reading'&&!state.visit)state.visit=makeVisit(articleForCurrent());
        if(state.phase==='reading'||state.phase==='rating')event('session_resumed');
      }else{state=freshState();}
      tracker.resetClock();
      root.addEventListener('click',handleClick);
      root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-action="toggle-highlight"]')){e.preventDefault();toggleHighlight(e.target.dataset.key);}});
      root.addEventListener('change',handleChange);
      root.addEventListener('input',handleInput);
      window.addEventListener('scroll',scrollRecord,{passive:true});
      document.addEventListener('visibilitychange',()=>{tickTime();event('visibility_change',{visibility:document.visibilityState});persist(true);});
      window.addEventListener('beforeunload',()=>{tickTime();persist(true);});
      timerHandle=setInterval(tickTime,250);
      render(false);
    } catch(err){console.error(err);root.innerHTML=`<div class="site-wrap"><main class="error"><h2>Unable to load articles</h2><p>${esc(err.message)}</p><p>Open this project through a local web server or deploy it to a static host. The article and config JSON files must be accessible.</p></main></div>`;}
  }

  init();
})();
