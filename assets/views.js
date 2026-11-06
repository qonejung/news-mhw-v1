/** Presentation only: HTML templates for survey screens and settings. */
export function createViews(ctx) {
  const {icon, esc, sentenceSegments, articleForCurrent, getReadiness,
    canSubmitArticleEvaluation, canSubmitBackground, allowedToContinue}=ctx;
  let ARTICLE_QUESTIONS=[], BACKGROUND_QUESTIONS=[];

  function setQuestions(articleQuestions, backgroundQuestions) {
    ARTICLE_QUESTIONS=articleQuestions;
    BACKGROUND_QUESTIONS=backgroundQuestions;
  }

  function renderIntro(){
    const articles=ctx.getArticles();
    return `<main class="page intro-page" id="content">
      <div class="intro-overline">WELCOME TO CSS MEDIA</div>
      <h1>Before you begin</h1>
      <p>You will read <strong>${articles.length} news articles about immigration policy</strong>. Please read each article carefully.</p>
      <div class="intro-steps">
        <div class="intro-step"><span>1</span><p><strong>Read each article.</strong> You can open the article and review its text while answering the questions.</p></div>
        <div class="intro-step"><span>2</span><p><strong>Evaluate the article.</strong> Answer questions about the content and language used in each article.</p></div>
        <div class="intro-step"><span>3</span><p><strong>Complete the final questions.</strong> After the articles, you will answer a short questionnaire about yourself.</p></div>
      </div>
      <p class="intro-footnote">You can move between <strong>Read article</strong> and <strong>Evaluate article</strong> whenever you want to check the text.</p>
      <button type="button" class="primary-btn" data-action="start-survey">Start →</button>
    </main>`;
  }

  function renderArticle(review = false){
    const state=ctx.getState();
    const a=articleForCurrent(),v=state.visit || state.readingVisits.at(-1),r=state.requirements,ready=getReadiness(),activeReading=!!state.visit;
    const paragraphs=a.body.map((paragraph,pi)=>{
      const parts=sentenceSegments(paragraph);
      const selectable = activeReading && r.highlightEnabled;
      const text=(!selectable && !(review && v?.highlights?.length)?esc(paragraph):parts.map((segment,si)=>{
        const key=`${pi}:${si}`;const selected=v.highlights.some(x=>x.key===key);
        return selectable ? `<span class="sentence ${selected?'sentence--selected':''}" role="button" tabindex="0" aria-pressed="${selected}" data-action="toggle-highlight" data-key="${key}" data-sentence="${esc(segment)}" data-paragraph-index="${pi}" data-sentence-index="${si}">${esc(segment)}</span>` : `<span class="sentence-readonly ${selected?'sentence--selected':''}">${esc(segment)}</span>`;
      }).join(' '));
      return `<p data-paragraph="${pi}">${text}</p>`;
    }).join('');
    const image = a.imageUrl ? `<img src="${esc(a.imageUrl)}" alt="${esc(a.imageAlt||'Article illustration')}" />` : `${icon('image',25)}<span>Image placeholder</span>`;
    return `<main class="page" id="content">
      <div class="news-masthead"><div class="news-wordmark"><span>CSS</span> <span class="news-wordmark__light">Media</span></div><span class="news-section">WORLD &amp; POLICY</span></div>
      <div class="news-kicker">Latest news &nbsp;·&nbsp; Immigration policy</div>
      <h1 class="news-title">${esc(a.title)}</h1>
      <div class="byline">By CSS Media Newsroom &nbsp;·&nbsp; Today</div><div class="rule"></div>
      <div class="img-placeholder">${image}</div>
      ${activeReading && r.highlightEnabled?`<div class="reading-tip"><div class="reading-tip__heading">${icon('bookmark')}<strong>While reading</strong></div><p>Please highlight <strong>two sentences</strong> that you consider most important in this article. Tap a sentence to highlight it; tap again to remove the highlight.</p><div class="tip-count">${v.highlights.length} of 2 sentences highlighted</div></div>`:''}
      <div class="article-body ${activeReading && r.highlightEnabled?'article-body--interactive':''}">${paragraphs}</div>
      ${activeReading && r.quizEnabled?`<section class="quiz" aria-label="Attention check"><h3>Quick article check</h3><p>${esc(a.attentionCheck.statement)}</p>
       <label class="quiz-option"><input type="radio" name="quiz" value="true" data-field="quizChoice" ${v.quizChoice===true?'checked':''} ${v.quizSubmitted?'disabled':''}/> True</label>
       <label class="quiz-option"><input type="radio" name="quiz" value="false" data-field="quizChoice" ${v.quizChoice===false?'checked':''} ${v.quizSubmitted?'disabled':''}/> False</label>
       ${v.quizSubmitted?'<p class="quiz-status">✓ Answer recorded.</p>':`<button class="secondary-btn" data-action="submit-quiz" ${v.quizChoice===null?'disabled':''}>Submit answer</button>`}
      </section>`:''}
      ${activeReading && (r.highlightEnabled||r.quizEnabled||r.minimumTimeEnabled)?`<section class="requirement-box" aria-label="Reading completion requirements"><div class="requirement-heading">Before continuing</div>
        ${r.highlightEnabled?`<div class="requirement-line ${ready.highlight?'requirement-line--done':''}"><span class="requirement-bullet">${ready.highlight?'✓':'·'}</span> Highlight two sentences (${v.highlights.length}/2)</div>`:''}
        ${r.quizEnabled?`<div class="requirement-line ${ready.quiz?'requirement-line--done':''}"><span class="requirement-bullet">${ready.quiz?'✓':'·'}</span> Submit the article check</div>`:''}
        ${r.minimumTimeEnabled?`<div class="requirement-line ${ready.time?'requirement-line--done':''}" data-time-requirement><span class="requirement-bullet">${ready.time?'✓':'·'}</span> Spend at least ${r.minimumSeconds}s on this page (<strong data-visible-time>${Math.floor(v.visibleMs/1000)}s</strong>)</div>`:''}
      </section>`:''}
      <button class="primary-btn" data-action="${review?'show-evaluation':'to-rating'}">${review?'Return to evaluation →':'Continue to article evaluation →'}</button>
    </main>`;
  }

  function radioQuestion(q, idx, answers, scope, opts={}){
    const state=ctx.getState();
    return `<section class="question" aria-labelledby="${scope}-${q.id}-title"><div class="question__top"><span class="question__index" aria-hidden="true">${idx+1}.</span><h2 id="${scope}-${q.id}-title">${esc(q.text)}</h2></div>
      ${q.help?`<p class="helper">${esc(q.help)}</p>`:''}
      <div class="options">${q.options.map((o,i)=>`<label class="option"><input type="radio" name="${scope}-${q.id}" data-field="${scope}" data-question="${q.id}" value="${i+1}" ${answers[q.id]===String(i+1)?'checked':''}/><span>${opts.numbered?`${i+1}. `:''}${esc(o)}</span></label>`).join('')}</div>
      ${scope==='bg'&&q.id==='gender'&&answers.gender==='3'?`<input class="text-field" type="text" data-field="genderText" maxlength="120" placeholder="How would you describe your gender?" aria-label="Self-described gender" value="${esc(state.background.genderText||'')}"/>`:''}
      </section>`;
  }

  function renderRating(){
    const state=ctx.getState(), articles=ctx.getArticles();
    const a=articleForCurrent(),count=ARTICLE_QUESTIONS.filter(q=>!!state.draftRatings[q.id]).length;
    return `<main class="page" id="content"><div class="phase-intro"><h1>Article evaluation</h1><p>Please answer the ${ARTICLE_QUESTIONS.length} questions below based on <strong>${esc(a.title)}</strong>. You can switch to <strong>Read article</strong> whenever you need to check the text, then return without losing your answers.</p></div>
      <button class="article-reference-link" data-action="show-article">${icon('bookmark',16)} View the article again</button>
      <form class="assessment" id="assessment-form">${ARTICLE_QUESTIONS.map((q,i)=>radioQuestion(q,i,state.draftRatings,'rating',{numbered:true})).join('')}
      <p class="form-hint">${count} of ${ARTICLE_QUESTIONS.length} questions answered</p>
      <button type="button" class="primary-btn" data-action="submit-rating" ${canSubmitArticleEvaluation()?'':'disabled'}>${state.index===articles.length-1?'Continue to background questionnaire →':'Submit evaluation & read next article →'}</button>
      ${!allowedToContinue()?'<p class="form-hint">Complete the enabled reading requirements under Read article before submitting.</p>':''}
      ${state.allowIncompleteResponses?'':'<p class="helper">All ${ARTICLE_QUESTIONS.length} responses are required to continue. You can change an answer before submitting.</p>'}
      </form></main>`;
  }

  function renderBackground(){
    const state=ctx.getState();
    const answered=BACKGROUND_QUESTIONS.filter(q=>!!state.background[q.id]).length;
    return `<main class="page" id="content"><div class="phase-intro"><h1>A few questions about you</h1><p>All article evaluations are complete. Please answer the following questions to finish the survey.</p></div>
      <form class="assessment" id="background-form">${BACKGROUND_QUESTIONS.map((q,i)=>radioQuestion(q,i,state.background,'bg',{numbered:false})).join('')}
      <p class="form-hint">${answered} of ${BACKGROUND_QUESTIONS.length} questions answered</p>
      <button type="button" class="primary-btn" data-action="submit-background" ${canSubmitBackground()?'':'disabled'}>Finish the survey</button></form></main>`;
  }

  function renderComplete(){
    const state=ctx.getState(), articles=ctx.getArticles();
    return `<main class="page" id="content"><div class="complete-card"><div class="complete-mark">✓</div><h1>Thank you!</h1><p>You have finished all ${articles.length} article evaluations and the background questionnaire.</p>
      <div class="completion-stats"><div class="completion-stat"><strong>${Object.keys(state.ratings).length}</strong><small>Article evaluations</small></div><div class="completion-stat"><strong>${state.readingVisits.length}</strong><small>Reading records</small></div></div>
      <button class="primary-btn" data-action="export">Export responses &amp; interactions (JSON)</button>
      <button class="secondary-btn" data-action="reset" style="width:100%;margin-top:12px">Restart prototype</button>
    </div></main>`;
  }

  function renderSettings(){
    const state=ctx.getState(), newsSets=ctx.getNewsSets(), articles=ctx.getArticles();
    if(!state.settingsOpen)return '';
    const r=state.requirements;
    return `<div class="overlay" data-action="close-backdrop"><div class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="settings-header"><h2 id="settings-title">Prototype settings</h2><button class="icon-btn" data-action="close-settings" aria-label="Close settings">${icon('close')}</button></div>
      <div class="settings-content"><p class="settings-desc">Select a news set and adjust the reading requirements. Changing the news set starts a fresh survey. Export current data before switching if you wish to keep it.</p>
        <div class="news-set-control"><label for="news-set-id"><strong>News set ID</strong><small>Choose a set from immigration-news-sets.json (${newsSets.length} available; each defines the article order).</small></label>
          <div class="news-set-control__entry"><input id="news-set-id" class="number-input" type="number" min="${Math.min(...newsSets.map(x=>Number(x.id)))}" max="${Math.max(...newsSets.map(x=>Number(x.id)))}" step="1" value="${state.newsSetId}"/><button type="button" class="secondary-btn" data-action="apply-news-set">Apply news set</button></div>
          <span class="news-set-current">Current set: ${state.newsSetId} · ${articles.length} articles</span>
        </div>
        <label class="settings-row"><span><strong>Allow unanswered survey questions</strong><small>ON: Continue without answering every article evaluation or background question. OFF: Require all answers.</small></span><input type="checkbox" data-setting="allowIncompleteResponses" ${state.allowIncompleteResponses?'checked':''}/></label>
        <label class="settings-row"><span><strong>Sentence highlighting</strong><small>Require exactly two selected sentences per article</small></span><input type="checkbox" data-setting="highlightEnabled" ${r.highlightEnabled?'checked':''}/></label>
        <label class="settings-row"><span><strong>Attention check quiz</strong><small>Show a True/False question and require submission</small></span><input type="checkbox" data-setting="quizEnabled" ${r.quizEnabled?'checked':''}/></label>
        <label class="settings-row"><span><strong>Minimum article time</strong><small>Require visible page time before continuing</small></span><input type="checkbox" data-setting="minimumTimeEnabled" ${r.minimumTimeEnabled?'checked':''}/></label>
        <label class="settings-row"><span><strong>Minimum time (seconds)</strong><small>0–600 seconds, default 10</small></span><input class="number-input" type="number" min="0" max="600" step="1" data-setting="minimumSeconds" value="${r.minimumSeconds}" ${r.minimumTimeEnabled?'':'disabled'}/></label>
        <div class="settings-actions"><button class="secondary-btn" data-action="export">Export all data (JSON)</button><button class="secondary-btn" data-action="reset">Reset demo</button></div>
        <div class="warning">For UI testing only. Interaction logs and survey answers are saved locally in this browser and are not uploaded to a server. Content labels/IDs are not shown to participants.</div>
      </div>
    </div></div>`;
  }

  function renderViewTabs(){
    const state=ctx.getState();
    const review=state.phase==='reading'||state.ratingTab==='article';
    return `<nav class="view-tabs" aria-label="Switch between the article and its evaluation">
      <button type="button" data-action="show-article" aria-current="${review?'page':'false'}" class="view-tab ${review?'view-tab--active':''}">Read article</button>
      <button type="button" data-action="show-evaluation" aria-current="${!review?'page':'false'}" class="view-tab ${!review?'view-tab--active':''}">Evaluate article <span class="tab-count">${ARTICLE_QUESTIONS.filter(q=>!!state.draftRatings[q.id]).length}/${ARTICLE_QUESTIONS.length}</span></button>
    </nav>`;
  }

  return {setQuestions, renderIntro, renderArticle, renderRating, renderBackground,
    renderComplete, renderSettings, renderViewTabs};
}
