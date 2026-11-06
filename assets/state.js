/** Survey state shape and reading requirements. Keep version 5 for v5 progress compatibility. */
import {now} from './shared.js';

export const STORAGE_KEY = 'css-media-article-survey-v5';

export function getStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
}

export function makeVisit(article, newsSetId, requirements) {
  return {articleId:article.id, coreId:article.coreId, condition:article.condition, newsSetId, openedAt:now(), completedAt:null, status:'reading', visibleMs:0, elapsedMs:0, scrollSamples:[], maxScrollPercent:0, paragraphsSeen:[], highlights:[], highlightEvents:[], quizChoice:null, quizSubmitted:false, quizCorrect:null, quizSubmittedAt:null, settingsAtOpen:{...requirements}};
}

export function cleanRequirements(c){ return { highlightEnabled: c?.highlightEnabled === true, quizEnabled:c?.quizEnabled === true, minimumTimeEnabled:c?.minimumTimeEnabled === true, minimumSeconds: Math.max(0,Math.min(600,Math.round(Number(c?.minimumSeconds ?? 10)||0))) }; }

export function freshState(studyConfig, articles, activeNewsSetId) {
  return {
    version:5, newsSetId:activeNewsSetId, surveyStartedAt:null,
    allowIncompleteResponses:studyConfig.surveySettings?.allowIncompleteResponses !== false,
    participantPreviewId:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`test-${Date.now()}`,
    startedAt:now(), completedAt:null, articleIds:articles.map(a=>a.id),
    index:0, phase:'intro', requirements:cleanRequirements(studyConfig.readingRequirements),
    settingsOpen:false, ratings:{}, draftRatings:{}, background:{}, readingVisits:[], visit:null,
    ratingTab:'article', scrollPositions:{}, reviewVisits:[], reviewSession:null, events:[]
  };
}

export function getReadiness(state) {
  const v=state.visit, r=state.requirements;
  return {highlight:!r.highlightEnabled||(v?.highlights.length===2), quiz:!r.quizEnabled||!!v?.quizSubmitted, time:!r.minimumTimeEnabled||(v?.visibleMs >= r.minimumSeconds*1000)};
}
